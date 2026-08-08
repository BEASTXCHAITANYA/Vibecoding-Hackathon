
export interface AddEpisodeParams {
  content: string;
  source_description: string;
  group_id: string;
  extract_intent: boolean;
}

/**
 * Parses SSE data stream response from MCP server.
 */
function parseSSEResponse(text: string): any {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const dataStr = line.slice(5).trim();
      try {
        return JSON.parse(dataStr);
      } catch (err) {
        console.warn('[Breeth Parser Warning] Failed to parse data line as JSON:', err);
      }
    }
  }
  // Fallback: try parsing direct body if not formatted as SSE
  return JSON.parse(text);
}

/**
 * Extracts list of strings from search_graph result.
 */
function extractSearchStrings(jsonrpcResponse: any): string[] | null {
  if (!jsonrpcResponse || jsonrpcResponse.error) {
    console.warn('[Breeth Client Warning] Response contains error:', jsonrpcResponse?.error);
    return null;
  }

  const content = jsonrpcResponse.result?.content;
  if (!Array.isArray(content) || content.length === 0) {
    return [];
  }

  const textVal = content[0]?.text;
  if (!textVal) {
    return [];
  }

  try {
    const parsed = JSON.parse(textVal);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.episodes)) {
        return parsed.episodes.map((e: any) =>
          typeof e === 'object' ? String(e?.fact ?? e?.content ?? JSON.stringify(e)) : String(e));
      }
      if (Array.isArray(parsed.edges)) {
        return parsed.edges.map((e: any) =>
          typeof e === 'object' ? String(e?.fact ?? e?.content ?? JSON.stringify(e)) : String(e));
      }
      if (Array.isArray(parsed.results)) {
        return parsed.results.map((r: any) =>
          typeof r === 'object' ? String(r?.fact ?? r?.content ?? JSON.stringify(r)) : String(r));
      }
    }
  } catch {
    // Plain text response: fallback to splitting lines
  }

  return textVal
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
}

/**
 * Search the Breeth memory graph.
 */
export async function search(query: string): Promise<string[] | null> {
  const apiKey = process.env.BREETH_API_KEY;
  if (!apiKey) {
    console.warn('[Breeth Client Warning] BREETH_API_KEY is not configured.');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://mcp.thebreeth.com/mcp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search_graph',
          arguments: { query }
        },
        id: 1
      }),
      signal: controller.signal as any
    });

    if (!response.ok) {
      console.warn(`[Breeth Client Warning] search_graph returned HTTP ${response.status}`);
      return null;
    }

    const textBody = await response.text();
    const jsonrpc = parseSSEResponse(textBody);
    return extractSearchStrings(jsonrpc);
  } catch (err: any) {
    console.warn('[Breeth Client Warning] search_graph call failed:', err.message || err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Add an episode write to the Breeth memory graph.
 */
export async function addEpisode(params: AddEpisodeParams): Promise<boolean> {
  const apiKey = process.env.BREETH_API_KEY;
  if (!apiKey) {
    console.warn('[Breeth Client Warning] BREETH_API_KEY is not configured.');
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://mcp.thebreeth.com/mcp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'add_episode',
          arguments: {
            content: params.content,
            source_description: params.source_description,
            group_id: params.group_id,
            extract_intent: params.extract_intent
          }
        },
        id: 1
      }),
      signal: controller.signal as any
    });

    if (!response.ok) {
      console.warn(`[Breeth Client Warning] add_episode returned HTTP ${response.status}`);
      return false;
    }

    const textBody = await response.text();
    const jsonrpc = parseSSEResponse(textBody);

    if (jsonrpc?.error) {
      console.warn('[Breeth Client Warning] add_episode returned JSON-RPC error:', jsonrpc.error);
      return false;
    }

    const result = jsonrpc?.result;
    if (result?.isError) {
      console.warn('[Breeth Client Warning] add_episode tool reported execution error:', result?.content);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('[Breeth Client Warning] add_episode call failed:', err.message || err);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
