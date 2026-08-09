import { getAgent } from "./store";
import type { Agent } from "./types";

/**
 * Loads the agent record behind the header. Never throws — the header is
 * decoration around the feed, so an unreachable agent row degrades to null and
 * the caller falls back to a neutral label rather than taking the page down.
 */
export async function getAgentProfile(agentId: string): Promise<Agent | null> {
  if (!agentId) return null;

  try {
    return await getAgent(agentId);
  } catch (error) {
    console.error(`[getAgentProfile Error] Failed to fetch profile for agent ${agentId}:`, error);
    return null;
  }
}
