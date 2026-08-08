/**
 * Verifies a deployed viewer against its live API.
 *
 *   npm run verify                          # defaults to http://localhost:3000
 *   npm run verify -- https://agent.example.com
 *   npm run verify -- https://agent.example.com my-agent-id
 *
 * Against any non-local target this refuses to run while the mock scaffolding
 * is still present — see DELETE-BEFORE-SUBMIT.md. Exits non-zero on any
 * failure so CI can gate on it.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Kept in sync with DELETE-BEFORE-SUBMIT.md. */
const MOCK_FILES = [
  "lib/mock.ts",
  "app/api/agent/feed/route.ts",
  "app/api/agent/decisions/route.ts",
  "instrumentation.ts",
] as const;

const ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local"];

let failed = false;

function fail(msg: string): void {
  failed = true;
  console.error(`  FAIL  ${msg}`);
}

function pass(msg: string): void {
  console.log(`  ok    ${msg}`);
}

function banner(lines: string[]): void {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  console.error("\n" + "=".repeat(width));
  for (const l of lines) console.error("  " + l);
  console.error("=".repeat(width) + "\n");
}

function isLocalTarget(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h === "[::1]" ||
    h.endsWith(".local")
  );
}

/**
 * The check this script exists for: mock scaffolding must not survive into a
 * production run. Hard-fails before any network call.
 */
function assertNoMockArtifacts(target: URL): void {
  const present = MOCK_FILES.filter((f) => existsSync(join(ROOT, f)));

  const envMockOn = ENV_FILES.filter((f) => {
    const p = join(ROOT, f);
    if (!existsSync(p)) return false;
    return /^\s*NEXT_PUBLIC_USE_MOCK\s*=\s*["']?true["']?\s*$/m.test(
      readFileSync(p, "utf8"),
    );
  });

  if (present.length === 0 && envMockOn.length === 0 && process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    pass("no mock scaffolding present");
    return;
  }

  const lines = ["REFUSING TO VERIFY A PRODUCTION URL", "", `target: ${target.origin}`, ""];

  if (present.length > 0) {
    lines.push("Mock files still in the working tree:");
    for (const f of present) lines.push(`  - ${f}`);
    lines.push("");
    lines.push("These serve or enable fabricated posts and decisions.");
    lines.push("The two route handlers also SHADOW the real API paths.");
  }

  if (envMockOn.length > 0) {
    lines.push("");
    lines.push("NEXT_PUBLIC_USE_MOCK=true is set in:");
    for (const f of envMockOn) lines.push(`  - ${f}`);
  }

  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    lines.push("");
    lines.push("NEXT_PUBLIC_USE_MOCK=true is set in the environment.");
  }

  lines.push("");
  lines.push("See DELETE-BEFORE-SUBMIT.md, then run this again.");

  banner(lines);
  process.exit(1);
}

type Json = Record<string, unknown>;

async function getJson(url: URL): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body reported via status */
  }
  return { status: res.status, body };
}

function checkFeed(body: unknown): void {
  const posts = (body as Json | null)?.posts;
  if (!Array.isArray(posts)) {
    fail("feed: response has no `posts` array");
    return;
  }
  pass(`feed: ${posts.length} post(s)`);
  if (posts.length === 0) fail("feed: zero posts — viewer will render its empty state");

  posts.forEach((p, i) => {
    const o = p as Json;
    if (typeof o.id !== "string" || o.id === "") fail(`feed[${i}]: missing id`);
    if (typeof o.text !== "string" || o.text.trim() === "") fail(`feed[${i}]: empty text`);
    if (typeof o.createdAt !== "string" || Number.isNaN(Date.parse(o.createdAt))) {
      fail(`feed[${i}]: createdAt is not a parseable ISO date`);
    }
  });
}

function checkDecisions(body: unknown): void {
  const raw = Array.isArray(body) ? body : (body as Json | null)?.candidates;
  if (!Array.isArray(raw)) {
    fail("decisions: response has no `candidates` array");
    return;
  }

  const verdicts = raw.map((c) => (c as Json).verdict);
  const bad = verdicts.filter((v) => v !== "publish" && v !== "reject").length;
  const spiked = verdicts.filter((v) => v === "reject").length;

  pass(`decisions: ${raw.length} candidate(s), ${spiked} spiked`);
  if (bad > 0) fail(`decisions: ${bad} candidate(s) with an unrecognised verdict`);

  raw.forEach((c, i) => {
    const o = c as Json;
    if (typeof o.score !== "number" || o.score < 0 || o.score > 100) {
      fail(`decisions[${i}]: score out of range 0-100`);
    }
    if (typeof o.seenAt !== "string" || Number.isNaN(Date.parse(o.seenAt))) {
      fail(`decisions[${i}]: seenAt is not a parseable ISO date`);
    }
  });
}

async function main(): Promise<void> {
  const rawTarget = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const agentId =
    process.argv[3] ?? process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID ?? "demo";

  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    console.error(`Not a valid URL: ${rawTarget}`);
    process.exit(2);
  }

  const local = isLocalTarget(target);
  console.log(`\nVerifying ${target.origin} (agentId=${agentId})`);
  console.log(local ? "Target is local — mock check skipped.\n" : "Target is remote.\n");

  if (!local) assertNoMockArtifacts(target);

  for (const [name, path, check] of [
    ["feed", "/api/agent/feed", checkFeed],
    ["decisions", "/api/agent/decisions", checkDecisions],
  ] as const) {
    const url = new URL(path, target.origin);
    url.searchParams.set("agentId", agentId);

    try {
      const { status, body } = await getJson(url);
      if (status !== 200) {
        fail(`${name}: HTTP ${status} from ${url.pathname}`);
        continue;
      }
      check(body);
    } catch (err) {
      fail(`${name}: request failed — ${(err as Error).message}`);
    }
  }

  console.log("");
  if (failed) {
    console.error("Verification FAILED\n");
    process.exit(1);
  }
  console.log("Verification passed\n");
}

main();
