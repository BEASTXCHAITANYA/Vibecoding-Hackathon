# PROMPTS.md

This document records real exchanges from building the autonomous AI persona agent, showing where the AI's output was reviewed, tested, and corrected rather than accepted blindly. Timestamps and IDs are real, pulled from the actual build session on 7–9 Aug 2026.

---

## 1. Persona consistency architecture

**Prompt (design phase, before any code):**
> "Plan the architecture for creating an AI Persona using OpenAI integration."

**What the AI proposed:** a charter generated once at `init`, stored permanently in Postgres, with its `systemPrompt` text re-injected into every future judgment and composition call — rather than regenerating persona traits on each tick.

**Why we accepted this without changes:** this directly satisfies the "consistent persona" requirement. Regenerating traits per-call would risk drift across the 48-hour window; a stored, immutable charter guarantees the same voice from post 1 to post 40.

**Verification, not assumption:** we didn't take "the charter won't regenerate" on faith. Step 3's prompt explicitly required the implementation to check `charterJson` before calling OpenAI again, and we tested it — called `init` twice with the same persona and confirmed via direct Postgres inspection that the charter was byte-identical before and after.

---

## 2. Catching a repetition bug the AI initially missed

**What happened:** during reliability testing, five sequential ticks produced three consecutive posts on the exact same topic — "Learning When to Trust via Selective Context Preference Optimization" — published three times in a row.

**Our correction:** we did not accept the AI's first framing, which treated this as expected behavior deferred to a later step:

> "Postgres-based recall (last 15 posts) already exists from Step 4, independent of Breeth. If recall data is being correctly passed into the judgment prompt and the model still republishes an identical or near-identical topic, treat that as a real bug to note now — do not defer it to Step 5."

**Root cause the AI found on investigation:** Postgres recall *was* reaching the judgment prompt, but as raw post text rather than structured topic/source data — meaning the model could still miss semantic duplicates even with the data present.

**Fix implemented:** a deterministic last-5-post duplicate guard added as a code-level backstop, independent of LLM judgment. This was verified in production during the multi-agent test (§5 below) — agent `BfYde7gpX79dDyVV5YLup` returned `status: "duplicate_skipped"` on a live tick, confirming the guard fires for real, not just in test conditions.

---

## 3. Rejecting an inflated bug report

**What happened:** a lint fix was initially reported as fixing a "duplicate-URL bug" in `discovery.ts`.

**Our correction:**
> "Fix the discovery.ts merge/dedup bug — show me the before/after and confirm no duplicate sourceUrl in a test run."

**What the investigation actually found:** there was no bug. `prefer-const` was flagging a variable that was only ever pushed to, never reassigned — a style-only issue with zero behavioral impact. The AI corrected its own earlier claim directly:

> "Turned out there was no duplicate-URL bug — the dedup logic (seenUrls Set) was already correct... I'd overstated this as a 'bug' in my earlier summary — apologies, it wasn't one."

This is included specifically because it demonstrates the AI walking back an overstated claim when asked to substantiate it with evidence, rather than defending the original framing.

---

## 4. Diagnosing a real concurrency bug under load, and identifying a Breeth-specific limitation

**What happened:** the initial concurrent-write dispatch to Breeth (conviction memories in `app/api/agent/init/route.ts`) used `.forEach()` — fully parallel, unawaited.

**Investigation requested:**
> "Check whether the Breeth timeout warnings are occasional or frequent."

**What was found, with real measurements:**
> "Sequential calls: 0/16 failures... 5 concurrent calls to the same endpoint: 4/5 failed, all pegged at the 8s ceiling. mcp.thebreeth.com appears to serialize or heavily throttle requests per connection."

**Fix:** sequential dispatch, fired after the HTTP response so `init` latency stayed unaffected (measured before/after: 9.2s baseline → 8.2s with the fix, versus 26.4s if dispatched as a blocking sequential call — the non-blocking approach was chosen specifically to avoid that regression).

**A second, separate finding during verification:** conviction memories were being accepted by Breeth at the HTTP layer (`addEpisode() → true`) but never became graph-searchable, even after 20+ minutes. The AI initially misreported this as resolved, citing paraphrased search hits as evidence — then caught its own error on a second pass:

> "I need to correct what I told you last turn... Looking at the raw edge data now, those fragments are REJECTED-type edges... not actual belief/conviction edges... I was pattern-matching on topic overlap, not on the actual edge type. That was wrong."

**Decision:** did not chase a fix for this. The core persona-consistency mechanism (§1) does not depend on Breeth's conviction-memory searchability — the charter lives in Postgres and is injected directly into every prompt. This was logged as a known limitation rather than left ambiguous or silently "fixed" with an unverified claim.

---

## 5. Finding and fixing a bug that would have broken evaluation for any judge-created persona

**The scenario:** all testing to that point used one hardcoded `agentId` in both schedulers (cron-job.org, GitHub Actions). We asked directly:

> "Does /api/agent/tick process ALL agents in the database, or only the one hardcoded agentId our schedulers are calling? I just created a test agent via init and need to know if it will ever actually get ticked."

**Root cause confirmed by inspection:**
> "`app/api/agent/tick/route.ts`... Only invokes `runTick(agentId, { force })` for that single agent. It does not iterate over Postgres rows."

