# DELETE BEFORE SUBMIT

This repo contains four files that exist only to make the viewer demonstrable
without a backend. **All four serve or enable invented data.** They must be
removed before anything a reader, judge, or customer sees.

Run `npm run verify -- <production-url>` to fail the build if any of them
survive — see [scripts/feed-verify.ts](scripts/feed-verify.ts).

---

## The four files

### 1. `lib/mock.ts`

Holds all of it: six fabricated posts, fourteen fabricated candidates, invented
scores, invented editorial reasoning, and source URLs that point at issue and
commit IDs which do not exist.

**Why it must go:** this is the fake content itself. Every sentence attributed
to the agent in mock mode was written by hand, not produced by the agent. If it
ships, the viewer presents authored fiction as an autonomous system's output.

### 2. `app/api/agent/feed/route.ts`

Development stand-in for the real feed endpoint. Returns `501` unless
`NEXT_PUBLIC_USE_MOCK=true`.

**Why it must go:** it occupies `/api/agent/feed`. When the real backend serves
that path, **this file shadows it** and the viewer will silently read the stub
instead of production data. The gate does not help here — a shadowed route
returning `501` looks identical to an outage.

### 3. `app/api/agent/decisions/route.ts`

Same, for `/api/agent/decisions`.

**Why it must go:** identical shadowing problem. Note this path was invented by
this viewer and is not in the spec — the shape still needs agreeing with
whoever owns the candidates table.

### 4. `instrumentation.ts`

Next.js boot hook. Prints the mock-mode warning to the server log on startup.

**Why it must go:** it is dead weight once the mock is gone, and its only
reason to exist is to advertise a mode that should no longer be reachable. It
is also the file most likely to be forgotten, because nothing renders it.

---

## Also check

- **`.env.local`** — sets `NEXT_PUBLIC_USE_MOCK=true` and
  `NEXT_PUBLIC_DEFAULT_AGENT_ID=demo`. Already gitignored via `.env*.local`, so
  it should never leave your machine, but confirm it was not force-added and
  that no deployment environment defines `NEXT_PUBLIC_USE_MOCK`.
- **`NEXT_PUBLIC_SITE_URL`** must be set in the deployment environment.
  Server-side `fetch` cannot use relative URLs; without it `lib/api.ts` falls
  back to `localhost` and every fetch fails into an empty state.
- **`NEXT_PUBLIC_DEFAULT_AGENT_ID`** must be set, or `/` and `/spike` resolve
  `agentId` to `""` and short-circuit to empty before calling the API.

## One caveat on the flag

`NEXT_PUBLIC_*` variables are inlined at **build** time, not read at runtime.
A production build made without `NEXT_PUBLIC_USE_MOCK` therefore cannot serve
mock data even if the files are present — but do not rely on that. The
shadowing problem in files 2 and 3 is unaffected by the flag.

## Removal

```sh
rm lib/mock.ts \
   app/api/agent/decisions/route.ts \
   app/api/agent/feed/route.ts \
   instrumentation.ts
rmdir -p app/api/agent 2>/dev/null || true
npx tsc --noEmit && npx next build
```

Then delete this file.
