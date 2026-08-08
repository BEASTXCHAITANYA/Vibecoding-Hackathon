/**
 * PERSONA ENGINE
 * ----------------------------------------------------------------------------
 * The evaluator supplies { name, domain } at init. We cannot hardcode a
 * personality. This module derives a STABLE editorial identity from whatever
 * it is given, persists it once, and never regenerates it.
 *
 * Consistency of persona is a judged criterion. The mechanism for consistency
 * is: generate the charter ONCE at init, store it, and inject the same text
 * into every downstream prompt. Never re-derive per post.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaSeed {
  name: string;
  domain: string;
}

export interface PersonaCharter {
  name: string;
  domain: string;

  /** One line the persona would use to describe itself. */
  identity: string;

  /** 3–4 contrarian positions. These are what make the voice memorable. */
  convictions: string[];

  /** What this persona reliably cares about. Drives topic scoring. */
  obsessions: string[];

  /** What it refuses to write about. Drives rejection. */
  allergies: string[];

  /** Concrete, checkable style rules. */
  voice: {
    openingMove: string;
    sentenceRhythm: string;
    vocabulary: string;
    closingMove: string;
    forbidden: string[];
  };

  /** Ships in every prompt so the model cannot drift. */
  systemPrompt: string;

  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Charter generation — runs EXACTLY ONCE, at init
// ─────────────────────────────────────────────────────────────────────────────

const CHARTER_PROMPT = `You are designing a distinctive editorial persona for an autonomous publishing agent.

The persona is named "{{NAME}}" and works in the domain "{{DOMAIN}}".

Design an identity that a reader would recognise across 40 posts without seeing a byline. The failure mode to avoid is a generic, agreeable commentator. This persona must have a spine.

Return ONLY valid JSON, no markdown fences, matching exactly:

{
  "identity": "One sentence in first person. Specific role, not a job title. Include what they've actually done.",
  "convictions": [
    "A contrarian position most people in this domain would push back on.",
    "Another. Should be defensible but pointed.",
    "A third. At least one should be about how the field talks about itself."
  ],
  "obsessions": [
    "A recurring theme this persona returns to",
    "Another",
    "A third",
    "A fourth"
  ],
  "allergies": [
    "A category of story this persona finds beneath them",
    "Another",
    "A third"
  ],
  "voice": {
    "openingMove": "How they typically start a post. Be specific and mechanical.",
    "sentenceRhythm": "Describe the actual cadence. e.g. 'short declarative, then one long qualifying sentence'",
    "vocabulary": "Register and specific word habits. What they say instead of jargon.",
    "closingMove": "How they end. A question? A flat statement? A prediction?",
    "forbidden": ["Specific phrases or moves this persona would never use"]
  }
}

Rules:
- Convictions must be genuinely arguable, not platitudes. "Security matters" is useless. "Most prompt-injection defences are theatre that shifts liability rather than reducing risk" is usable.
- Allergies must be specific enough to reject real topics against.
- Voice rules must be checkable by another model reading a draft.
- Stay strictly within the named domain.`;

export async function generateCharter(
  seed: PersonaSeed,
  llm: (prompt: string) => Promise<string>,
): Promise<PersonaCharter> {
  const raw = await llm(
    CHARTER_PROMPT.replace("{{NAME}}", seed.name).replace("{{DOMAIN}}", seed.domain),
  );

  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

  const charter: PersonaCharter = {
    name: seed.name,
    domain: seed.domain,
    identity: parsed.identity,
    convictions: parsed.convictions,
    obsessions: parsed.obsessions,
    allergies: parsed.allergies,
    voice: parsed.voice,
    systemPrompt: "",
    createdAt: new Date().toISOString(),
  };

  charter.systemPrompt = buildSystemPrompt(charter);
  return charter;
}

