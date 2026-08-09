import { db } from './db';
import { agents, posts, candidates } from './db/schema';
import { Agent, Post, Candidate } from './types';
import { eq, and } from 'drizzle-orm';

export async function createAgent(
  name: string,
  domain: string,
  id: string,
  charterJson?: any
): Promise<Agent> {
  await db.insert(agents).values({
    id,
    name,
    domain,
    charterJson: charterJson || null,
    createdAt: new Date(),
  });
  return { id, name, domain };
}

export async function updateAgentCharter(id: string, charterJson: any): Promise<void> {
  await db
    .update(agents)
    .set({ charterJson })
    .where(eq(agents.id, id));
}

export async function findAgentByPersona(name: string, domain: string): Promise<any | undefined> {
  const result = await db
    .select({
      id: agents.id,
      name: agents.name,
      domain: agents.domain,
      charterJson: agents.charterJson,
    })
    .from(agents)
    .where(and(eq(agents.name, name), eq(agents.domain, domain)))
    .limit(1);

  return result[0];
}

export async function getAgent(id: string): Promise<Agent | null> {
  const result = await db
    .select({
      id: agents.id,
      name: agents.name,
      domain: agents.domain,
    })
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function getPosts(agentId: string): Promise<Post[]> {
  const result = await db
    .select({
      id: posts.id,
      createdAt: posts.createdAt,
      text: posts.text,
      rationale: posts.rationale,
      sources: posts.sources,
    })
    .from(posts)
    .where(eq(posts.agentId, agentId));

  return result.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function getCandidates(agentId: string): Promise<Candidate[]> {
  const result = await db
    .select({
      id: candidates.id,
      topic: candidates.topic,
      sourceUrl: candidates.sourceUrl,
      source: candidates.source,
      score: candidates.score,
      verdict: candidates.verdict,
      reason: candidates.reason,
      seenAt: candidates.seenAt,
    })
    .from(candidates)
    .where(eq(candidates.agentId, agentId));

  return result.map(c => ({
    ...c,
    verdict: c.verdict as 'publish' | 'reject',
    seenAt: c.seenAt.toISOString(),
  }));
}
