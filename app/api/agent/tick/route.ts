import { NextResponse } from 'next/server';
import { runTick } from '@/lib/tick';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    // 1. Auth Header Verification
    const xTickSecret = request.headers.get('x-tick-secret');
    const expectedSecret = process.env.TICK_SECRET;

    if (!expectedSecret) {
      console.error('[Tick Route Configuration Error] TICK_SECRET environment variable is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!xTickSecret || xTickSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing x-tick-secret' },
        { status: 401 }
      );
    }

    // 2. Parse request body (optional)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional or may be empty JSON
    }

    const force = !!body?.force;

    // 3. Query all agent ids from Postgres
    let allAgents: { id: string }[] = [];
    try {
      allAgents = await db.select({ id: agents.id }).from(agents);
    } catch (dbErr: any) {
      console.error('[Tick Route DB Query Error]', dbErr);
      return NextResponse.json(
        {
          processedCount: 0,
          results: [],
          error: 'Database query failed'
        },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Pre-fetch shared discovery candidates once for all agents
    let sharedCandidates: any[] = [];
    try {
      const { discover } = await import('@/lib/discovery');
      sharedCandidates = await discover();
    } catch (discErr) {
      console.error('[Tick Route Discovery Error]', discErr);
    }

    // 5. Run runTick for each agent sequentially
    const results: any[] = [];
    for (const agent of allAgents) {
      try {
        const result = await runTick(agent.id, { force, candidates: sharedCandidates });
        results.push({
          agentId: agent.id,
          ...result
        });
      } catch (agentError: any) {
        console.error(`[Tick Route Error for Agent ${agent.id}]`, agentError);
        results.push({
          agentId: agent.id,
          status: 'error',
          error: agentError?.message || 'Tick failed for agent'
        });
      }
    }

    return NextResponse.json(
      {
        processedCount: results.length,
        results
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Tick Route Global Error]', error);
    // Route must ALWAYS return HTTP 200 overall to schedulers
    return NextResponse.json(
      {
        processedCount: 0,
        results: [],
        error: error?.message || 'Internal Server Error'
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
