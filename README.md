# lore

**`git blame` tells you who. `lore` tells you why.**

<!--
  Demo GIF goes here. Record it with the vhs tape + make-repo.sh, save as docs/demo.gif,
  then uncomment. Keep the recorded answer and the example below in sync.

<p align="center">
  <img src="docs/demo.gif" alt="lore explaining why a line of code is the way it is" width="760">
</p>
-->

A local-first CLI that reconstructs the *intent* behind a line of code from its git
history — the decision, not the timeline. Point it at a line and it reads the commits
that shaped it, then explains why it's like this, with every claim traced back to a
commit you can check.

```
$ lore why src/upload.ts:7

  7   await sleep(1100)

  This 1.1s pause guards against read-after-write on S3. The uploader
  originally verified the write with a retry loop (a4f2e1b); that check
  could 404 on a freshly-written key before the bucket was consistent.

  The sleep was added in c83d90f. Its message says "fix flaky upload
  test" — but the diff tells a different story: the same commit deleted
  the retry loop just below it. So the sleep didn't fix a flaky test, it
  replaced real retry logic with a fixed wait. It's a workaround, not a
  fix — the race is still there if S3 is slow.

  Sources
    c83d90f  fix flaky upload test
    a4f2e1b  add S3 uploader with read-after-write retry
```

That's the whole pitch: it leads with the reason, cites its evidence, and tells you when
the commit message and the code disagree.

## The part most tools get wrong

The hard thing isn't summarizing history — it's *not making things up*. When the history
doesn't actually explain something, `lore` says so instead of inventing a plausible motive:

```
$ lore why src/config.ts:12

  12   const POOL_SIZE = 7

  The history is silent on why this is 7. Three commits have touched this
  line — 2b1c9aa, 5f0e213, 9dd4c01 — titled "wip", "fix", and "tweak
  config", none with a body. The value went 4 → 10 → 7 with no recorded
  reasoning. If there was a why, it never made it into git.

  Sources
    9dd4c01  tweak config
    5f0e213  fix
    2b1c9aa  wip
```

An honest "I don't know" beats a confident wrong answer. That refusal to confabulate is
the point of the tool.

## Requirements

- **Node 20+** and **git**.
- A model to do the synthesis — either a local **[Ollama](https://ollama.com)** (recommended,
  no keys, nothing leaves your machine) or an **Anthropic API key**. See [Use](#use).

## Install

`lore` is early and not yet on the npm registry, so install from source:

```bash
git clone https://github.com/dentoverhoed/Lore.git
cd Lore
pnpm install
pnpm build
npm link        # puts `lore` on your PATH
```

> When it's published it will be the scoped package `@dentoverhoed/lore` — **not** the
> unrelated `lore` package already on npm. Until then, use the steps above.

## Use

```bash
lore why <file>:<line>
```

Run it from inside the repo you're asking about. `lore` picks how to narrate, in this order:

1. **A running local Ollama wins.** If an Ollama daemon is up on `localhost:11434`, `lore`
   uses it automatically — no API key, and your history never leaves your machine.

   ```bash
   ollama pull llama3.1      # once
   lore why src/server.ts:142
   ```

2. **Otherwise, a hosted model** if you've set a key:

   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   lore why src/server.ts:142
   ```

3. **Otherwise** `lore` tells you how to set up either option.

### Configuration

All optional — the defaults above just work.

| Variable | What it does | Default |
| --- | --- | --- |
| `OLLAMA_HOST` | Where to reach the local Ollama daemon | `http://localhost:11434` |
| `LORE_OLLAMA_MODEL` | Local model to narrate with | `llama3.1` |
| `ANTHROPIC_API_KEY` | Enables the hosted fallback | — |
| `LORE_MODEL` | Hosted model to narrate with | `claude-opus-4-8` |

## How it works

Three stages, one direction. No magic, and nothing you can't audit.

1. **Collect** — gather raw evidence from git: the commits that touched the exact line
   (`git log -L`, followed across renames), the broader file history, and the diff hunks
   showing how the line actually changed over time. Read-only. No interpretation.
2. **Assemble** — rank that evidence by relevance (line changes over file changes, recency
   as tiebreak) into a tight dossier, and judge whether the history is rich enough to
   explain anything at all — or whether it's just noise.
3. **Narrate** — turn the dossier into a sourced answer. The only stage that uses a model,
   held to a strict brief: lead with the reason, cite commits, separate what a message
   *claims* from what the code *does*, and admit silence when the record is thin.

## Design principles

- **Leads with the decision**, not a chronological changelog.
- **Cites everything.** Every claim points to a commit SHA you can open and distrust.
- **Never invents a motive.** When git doesn't explain it, `lore` says the history is
  silent. This is the cardinal rule, not a nice-to-have.
- **Local-first.** With a local model running, your code and history never leave your
  machine. A hosted model is an opt-in fallback, not the default.
- **Not a chatbot, not a refactorer.** One question, one sourced answer. `lore` never
  writes to your code.

## Privacy

`lore` reads your git history locally. If a local Ollama is handling narration, **nothing
leaves your machine**. If you fall back to a hosted model, `lore` sends only the assembled
dossier — the relevant commit messages and the line's diff hunks for the file:line you
asked about — never your full repository. Either way, `lore` never writes to your repo.

## Status

Early, and honest about it. What works today, end-to-end (`git` history in → sourced
narrative out):

- The `why` pipeline: Collect → Assemble → Narrate.
- Two narrators behind one interface — **local Ollama** (the zero-key default) and
  **Anthropic** (hosted fallback), selected automatically.
- Renames followed via `git log -L`; shallow-clone and deleted-line cases handled with
  plain-language messages instead of raw git errors.

Deliberately not built yet:

- **Pull-request and issue mining** (GitHub, GitLab) to recover the *discussion* behind a
  change, not just the commit — the next big lift.
- A richer **interactive terminal UI** and **streamed** output.
- Smarter, non-English-aware detection of low-signal commit messages.

The architecture is built so these slot in without a rewrite. See `CLAUDE.md` for the
internals and the reasoning behind the scope, and `docs/hour-zero-probe.md` for what the
git layer actually does (and where it stops).

## Contributing

Issues and PRs welcome. The one thing held sacred: an answer must never assert a "why" the
commits don't support. If you can make `lore` confabulate, that's the most valuable bug
report you can file.

## License

MIT
