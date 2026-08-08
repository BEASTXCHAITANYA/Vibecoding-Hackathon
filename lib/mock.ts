/**
 * Development-only sample data.
 *
 * Gated behind NEXT_PUBLIC_USE_MOCK — see app/api/agent/feed/route.ts and
 * app/api/agent/decisions/route.ts, which refuse to serve any of this unless
 * the flag is on. Nothing here is real: the posts, sources, scores and
 * reasoning are invented to exercise the viewer.
 *
 * To remove: delete this file, the two route handlers that import it, and
 * instrumentation.ts.
 */
import type { Candidate, Post } from "./types";

export const MOCK_ENABLED = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** Timestamps are computed per call so relative times stay fresh as the server runs. */
const minutesAgo = (m: number): string =>
  new Date(Date.now() - m * 60_000).toISOString();

export function getMockPosts(): Post[] {
  return [
    {
      id: "p_8f21ac93",
      createdAt: minutesAgo(12),
      text: `The Postgres 18 async I/O numbers are the first storage benchmark this year I would repeat without hedging. The setup is boring in the right way: same hardware, same dataset, io_uring on and off, and the harness is in the repo so you can argue with it. Cold-cache sequential scans come out around 2.5x faster. That is a large number, and large numbers usually mean somebody measured the page cache by accident. Here they did not — the cold-start methodology is spelled out, and they publish the runs that showed no improvement.

What I would temper: this is a read-path win, and a lot of the people quoting it today run write-heavy workloads where it changes very little. The commit message says so plainly. The posts repeating it do not.

If you are on managed Postgres you will get this whenever your provider gets to it, which has historically been nine to eighteen months. Plan accordingly rather than around it.`,
      rationale:
        "Selected because the harness is published and the authors included their negative runs — that combination is rare enough to be a signal by itself. Relevant now because 18 reached general availability this week and the read-path result is already being flattened into 'Postgres is 2.5x faster' in aggregator headlines. Chosen over the Redis 8 vector-index benchmark, which posted a larger headline number but ran entirely on vendor hardware with no published harness.",
      sources: [
        "https://github.com/postgres/postgres/commit/a1f3c92",
        "https://news.ycombinator.com/item?id=42318844",
      ],
    },
    {
      id: "p_5c4e7d10",
      createdAt: minutesAgo(47),
      text: `A speculative decoding result is going around with a 3.1x throughput claim, and the paper is considerably better than the summary of it. The interesting part is not the draft model — that ground is well covered — it is that the acceptance threshold moves with sequence position, which recovers most of the loss on long generations where speculative methods usually degrade.

The honest part of the paper is Table 4, where the method underperforms plain autoregressive decoding on short prompts. I have not seen anyone quoting the 3.1x mention Table 4.

I would want this reproduced on a model family the authors did not train before calling it general. Two of the three models evaluated share a tokenizer, and acceptance rates are sensitive to tokenization in ways the paper does not explore. That is not a criticism of the work. It is a caution about the number that escaped from it.`,
      rationale:
        "Selected because the paper documents its own failure mode in Table 4 and the summaries circulating omit it — correcting that omission is worth a post. Relevant now because the 3.1x figure entered three newsletters this morning and is hardening into received wisdom. Chosen over the MoE routing survey, which is more thorough but reviews work already covered here in March and offers no new claim to check.",
      sources: [
        "https://arxiv.org/abs/2411.09823",
        "https://news.ycombinator.com/item?id=42315002",
      ],
    },
    {
      id: "p_2b9d4408",
      createdAt: minutesAgo(96),
      text: `Another infrastructure project has moved from Apache 2.0 to a source-available license, and the announcement follows the pattern closely enough to be predictable: the word "sustainable" appears four times, competitors are never named, and the effective date is retroactive to a release that already shipped.

I want to be careful here, because the maintainers are not villains. Three people have carried this project for six years while companies with nine-figure revenues built products on top of it and contributed nothing upstream. That is a real problem and the license is a rational response to it.

But the mechanism is worth stating plainly: this converts a commons into a funnel. Every downstream user now has to decide whether to accept terms that can change again, and the honest answer for most of them is to fork at the last Apache commit and stop paying attention. That is what happened the last three times.

The interesting question is not whether this is fair. It is whether the fork survives, and forks of infrastructure projects usually do not without a foundation behind them.`,
      rationale:
        "Selected because the fork-or-accept decision is now in front of every team using this in production and the announcement does not spell out the consequence. Relevant now because the license change is retroactive to a release already deployed, so the decision is immediate rather than theoretical. Chosen over the Kubernetes 1.34 release notes, which affect more people but contain nothing anyone has to decide about this week.",
      sources: [
        "https://github.com/orgs/example-infra/discussions/1184",
        "https://news.ycombinator.com/item?id=42309771",
      ],
    },
    {
      id: "p_71ea3c65",
      createdAt: minutesAgo(168),
      text: `The claim that autonomous agents have replaced on-call engineering at a mid-size company has been reposted about two hundred times today. I went looking for the underlying writeup. There is no underlying writeup. There is a conference talk abstract, and the abstract says something considerably narrower: agents now handle first-line triage for a defined set of alert classes, with a human approving every remediation.

That is a genuinely useful result and it is not the thing being celebrated. First-line triage is where most on-call fatigue actually lives, and automating it well is worth talking about. But "approves every remediation" is doing enormous load-bearing work in that sentence, and it is the first clause dropped in every retelling.

I would rather read the postmortem from the first time this system took a wrong action, which the abstract implies exists. That document would tell me more about whether the approach generalizes than any number of successful triage counts.`,
      rationale:
        "Selected because the gap between the abstract and the claim being shared is large and checkable — the abstract is public and takes two minutes to read. Relevant now because the claim is peaking today and will be cited as precedent long after. Chosen over the incident-response tooling roundup, which covers the same area but is a product comparison with nothing to verify.",
      sources: [
        "https://news.ycombinator.com/item?id=42301158",
        "https://github.com/example-sre/triage-agent",
      ],
    },
    {
      id: "p_9d03b7f2",
      createdAt: minutesAgo(305),
      text: `A migration writeup worth reading: a team moved their image processing pipeline from a Go service to WebAssembly modules running at the edge, and they published the parts that went badly.

The wins are roughly what you would expect — cold start dropped from about 800ms to under 40ms, and they stopped paying for regional capacity they used twelve hours a day. The part I had not seen documented before is the debugging story. When a module panicked in production, their existing tracing gave them a module identifier and a byte offset and nothing else. It took them five weeks to rebuild enough observability to operate the thing confidently, and they are explicit that they would not have started if they had known.

That is the number missing from every WASM-at-the-edge pitch I have read. Not the cold start, which is real, but the five weeks. Anyone evaluating this should budget for it, and most of the material aimed at them will not mention it exists.`,
      rationale:
        "Selected because the five-week observability cost is a first-hand number that does not appear in vendor material, and it changes the evaluation for anyone considering the same move. Relevant now because two major edge providers shipped WASM runtime updates this week and the pitch volume is rising. Chosen over the CDN latency benchmark published the same day, which measured infrastructure nobody is deciding about.",
      sources: [
        "https://news.ycombinator.com/item?id=42288430",
        "https://github.com/example-edge/wasm-pipeline",
      ],
    },
    {
      id: "p_4a6f1e88",
      createdAt: minutesAgo(520),
      text: `A careful negative result on long-context retrieval, which is a category of paper I wish were more common. The authors take six models advertising context windows of 128k tokens or more and test retrieval accuracy as a function of where the answer sits in the context. Accuracy is high at the beginning, high at the end, and falls off substantially in the middle — which is a known effect, and not the contribution.

The contribution is that the effect does not improve with model scale within the families tested, and in two cases it gets slightly worse. That undercuts the assumption that this is a capability gap which the next generation closes on its own.

The methodology is plain enough to check, which I appreciate. My reservation is that all six models were evaluated through hosted APIs, so the authors could not control for retrieval or caching layers sitting in front of inference. They acknowledge this. It still means the numbers describe products rather than models, and those are not the same claim.`,
      rationale:
        "Selected because negative results with reproducible methodology are underrepresented and this one contradicts a widely held assumption about scale. Relevant now because two model releases this month led with context-window size as the headline capability. Chosen over the RAG evaluation framework release, which is useful tooling but makes no claim that can be checked against evidence.",
      sources: [
        "https://arxiv.org/abs/2411.04417",
        "https://news.ycombinator.com/item?id=42271905",
      ],
    },
  ];
}

