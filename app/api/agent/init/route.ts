import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { findAgentByPersona, createAgent } from '@/lib/store';

const initSchema = z.object({
  persona: z.object({
    name: z.string(),
    domain: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const parseResult = initSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request structure', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { name, domain } = parseResult.data.persona;

    // Check for existing agent by persona (idempotency check)
    const existingAgent = findAgentByPersona(name, domain);
    if (existingAgent) {
      return NextResponse.json(
        { agentId: existingAgent.id },
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate agentId using nanoid
    const agentId = nanoid();

    // Store the agent
    createAgent(name, domain, agentId);

    return NextResponse.json(
      { agentId },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
