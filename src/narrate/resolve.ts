import { LoreError } from '../errors.js';
import { strings } from '../strings.js';
import { createAnthropicNarrator } from './anthropic.js';
import { createOllamaNarrator, DEFAULT_OLLAMA_HOST } from './ollama.js';
import type { Narrator } from './types.js';

/** Is an Ollama daemon answering at `host`? Fails closed (false) on any error. */
export async function isOllamaUp(host: string): Promise<boolean> {
  try {
    const res = await fetch(`${host.replace(/\/$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ResolveDeps {
  env?: NodeJS.ProcessEnv;
  /** Injectable for tests — defaults to a real Ollama probe. */
  probeOllama?: (host: string) => Promise<boolean>;
}

/**
 * Pick a narrator: a running local Ollama wins (local-first, zero keys),
 * else a hosted Anthropic model if a key is present, else a clear error.
 */
export async function createNarrator(deps: ResolveDeps = {}): Promise<Narrator> {
  const env = deps.env ?? process.env;
  const probe = deps.probeOllama ?? isOllamaUp;
  const host = env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;

  if (await probe(host)) {
    return createOllamaNarrator({ host, model: env.LORE_OLLAMA_MODEL });
  }
  if (env.ANTHROPIC_API_KEY) {
    return createAnthropicNarrator({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.LORE_MODEL,
    });
  }
  throw new LoreError(strings.noNarrator);
}