**Why this mattered:** the real evaluator creates their own persona via `init`. If `tick` only ever processed one hardcoded agent, an evaluator's own agent would never be scheduled — a silent failure of the core "autonomous publishing" requirement that no amount of testing against our own agent would ever have caught.

**Fix and verification:** the tick route was changed to loop over every agent in Postgres, sequentially, with per-agent error isolation. Verified in production by creating a fresh agent (`VerifyBot-FinalCheck`) with a domain never seen before, triggering a tick using the *old* hardcoded request body, and confirming the new agent appeared in the results anyway:

```json
{
  "processedCount": 3,
  "results": [
    {"agentId": "hy1nbgaOGjTpIkBIsTnhA", "status": "too_soon"},
    {"agentId": "BfYde7gpX79dDyVV5YLup", "status": "duplicate_skipped"},
    {"agentId": "tG-K5Hk1oYwA_z1uLnd3k", "status": "nothing_published"}
  ]
}
```

Three distinct statuses for three agents in one response — confirming each is evaluated independently on its own state, not a copy-pasted result.

---

## 6. Diagnosing a live production incident under time pressure

**What happened:** cron-job.org's dashboard showed four consecutive `Failed (timeout)` events immediately after the multi-agent fix (§5) shipped.

**Instruction given:**
> "Check Vercel's function logs/duration... Check the ticks table... did the server-side work actually complete... Check the posts table — did anything get duplicated or corrupted."

**Diagnosis, with real numbers:** multi-agent sequential processing now took ~20.3s per tick; Vercel's default serverless timeout is 10s. The client (cron-job.org) was giving up and reporting failure while the server kept working — confirmed by continuous `ticks` table entries throughout the "failure" window, and zero duplicate posts (the atomic claim mechanism from §2/§5 held even under a timing fault).

**Fix:** `maxDuration: 60` set via `vercel.json`, deployed, and re-verified with a precisely timed manual tick (20.30s, comfortably under the new limit) before considering it resolved.

**Why this belongs here:** this is an example of not accepting "it's failing" or "it's fixed" at face value in either direction — the AI was asked to prove server-side integrity *before* treating the timeouts as benign, and to re-time the actual fix *after* deploying it, rather than assuming the config change alone was sufficient.

---

## 7. Frontend: reproducing a bug by acting as the evaluator, not by reading code

**What happened:** after the backend was verified working end-to-end, we manually walked through the exact sequence a real evaluator would follow — call `init` with a fresh persona nobody had used before, then visit the production URL with that agent's id. This wasn't a request to review code; it was a request to *behave like the grader* first, and only investigate code once a real symptom appeared.

**What that surfaced:** a persona named "Nova" (`domain: AI Ethics Researcher`), created via a plain `init` call, showed **"UNNAMED AGENT"** in the site header — even though the exact same header logic had rendered correctly for an older agent ("Ada") earlier in the build.

**Investigation requested:**
> "Since a real evaluator will create their OWN fresh agent and visit the site with it, this is a real bug that would affect the actual evaluation. Check getAgentProfile()... query the agents table directly... confirm it's not silently treating a slow/failed fetch as 'unknown' rather than retrying or surfacing an error."

**Root cause found:** `app/page.tsx` and `app/spike/page.tsx` were missing `export const dynamic = 'force-dynamic'`. Next.js App Router had cached an early render of the page — one made before a given agent's profile data existed — and kept serving that stale "unnamed agent" fallback even after the real data became available. This only ever manifested for **brand-new** agents, which is exactly why it had gone unnoticed: every agent used in testing up to that point (`Ada`, `Watchdog`) had already been visited enough times that a fresh, correctly-populated render existed in cache.

**Fix:** added `force-dynamic` and `revalidate = 0` to both pages, and hardened `getAgentProfile()`'s error handling to log rather than silently swallow failures.

**Verification, not assumption:** rather than trusting the fix against the same "Nova" agent that surfaced the bug (which could have simply picked up a fresh cache entry by coincidence), we required a **second, brand-new throwaway agent** (`VerifyBot-HeaderTest`, domain `Quantum Computing Specialist`) created specifically to test the fix, confirmed its header rendered correctly on first visit, then deleted it to avoid leaving test clutter in production.

**Why this belongs here:** this bug would only ever have been found by simulating the evaluator's actual behavior — creating a persona we'd never used and checking what they would see — not by reading the frontend code, which looked correct on inspection. It's included as an example of testing the system as an outside user rather than as its own builder.

---

## Summary

The pattern across this build: the AI's first answer was treated as a hypothesis to verify, not a conclusion to accept. Four genuine bugs were found this way (§2 repetition, §5 single-agent tick, §6 timeout, §7 header caching) that would not have been caught by simply reading code or trusting a status report. One inflated claim was caught and corrected on request (§3). One limitation was identified, investigated, and consciously left unfixed with reasoning stated (§4) rather than silently patched over. Bugs §5, §6, and §7 share a pattern worth naming directly: each was found not by reviewing code in isolation, but by deliberately acting out the real evaluator's exact behavior — a fresh persona, a cold request, a first visit — and treating any deviation from the expected result as worth investigating rather than explaining away.
