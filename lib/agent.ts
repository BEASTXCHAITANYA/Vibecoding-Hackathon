import { getAgent } from "./store";
import type { Agent } from "./types";

/**
 * Loads the agent record behind the header. Retries once on transient database errors
 * (e.g. Neon serverless cold start) to ensure the persona name & domain always render.
 */
export async function getAgentProfile(agentId: string): Promise<Agent | null> {
  if (!agentId) return null;

  try {
    const result = await getAgent(agentId);
    if (result) return result;
  } catch (error) {
    console.warn(`[getAgentProfile Attempt 1 Warning] Retrying for agent ${agentId}:`, error);
  }

  // Retry once after a brief 300ms pause if the initial query returned null/failed
  try {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return await getAgent(agentId);
  } catch (error) {
    console.error(`[getAgentProfile Attempt 2 Error] Failed to fetch profile for agent ${agentId}:`, error);
    return null;
  }
}
