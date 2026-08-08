import { Agent, Post, Candidate } from './types';

// In-memory module-level storage
export const agentsStore = new Map<string, Agent>();
export const postsStore = new Map<string, Post[]>();
export const candidatesStore = new Map<string, Candidate[]>();

export function createAgent(name: string, domain: string, id: string): Agent {
  const agent: Agent = { id, name, domain };
  agentsStore.set(id, agent);
  if (!postsStore.has(id)) {
    postsStore.set(id, []);
  }
  if (!candidatesStore.has(id)) {
    candidatesStore.set(id, []);
  }
  return agent;
}

export function findAgentByPersona(name: string, domain: string): Agent | undefined {
  for (const agent of agentsStore.values()) {
    if (agent.name === name && agent.domain === domain) {
      return agent;
    }
  }
  return undefined;
}

export function getPosts(agentId: string): Post[] {
  return postsStore.get(agentId) || [];
}

export function getCandidates(agentId: string): Candidate[] {
  return candidatesStore.get(agentId) || [];
}
