import { NextResponse } from 'next/server';
import { getPosts } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { posts: [] },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const posts = await getPosts(agentId);

    // Sort newest first by createdAt
    const sortedPosts = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json(
      { posts: sortedPosts },
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
