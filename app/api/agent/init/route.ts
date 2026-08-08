import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { findAgentByPersona, createAgent, updateAgentCharter } from '@/lib/store';
import { generateCharter, fallbackCharter, charterMemories } from '@/lib/persona-engine';
import { addEpisode } from '@/lib/breeth';
import { llmJSON } from '@/lib/llm';
import { charterSchema } from '@/lib/schemas';

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
    const existingAgent = await findAgentByPersona(name, domain);
    if (existingAgent) {
      if (existingAgent.charterJson) {
        // Existing agent with non-null charter: DO NOT regenerate, return existing ID
        return NextResponse.json(
          { agentId: existingAgent.id },
          { headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Existing agent with null charter: generate once and store
        let charter: any;
        try {
          const llmCallback = async (prompt: string): Promise<string> => {
            const result = await llmJSON(
              "You are a schema generator.",
              prompt,
              charterSchema,
              "charter",
              { model: "gpt-4o", temperature: 0.9 }
            );
            return JSON.stringify(result);
          };
          charter = await generateCharter({ name, domain }, llmCallback);
        } catch (openaiError) {
          console.error("OpenAI charter generation failed, using fallback:", openaiError);
          charter = fallbackCharter({ name, domain });
        }

        await updateAgentCharter(existingAgent.id, charter);

        // Background Breeth convictions dispatch
        try {
          const convictionsMem = charterMemories(charter);
          convictionsMem.forEach((mem) => {
            addEpisode(mem).catch((err) => {
              console.error(`[Breeth Init existingAgent Error] Failed to submit conviction: ${mem.content}`, err);
            });
          });
        } catch (memError) {
          console.error('[Breeth Init existingAgent Memory Generation Error]', memError);
        }

        return NextResponse.json(
          { agentId: existingAgent.id },
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // New agent: generate charter, create agent, and store
    const agentId = nanoid();
    let charter: any;
    try {
      const llmCallback = async (prompt: string): Promise<string> => {
        const result = await llmJSON(
          "You are a schema generator.",
          prompt,
          charterSchema,
          "charter",
          { model: "gpt-4o", temperature: 0.9 }
        );
        return JSON.stringify(result);
      };
      charter = await generateCharter({ name, domain }, llmCallback);
    } catch (openaiError) {
      console.error("OpenAI charter generation failed, using fallback:", openaiError);
      charter = fallbackCharter({ name, domain });
    }

    // Store the agent (database failures will correctly bubble to outer catch and return HTTP 500)
    await createAgent(name, domain, agentId, charter);

    // Background Breeth convictions dispatch
    try {
      const convictionsMem = charterMemories(charter);
      convictionsMem.forEach((mem) => {
        addEpisode(mem).catch((err) => {
          console.error(`[Breeth Init newAgent Error] Failed to submit conviction: ${mem.content}`, err);
        });
      });
    } catch (memError) {
      console.error('[Breeth Init newAgent Memory Generation Error]', memError);
    }

    return NextResponse.json(
      { agentId },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Database or runtime error during init:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
