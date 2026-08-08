import { OpenAI } from 'openai';

export async function llmJSON(
  system: string,
  user: string,
  schema: any,
  schemaName: string,
  opts?: { model?: string; temperature?: number }
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const openai = new OpenAI({ apiKey });
  const model = opts?.model ?? 'gpt-4o-mini';
  const temperature = opts?.temperature ?? 0.3;

  let attempts = 0;
  while (true) {
    attempts++;
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            strict: true,
            schema: schema,
          },
        },
        temperature,
      });

      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error('LLM returned an empty response');
      }

      // Safe token logging
      const usage = response.usage;
      if (usage) {
        console.log(`[LLM Token Usage] Model: ${model} | Input: ${usage.prompt_tokens} | Output: ${usage.completion_tokens} | Total: ${usage.total_tokens}`);
      } else {
        console.log(`[LLM Token Usage] Model: ${model} | Usage metadata not available`);
      }

      return JSON.parse(messageContent);
    } catch (error: any) {
      // Check for 429 rate limit error
      const isRateLimit = 
        error.status === 429 || 
        (error.message && error.message.includes('429')) || 
        (error.code && error.code === 'rate_limit_exceeded');
      
      if (isRateLimit && attempts === 1) {
        console.warn('[LLM Warning] HTTP 429 Rate Limit hit. Retrying in 5 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      // Prevent leaking API key in error messages
      let sanitizedMessage = error.message || 'Unknown LLM Error';
      sanitizedMessage = sanitizedMessage.replace(new RegExp(escapeRegExp(apiKey), 'g'), 'REDACTED_API_KEY');
      
      throw new Error(`LLM call failed: ${sanitizedMessage}`);
    }
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
