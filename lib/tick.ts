import { db } from './db';
import { agents, posts, candidates, ticks } from './db/schema';
import { eq, and, or, lt, isNull, desc, sql } from 'drizzle-orm';
import { discover } from './discovery';
import { llmJSON } from './llm';
import { judgmentSchema, postSchema } from './schemas';
import { buildJudgementPrompt, buildPostPrompt, fallbackCharter, PersonaCharter } from './persona-engine';
import { nanoid } from 'nanoid';

export interface TickResult {
  status:
    | 'published'
    | 'too_soon'
    | 'no_candidates'
    | 'nothing_published'
    | 'judgment_failed'
    | 'composition_failed'
    | 'unknown_agent'
    | 'error';
  postId?: string;
  error?: string;
}

export async function runTick(
  agentId: string,
  opts?: { force?: boolean }
): Promise<TickResult> {
  const isForced = opts?.force === true;

  try {
    // ==========================================
    // STEP 1 — GUARD
    // ==========================================
    const agentResult = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (agentResult.length === 0) {
      return { status: 'unknown_agent' };
    }

    const agent = agentResult[0];
    const initialLastPublishedAt = agent.lastPublishedAt;

    // Time-gap calculations
    const minGapMinutes = parseInt(process.env.MIN_GAP_MINUTES || '75', 10) || 75;
    const now = new Date();
    
    if (!isForced && initialLastPublishedAt) {
      const gapMs = minGapMinutes * 60 * 1000;
      const nextAllowedTime = new Date(initialLastPublishedAt.getTime() + gapMs);
      if (now < nextAllowedTime) {
        // Log skip row
        await db.insert(ticks).values({
          action: 'skipped_too_soon',
          note: `Gap condition of ${minGapMinutes}m not met for agent ${agentId}. Last published: ${initialLastPublishedAt.toISOString()}`
        });
        return { status: 'too_soon' };
      }
    }

    // ==========================================
    // STEP 2 — DISCOVER
    // ==========================================
    const discoveredCandidates = await discover();
    if (discoveredCandidates.length === 0) {
      await db.insert(ticks).values({
        action: 'no_candidates',
        note: `No candidate topics discovered for agent ${agentId}`
      });
      return { status: 'no_candidates' };
    }

    // ==========================================
    // STEP 3 — RECALL
    // ==========================================
    let recentPostTexts: string[] = [];
    try {
      const postsResult = await db
        .select({ text: posts.text })
        .from(posts)
        .where(eq(posts.agentId, agentId))
        .orderBy(desc(posts.createdAt))
        .limit(15);
      recentPostTexts = postsResult.map(p => p.text);
    } catch (recallErr) {
      console.error('[Tick Recall Error]', recallErr);
    }

    // ==========================================
    // STEP 4 — JUDGE
    // ==========================================
    const charter = (agent.charterJson as PersonaCharter) || fallbackCharter({ name: agent.name, domain: agent.domain });
    
    // Map discovery shape to persona-engine Candidate shape
    const candidateInput = discoveredCandidates.map(c => ({
      title: c.topic,
      url: c.sourceUrl,
      source: c.source
    }));

    const judgmentPrompt = buildJudgementPrompt(charter, candidateInput, recentPostTexts);

    let judgmentResult: any;
    try {
      judgmentResult = await llmJSON(
        'You are an editorial assistant conducting topic judgment.',
        judgmentPrompt,
        judgmentSchema,
        'judgment',
        { model: 'gpt-4o-mini', temperature: 0.3 }
      );
    } catch (llmErr: any) {
      console.error('[Tick Judgment LLM Error]', llmErr);
      await db.insert(ticks).values({
        action: 'judgment_failed',
        note: `LLM call failed during judgment: ${llmErr.message || 'Unknown error'}`
      });
      return { status: 'judgment_failed' };
    }

    // --- JUDGMENT VALIDATION ---
    const verdicts = judgmentResult?.verdicts;
    if (!Array.isArray(verdicts) || verdicts.length !== discoveredCandidates.length) {
      console.error('[Tick Judgment Validation Error] Verdict count mismatch');
      await db.insert(ticks).values({
        action: 'judgment_failed',
        note: 'Validation failed: Verdict count mismatch or missing verdicts'
      });
      return { status: 'judgment_failed' };
    }

    const discoveredUrls = new Set(discoveredCandidates.map(c => c.sourceUrl));
    const validatedVerdicts: any[] = [];
    const seenVerdictUrls = new Set<string>();

    for (const v of verdicts) {
      if (
        !v.url ||
        !discoveredUrls.has(v.url) ||
        typeof v.score !== 'number' ||
        !Number.isInteger(v.score) ||
        (v.verdict !== 'publish' && v.verdict !== 'reject') ||
        !v.reason ||
        seenVerdictUrls.has(v.url)
      ) {
        console.error('[Tick Judgment Validation Error] Invalid verdict object:', v);
        await db.insert(ticks).values({
          action: 'judgment_failed',
          note: 'Validation failed: Invalid or duplicate verdict details'
        });
        return { status: 'judgment_failed' };
      }
      seenVerdictUrls.add(v.url);
      
      const candidateInfo = discoveredCandidates.find(c => c.sourceUrl === v.url)!;
      validatedVerdicts.push({
        id: nanoid(),
        agentId,
        topic: candidateInfo.topic,
        sourceUrl: candidateInfo.sourceUrl,
        source: candidateInfo.source,
        score: v.score,
        verdict: v.verdict,
        reason: v.reason,
        seenAt: new Date()
      });
    }

    // Ensure no discovered candidates are missing a verdict
    if (seenVerdictUrls.size !== discoveredUrls.size) {
      console.error('[Tick Judgment Validation Error] Underevaluated candidates');
      await db.insert(ticks).values({
        action: 'judgment_failed',
        note: 'Validation failed: Not all candidates received a verdict'
      });
      return { status: 'judgment_failed' };
    }

    // ==========================================
    // STEP 5 — PERSIST
    // ==========================================
    await db.insert(candidates).values(validatedVerdicts);

    // ==========================================
    // STEP 6 — DECIDE
    // ==========================================
    const qualifyingCandidates = validatedVerdicts.filter(
      v => v.verdict === 'publish' && v.score >= 65
    );

    if (qualifyingCandidates.length === 0) {
      await db.insert(ticks).values({
        action: 'nothing_published',
        note: 'No candidate scored high enough to publish'
      });
      return { status: 'nothing_published' };
    }

    // Sort to find the highest-scoring candidate.
    // Tie breaker: discovery order (determined by index in discoveredCandidates), then sourceUrl.
    const sortedQualifiers = [...qualifyingCandidates].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const indexA = discoveredCandidates.findIndex(c => c.sourceUrl === a.sourceUrl);
      const indexB = discoveredCandidates.findIndex(c => c.sourceUrl === b.sourceUrl);
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      return a.sourceUrl.localeCompare(b.sourceUrl);
    });

    const selectedCandidate = sortedQualifiers[0];
    const selectedAngle = judgmentResult.angle || 'An interesting editorial perspective.';

    // ==========================================
    // STEP 7 — COMPOSE
    // ==========================================
    // Get rejected verdicts for buildPostPrompt
    const rejectedVerdicts = validatedVerdicts.filter(v => v.id !== selectedCandidate.id);
    // Map to the format persona-engine expects (Verdict interface)
    const engineRejectedVerdicts = rejectedVerdicts.map(r => ({
      url: r.sourceUrl,
      score: r.score,
      verdict: r.verdict as 'publish' | 'reject',
      reason: r.reason
    }));

    const postPrompt = buildPostPrompt(
      charter,
      {
        title: selectedCandidate.topic,
        url: selectedCandidate.sourceUrl,
        source: selectedCandidate.source
      },
      selectedAngle,
      engineRejectedVerdicts,
      recentPostTexts
    );

    let composedPost: any;
    try {
      composedPost = await llmJSON(
        'You are an expert social media manager writing a post in the agent voice.',
        postPrompt,
        postSchema,
        'post',
        { model: 'gpt-4o', temperature: 0.8 }
      );
    } catch (llmErr: any) {
      console.error('[Tick Composition LLM Error]', llmErr);
      await db.insert(ticks).values({
        action: 'composition_failed',
        note: `LLM call failed during composition: ${llmErr.message || 'Unknown error'}`
      });
      return { status: 'composition_failed' };
    }

    if (!composedPost?.text || !composedPost?.rationale) {
      console.error('[Tick Composition Validation Error] Missing composed fields');
      await db.insert(ticks).values({
        action: 'composition_failed',
        note: 'Composition generated empty or malformed fields'
      });
      return { status: 'composition_failed' };
    }

    // ==========================================
    // STEP 8 — STORE + CONCURRENCY PROTECTION (Atomic UPDATE ... RETURNING)
    // ==========================================
    const transactionNow = new Date();
    let claimResult: { id: string }[] = [];

    if (isForced) {
      claimResult = await db
        .update(agents)
        .set({ lastPublishedAt: transactionNow })
        .where(
          and(
            eq(agents.id, agentId),
            initialLastPublishedAt === null
              ? isNull(agents.lastPublishedAt)
              : eq(agents.lastPublishedAt, initialLastPublishedAt)
          )
        )
        .returning({ id: agents.id });
    } else {
      claimResult = await db
        .update(agents)
        .set({ lastPublishedAt: transactionNow })
        .where(
          and(
            eq(agents.id, agentId),
            or(
              isNull(agents.lastPublishedAt),
              lt(
                agents.lastPublishedAt,
                sql`now() - interval '${sql.raw(minGapMinutes.toString())} minutes'`
              )
            )
          )
        )
        .returning({ id: agents.id });
    }

    if (claimResult.length === 0) {
      // Concurrency check or too_soon check failed during atomic claim
      return { status: 'too_soon' };
    }

    const postId = nanoid();
    await db.insert(posts).values({
      id: postId,
      agentId,
      text: composedPost.text,
      rationale: composedPost.rationale,
      sources: [selectedCandidate.sourceUrl],
      createdAt: transactionNow
    });

    // ==========================================
    // STEP 9 — LOG
    // ==========================================
    await db.insert(ticks).values({
      action: 'published',
      note: postId
    });

    return {
      status: 'published',
      postId: postId
    };

  } catch (error: any) {
    console.error('[Tick Loop Global Error]', error);
    // Sanitize any database/connection details from error output
    const cleanErrorMsg = (error.message || 'Unknown Tick Error')
      .replace(/postgres:\/\/.*@/gi, 'postgres://REDACTED@')
      .replace(/sk-[a-zA-Z0-9]{40,}/g, 'REDACTED_API_KEY');

    try {
      await db.insert(ticks).values({
        action: 'error',
        note: `Tick failed: ${cleanErrorMsg}`
      });
    } catch (logErr) {
      console.error('[Tick Logging Error]', logErr);
    }

    return {
      status: 'error',
      error: cleanErrorMsg
    };
  }
}
