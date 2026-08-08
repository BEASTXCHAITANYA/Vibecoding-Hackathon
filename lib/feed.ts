import { resolveBaseUrl } from "./api";
import type { FeedResponse, Post } from "./types";

const EMPTY: FeedResponse = { posts: [] };

/**
 * Coerces one item from the API into a Post. Returns null when the item is too
 * malformed to render. Missing rationale/sources are tolerated — they become
 * empty and PostCard simply omits those sections.
 */
function toPost(raw: unknown): Post | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.id !== "string" || typeof r.createdAt !== "string") return null;

  return {
    id: r.id,
    createdAt: r.createdAt,
    text: typeof r.text === "string" ? r.text : "",
    rationale: typeof r.rationale === "string" ? r.rationale : "",
    sources: Array.isArray(r.sources)
      ? r.sources.filter((s): s is string => typeof s === "string")
      : [],
  };
}

/**
 * Fetches the agent's feed. Never throws — a viewer that fails to load posts
 * shows the empty state rather than an error page.
 */
export async function getFeed(agentId: string): Promise<FeedResponse> {
  if (!agentId) return EMPTY;

  try {
    const url = new URL("/api/agent/feed", resolveBaseUrl());
    url.searchParams.set("agentId", agentId);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return EMPTY;

    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return EMPTY;

    const posts = (data as Record<string, unknown>).posts;
    if (!Array.isArray(posts)) return EMPTY;

    return { posts: posts.map(toPost).filter((p): p is Post => p !== null) };
  } catch {
    return EMPTY;
  }
}
