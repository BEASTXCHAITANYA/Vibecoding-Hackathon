import { resolveBaseUrl } from "./api";
import type { Candidate } from "./types";

/**
 * Coerces one item from the API into a Candidate. Returns null when the item is
 * too malformed to render. A row with no usable verdict is dropped rather than
 * guessed at — miscounting a rejection as a publication would misreport the
 * one statistic this page exists to show.
 */
function toCandidate(raw: unknown): Candidate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.id !== "string") return null;
  if (r.verdict !== "publish" && r.verdict !== "reject") return null;

  const score = typeof r.score === "number" && Number.isFinite(r.score)
    ? Math.min(100, Math.max(0, r.score))
    : 0;

  return {
    id: r.id,
    topic: typeof r.topic === "string" ? r.topic : "",
    sourceUrl: typeof r.sourceUrl === "string" ? r.sourceUrl : "",
    source: typeof r.source === "string" ? r.source : "",
    score,
    verdict: r.verdict,
    reason: typeof r.reason === "string" ? r.reason : "",
    seenAt: typeof r.seenAt === "string" ? r.seenAt : "",
  };
}

/**
 * Fetches the agent's decision log. Never throws — a viewer that fails to load
 * decisions shows the empty state rather than an error page.
 *
 * NOTE FOR BACKEND: /api/agent/decisions is ours, not in the spec. It reads the
 * candidates table. Coordinate the shape before building.
 */
export async function getDecisions(agentId: string): Promise<Candidate[]> {
  if (!agentId) return [];

  try {
    const url = new URL("/api/agent/decisions", resolveBaseUrl());
    url.searchParams.set("agentId", agentId);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    const data: unknown = await res.json();

    // Tolerate both a bare array and a { candidates: [...] } envelope, since
    // the shape is not yet agreed with the backend.
    const rows = Array.isArray(data)
      ? data
      : typeof data === "object" && data !== null
        ? (data as Record<string, unknown>).candidates
        : null;

    if (!Array.isArray(rows)) return [];

    return rows
      .map(toCandidate)
      .filter((c): c is Candidate => c !== null);
  } catch {
    return [];
  }
}