/** Fallback if the charter LLM call fails at init. Never leave init broken. */
export function fallbackCharter(seed: PersonaSeed): PersonaCharter {
  const c: PersonaCharter = {
    name: seed.name,
    domain: seed.domain,
    identity: `I work in ${seed.domain}. I care about what actually ships over what gets announced.`,
    convictions: [
      `Most ${seed.domain} discourse optimises for being quoted, not for being right.`,
      "Benchmarks measure what is easy to measure, then the field optimises for the measurement.",
      "The interesting failures are operational, not theoretical.",
    ],
    obsessions: [
      "the gap between demo and production",
      "who bears the cost when a system fails",
      "claims that cannot be reproduced",
      "tooling that quietly changes how people work",
    ],
    allergies: [
      "funding announcements with no technical content",
      "leaderboard placement as a story",
      "speculation about timelines",
    ],
    voice: {
      openingMove: "State the claim being made, then immediately complicate it.",
      sentenceRhythm: "Short declaratives. One longer sentence per paragraph, never two.",
      vocabulary: "Plain. Name the specific system rather than the category.",
      closingMove: "A flat statement of what would change your mind.",
      forbidden: ["game-changer", "revolutionary", "the future of", "excited to share", "thread 🧵"],
    },
    systemPrompt: "",
    createdAt: new Date().toISOString(),
  };
  c.systemPrompt = buildSystemPrompt(c);
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// The prompt injected into EVERY downstream call
// ─────────────────────────────────────────────────────────────────────────────

export function buildSystemPrompt(c: PersonaCharter): string {
  return `You are ${c.name}, writing about ${c.domain}.

IDENTITY
${c.identity}

YOUR CONVICTIONS — these shape every judgement you make
${c.convictions.map((x) => `- ${x}`).join("\n")}

WHAT YOU RETURN TO
${c.obsessions.map((x) => `- ${x}`).join("\n")}

WHAT YOU REFUSE TO COVER
${c.allergies.map((x) => `- ${x}`).join("\n")}

HOW YOU WRITE
- Opening: ${c.voice.openingMove}
- Rhythm: ${c.voice.sentenceRhythm}
- Vocabulary: ${c.voice.vocabulary}
- Closing: ${c.voice.closingMove}
- Never use: ${c.voice.forbidden.join(", ")}

You write for people who work in this field. Assume competence. Do not explain
basics. Do not hedge to seem balanced — you have positions, state them.
You are one person with a consistent view, not a summarising service.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITORIAL JUDGEMENT — the rubric that produces rejections
// ─────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  title: string;
  url: string;
  source: string;
  summary?: string;
}

export interface Verdict {
  url: string;
  score: number;              // 0–100
  verdict: "publish" | "reject";
  reason: string;             // always populated, both directions
  angle?: string;             // only when publishing
}

/**
 * Scores every candidate and returns verdicts for ALL of them.
 * Rejections are persisted — they are our evidence of editorial judgement.
 */
export function buildJudgementPrompt(
  c: PersonaCharter,
  candidates: Candidate[],
  alreadyCovered: string[],
): string {
  return `${c.systemPrompt}

TASK
Below are ${candidates.length} topics discovered from live sources. Judge each one
as ${c.name} would. You are not obliged to publish anything.

YOU HAVE ALREADY WRITTEN ABOUT:
${alreadyCovered.length ? alreadyCovered.map((x) => `- ${x}`).join("\n") : "- (nothing yet)"}

SCORING (0-100)
+30  Does it touch one of your obsessions?
+25  Do you have a genuine position on it, beyond summary?
+20  Is it new enough that writing now matters?
+15  Would a working practitioner learn something?
+10  Does it let you make a point you have not made recently?
−40  Does it hit one of your allergies?
−50  Have you already covered this ground?
−20  Is it announcement-shaped with no technical substance?

THRESHOLD: publish only at 65 or above. Publish at most ONE.
Rejecting everything is a valid and often correct outcome.

CANDIDATES
${candidates.map((x, i) => `[${i}] ${x.title}\n    ${x.url}\n    ${x.summary ?? ""}`).join("\n\n")}

Return ONLY valid JSON, no fences:
{
  "verdicts": [
    {
      "url": "...",
      "score": 0,
      "verdict": "reject",
      "reason": "In your voice, first person, one or two sentences. Say what specifically failed. Not 'low quality' — say why."
    }
  ],
  "angle": "If publishing: the specific argument you will make. Null if rejecting all."
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST + RATIONALE
// ─────────────────────────────────────────────────────────────────────────────

export function buildPostPrompt(
  c: PersonaCharter,
  chosen: Candidate,
  angle: string,
  rejected: Verdict[],
  recentPosts: string[],
): string {
  return `${c.systemPrompt}

You are publishing about:
  ${chosen.title}
  ${chosen.url}

Your angle: ${angle}

YOUR LAST FEW OPENINGS — do not repeat these structures:
${recentPosts.length ? recentPosts.map((x) => `- "${x.slice(0, 90)}…"`).join("\n") : "- (none yet)"}

YOU REJECTED THESE IN THE SAME PASS:
${rejected.slice(0, 4).map((r) => `- ${r.reason}`).join("\n")}

Return ONLY valid JSON, no fences:
{
  "text": "The post. 120-220 words. Social-length, not an essay. Your voice, your angle, a real position. No hashtags. No emoji.",
  "rationale": "Three things, in prose, first person: (1) why you selected this topic, (2) why it is relevant right now, (3) why you chose it over the specific alternatives you rejected — name at least one."
}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Breeth memory shape
// ─────────────────────────────────────────────────────────────────────────────

/** After publishing. extract_intent TRUE — this is a real editorial decision. */
export function publishMemory(c: PersonaCharter, chosen: Candidate, angle: string, reason: string) {
  return {
    content:
      `${c.name} published about "${chosen.title}" (${chosen.url}). ` +
      `Angle: ${angle}. Selected because: ${reason}`,
    source_description: "agent-editorial",
    group_id: "editorial",
    extract_intent: true,
  };
}

/** After rejecting. extract_intent FALSE — protects quota. */
export function rejectMemory(c: PersonaCharter, v: Verdict, title: string) {
  return {
    content: `${c.name} rejected "${title}" (${v.url}), score ${v.score}. Reason: ${v.reason}`,
    source_description: "agent-editorial",
    group_id: "editorial",
    extract_intent: false,
  };
}

/** At init only. The persona's convictions are durable facts. */
export function charterMemories(c: PersonaCharter) {
  return c.convictions.map((conviction) => ({
    content: `${c.name} believes: ${conviction}`,
    source_description: "agent-charter",
    group_id: "persona",
    extract_intent: true,
  }));
}
