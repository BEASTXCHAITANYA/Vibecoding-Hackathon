import { NextResponse } from 'next/server';
import { getCandidates, agentsStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId || !agentsStore.has(agentId)) {
      return NextResponse.json(
        { candidates: [] },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const candidates = getCandidates(agentId);

    // Sort newest first by seenAt
    const sortedCandidates = [...candidates].sort((a, b) => b.seenAt.localeCompare(a.seenAt));

    return NextResponse.json(
      { candidates: sortedCandidates },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
