import { describe, expect, it } from 'vitest';

import { LoreError } from '../../src/errors.js';
import { createNarrator } from '../../src/narrate/resolve.js';

const up = () => Promise.resolve(true);
const down = () => Promise.resolve(false);

describe('createNarrator (selection)', () => {
  it('prefers a running local Ollama, no key needed', async () => {
    const n = await createNarrator({ env: {}, probeOllama: up });
    expect(n.name).toBe('ollama');
  });

  it('falls back to Anthropic when Ollama is down and a key is set', async () => {
    const n = await createNarrator({
      env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
      probeOllama: down,
    });
    expect(n.name).toBe('anthropic');
  });

  it('errors clearly when neither is available', async () => {
    await expect(createNarrator({ env: {}, probeOllama: down })).rejects.toBeInstanceOf(
      LoreError,
    );
  });

  it('uses Ollama even when a key exists (local-first)', async () => {
    const n = await createNarrator({
      env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
      probeOllama: up,
    });
    expect(n.name).toBe('ollama');
  });
});
