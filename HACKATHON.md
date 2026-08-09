# Hackathon Notes

> AI assistants used: Claude (Antigravity, Claude Code), OpenAI (gpt-4o, gpt-4o-mini). Final implementation reviewed and verified by the team. See [`PROMPTS.md`](./PROMPTS.md) for the real build log.

This project is a genuine autonomous system, not a scripted demo — it discovers topics, exercises editorial judgment (rejecting most of what it sees), remembers what it's already covered, and publishes on its own schedule with zero human input after initialization. Every claim below is backed by a production-verified check documented in `PROMPTS.md`.

---

## 1 · Breeth — capability → usage map

| Breeth capability | Our usage | Where |
|---|---|---|
| `search()` | Recall — checked before every judgment pass, so the agent doesn't re-cover a topic it already published | `lib/tick.ts`, RECALL step |
| `addEpisode()`, `extract_intent: false` | Every **rejected** candidate written as a memory — this is the editorial-judgment trail | `lib/tick.ts`, PERSIST step |
| `addEpisode()`, `extract_intent: true` | Every **published** post written as a memory, with the reasoning attached — strictly after the Postgres commit, never before | `lib/tick.ts`, STORE step |
| `addEpisode()`, `extract_intent: true` | The persona's charter convictions written as durable facts, once, at first `init` | `app/api/agent/init/route.ts` |

**Ordering discipline:** RECALL (read) always happens before REMEMBER (write) within a single tick — never the reverse. Breeth's indexing runs asynchronously, so a write is not immediately searchable; reversing this order would risk the agent re-reading its own just-written memory mid-decision.

**Failure isolation:** every Breeth call is wrapped, timeboxed (8s), and returns `null`/`false` on any failure rather than throwing. Verified directly — with `BREETH_API_KEY` deliberately broken, the tick pipeline completed identically to normal, just with a smaller recall set. **Postgres is the system of record; Breeth is additive.** If Breeth is fully down, `init`, `feed`, `decisions`, and publishing all continue to work.

## 2 · What we did NOT reimplement / fully wire, and why

- **Breeth conviction-memory graph edges** — conviction memories (the persona's charter convictions) are dispatched to Breeth successfully at the HTTP layer (`addEpisode() → true`) but do not currently produce queryable graph edges. Breeth's extractor appears to require a clean subject-predicate-object structure that abstract belief statements (`"{name} believes: {claim}"`) don't provide, while structured event statements (`"{name} rejected {title}"` / `"{name} published {title}"`) extract cleanly and are confirmed present in the graph.

  We investigated this directly rather than assuming — see `PROMPTS.md` §4 for the raw edge-type verification that caught our own earlier misdiagnosis. We chose not to chase a fix: **persona consistency does not depend on this.** The charter is stored directly in Postgres and injected into every prompt via `systemPrompt`, independent of whether Breeth's graph indexes it.

- **Real social media posting** — explicitly out of scope per the problem statement. Publishing is simulated to our own feed.

## 3 · Reproducibility a judge can actually run

```bash
git clone https://github.com/BEASTXCHAITANYA/Vibecoding-Hackathon.git
cd Vibecoding-Hackathon
npm install
cp .env.example .env.local   # fill in DATABASE_URL, OPENAI_API_KEY,
                              # BREETH_API_KEY, TICK_SECRET, MIN_GAP_MINUTES
npm run db:generate && npm run db:migrate
npm run build
```

Or skip local setup entirely — the two endpoints that matter are already live:

```bash
curl -X POST https://vibecoding-hackathon-beastxchaitanyas-projects.vercel.app/api/agent/init \
  -H "Content-Type: application/json" \
  -d '{"persona":{"name":"YourPersona","domain":"Your Domain"}}'

curl "https://vibecoding-hackathon-beastxchaitanyas-projects.vercel.app/api/agent/feed?agentId=<returned id>"
```

Any persona works — the agent is generic, not hardcoded to any one identity. This was verified in production by creating fresh test personas (`Watchdog` / Open Source Security, `Nova` / AI Ethics Researcher) and confirming both were picked up automatically by the scheduler with zero manual intervention.

## 4 · Evidence this runs unattended, not just on demand

Two independent schedulers drive the agent — cron-job.org (5 min) and GitHub Actions (15 min) — specifically so one silently failing doesn't stop publishing. This redundancy was tested for real, not theoretical: a production timeout incident (multi-agent processing exceeding Vercel's default 10s function limit) was caught via the scheduler's own failure logs, diagnosed with real execution-time measurements, and fixed live. Full account in `PROMPTS.md` §6.

Four real production bugs were found and fixed during the build, each one by deliberately acting out the evaluator's exact behavior rather than reviewing code in isolation:

1. **Repetition** — three consecutive ticks published the same topic; fixed with a deterministic duplicate-topic backstop, independent of LLM judgment
2. **Single-agent scheduling gap** — the tick endpoint only ever processed one hardcoded agent; any evaluator-created persona would never have been scheduled. Fixed to loop over every agent in Postgres
3. **Production timeout** — multi-agent sequential processing exceeded the default serverless timeout
4. **Header caching** — Next.js served a stale "unnamed agent" fallback for brand-new personas due to a missing `force-dynamic` directive

Full diagnosis, fix, and re-verification for each is in `PROMPTS.md`.

## 5 · Quick links

| Doc | Purpose |
|---|---|
| [`README.md`](./README.md) | Project overview, architecture, local setup |
| [`PROMPTS.md`](./PROMPTS.md) | AI usage log — real exchanges, real bugs, real fixes |
| [`DELETE-BEFORE-SUBMIT.md`](./DELETE-BEFORE-SUBMIT.md) | Cleanup checklist status |
