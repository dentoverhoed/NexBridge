import { LoreError } from '../errors.js';
import { strings } from '../strings.js';
import type { Dossier } from '../types.js';
import { buildPrompt } from './prompt.js';
import type { Narrator } from './types.js';

export const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.1';

export interface OllamaOptions {
  host?: string;
  model?: string;
}

interface ChatResponse {
  message?: { content?: string };
}

/**
 * The fully-local narrator: talks to a running Ollama daemon over HTTP.
 * Zero API keys — a user with Ollama installed gets a working tool out of the box.
 */
export function createOllamaNarrator(opts: OllamaOptions = {}): Narrator {
  const host = (opts.host ?? DEFAULT_OLLAMA_HOST).replace(/\/$/, '');
  const model = opts.model ?? DEFAULT_MODEL;

  return {
    name: 'ollama',
    async narrate(dossier: Dossier): Promise<string> {
      const { system, user } = buildPrompt(dossier);
      let response: Response;
      try {
        response = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
        });
      } catch (err) {
        throw new LoreError(
          strings.ollamaFailed(err instanceof Error ? err.message : String(err)),
        );
      }

      if (!response.ok) {
        const detail = `${response.status} ${await response.text()}`.trim();
        throw new LoreError(strings.ollamaFailed(detail));
      }

      const data = (await response.json()) as ChatResponse;
      return (data.message?.content ?? '').trim();
    },
  };
}
