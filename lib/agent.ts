import type { Agent } from "./types";

/**
 * Loads the agent record behind the header. Never throws — the header is
 * decoration around the feed, so an unreachable agent row degrades to null and
 * the caller falls back to a neutral label rather than taking the page down.
 *
 * The store is pulled in dynamically on purpose: lib/db throws at module load
 * when DATABASE_URL is absent, and a static import would hoist that throw into
 * the page module itself, turning a missing header into a 500.
 */
export async function getAgentProfile(agentId: string): Promise<Agent | null> {
  if (!agentId) return null;

  try {
    const { getAgent } = await import("./store");
    return await getAgent(agentId);
  } catch {
    return null;
  }
}
