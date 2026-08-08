import { NextResponse } from 'next/server';
import { runTick } from '@/lib/tick';

export const dynamic = 'force-dynamic';

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

    // 2. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { agentId, force } = body;
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: agentId is required and must be a string' },
        { status: 400 }
      );
    }

    // 3. Trigger runTick
    // runTick catches all internal errors and returns a response object with a status field,
    // so we return HTTP 200 containing the run results.
    const result = await runTick(agentId, { force: !!force });

    return NextResponse.json(
      result,
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Tick Route Global Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