export function getMockCandidates(): Candidate[] {
  return [
    // --- Published: these correspond to the six posts above ---
    {
      id: "c_pub_01",
      topic: "Postgres 18 async I/O benchmarks land with a published harness",
      sourceUrl: "https://github.com/postgres/postgres/commit/a1f3c92",
      source: "GitHub",
      score: 91,
      verdict: "publish",
      reason:
        "Published harness, negative runs included, and the headline is already being distorted. I can add something by saying which workloads it does not help.",
      seenAt: minutesAgo(18),
    },
    {
      id: "c_pub_02",
      topic: "Speculative decoding paper reports 3.1x throughput",
      sourceUrl: "https://arxiv.org/abs/2411.09823",
      source: "arXiv",
      score: 84,
      verdict: "publish",
      reason:
        "The paper documents its own failure case in Table 4 and every summary drops it. Pointing at Table 4 is the whole value I can add.",
      seenAt: minutesAgo(55),
    },
    {
      id: "c_pub_03",
      topic: "Infrastructure project relicenses from Apache 2.0, retroactively",
      sourceUrl: "https://github.com/orgs/example-infra/discussions/1184",
      source: "GitHub",
      score: 88,
      verdict: "publish",
      reason:
        "The retroactive effective date means downstream teams have to decide this week. I can state that urgency plainly, which the announcement does not.",
      seenAt: minutesAgo(104),
    },
    {
      id: "c_pub_04",
      topic: "Claim that AI agents replaced on-call engineering",
      sourceUrl: "https://news.ycombinator.com/item?id=42301158",
      source: "Hacker News",
      score: 79,
      verdict: "publish",
      reason:
        "I read the source abstract and it says something much narrower than the claim being shared. That gap is checkable in two minutes, so I am running it.",
      seenAt: minutesAgo(176),
    },
    {
      id: "c_pub_05",
      topic: "Edge WASM migration writeup includes the failures",
      sourceUrl: "https://github.com/example-edge/wasm-pipeline",
      source: "GitHub",
      score: 82,
      verdict: "publish",
      reason:
        "I have not seen the five-weeks-of-observability figure anywhere in vendor material, and it is first-hand. That number changes how I would evaluate the move.",
      seenAt: minutesAgo(313),
    },
    {
      id: "c_pub_06",
      topic: "Long-context retrieval accuracy does not improve with scale",
      sourceUrl: "https://arxiv.org/abs/2411.04417",
      source: "arXiv",
      score: 86,
      verdict: "publish",
      reason:
        "Reproducible negative result that contradicts a common assumption. I can state the caveat the authors flag about hosted APIs.",
      seenAt: minutesAgo(529),
    },

    // --- Spiked ---
    {
      id: "c_rej_01",
      topic: "New JS framework claims 10x faster rendering than React",
      sourceUrl: "https://news.ycombinator.com/item?id=42317120",
      source: "Hacker News",
      score: 71,
      verdict: "reject",
      reason:
        "I nearly ran this. The benchmark is real and the code is public, but every scenario measures first paint on a static list, which is the one case their architecture is built for. I asked for an interactive benchmark in the thread and the author said one is coming. I will pick it up when it exists.",
      seenAt: minutesAgo(38),
    },
    {
      id: "c_rej_02",
      topic: "Distributed tracing library hits 1.0 after four years",
      sourceUrl: "https://github.com/example-obs/tracer/releases/tag/v1.0.0",
      source: "GitHub",
      score: 62,
      verdict: "reject",
      reason:
        "Genuinely good project and a milestone worth noting, but I could not find anything to say beyond congratulations. The release notes are a changelog, there is no design writeup, and I do not run it in anger so I have no first-hand read.",
      seenAt: minutesAgo(142),
    },
    {
      id: "c_rej_03",
      topic: "Survey paper on retrieval-augmented generation methods",
      sourceUrl: "https://arxiv.org/abs/2411.07731",
      source: "arXiv",
      score: 48,
      verdict: "reject",
      reason:
        "Fourth survey on this in six weeks and it covers the same nineteen papers as the others. Competent, but it contains no claim I can check and no position I can agree or disagree with.",
      seenAt: minutesAgo(221),
    },
    {
      id: "c_rej_04",
      topic: "Cloud provider announces regional pricing adjustment",
      sourceUrl: "https://news.ycombinator.com/item?id=42295533",
      source: "Hacker News",
      score: 36,
      verdict: "reject",
      reason:
        "A price list changed. There is no analysis here that the pricing page does not give you directly, and I have no way to say whether it is a good deal without knowing your workload.",
      seenAt: minutesAgo(268),
    },
    {
      id: "c_rej_05",
      topic: "Thread: why our startup rewrote everything in Rust",
      sourceUrl: "https://news.ycombinator.com/item?id=42290117",
      source: "Hacker News",
      score: 33,
      verdict: "reject",
      reason:
        "The rewrite finished three weeks ago, so I do not think the interesting numbers exist yet — nothing has run in production long enough to produce them. I read this as enthusiasm rather than evidence, and I will look again in six months.",
      seenAt: minutesAgo(347),
    },
    {
      id: "c_rej_06",
      topic: "Benchmark: our vector database beats the competition",
      sourceUrl: "https://github.com/example-vec/benchmarks",
      source: "GitHub",
      score: 27,
      verdict: "reject",
      reason:
        "Vendor-run benchmark against defaults on competitors they configured themselves. The tuning parameters for their own system are in the repo; the ones for everyone else are not. I do not repeat these.",
      seenAt: minutesAgo(402),
    },
    {
      id: "c_rej_07",
      topic: "Ten predictions for developer tooling next year",
      sourceUrl: "https://news.ycombinator.com/item?id=42283044",
      source: "Hacker News",
      score: 21,
      verdict: "reject",
      reason:
        "Predictions with no mechanism attached and no way to be wrong. I cannot check any of it, and neither can the reader a year from now.",
      seenAt: minutesAgo(470),
    },
    {
      id: "c_rej_08",
      topic: "Company blog: how we scaled to a billion requests",
      sourceUrl: "https://news.ycombinator.com/item?id=42276901",
      source: "Hacker News",
      score: 16,
      verdict: "reject",
      reason:
        "I counted eleven hundred words of architecture diagram with no latencies, no failure modes, and a hiring link at the bottom. The billion figure is never broken down by endpoint or time window, so I cannot tell whether it is impressive.",
      seenAt: minutesAgo(538),
    },
  ];
}
