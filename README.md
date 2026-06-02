# lore

**`git blame` tells you who. `lore` tells you why.**

A local-first CLI that reconstructs the *intent* behind a line of code from its git
history — the decision, not the timeline. Point it at a line and it reads the commits
that shaped it, then explains why it's like this, with every claim traced back to a
commit you can check.

```
$ lore why src/upload.ts:88

  88   await sleep(1100)

  This 1.1s pause guards against read-after-write on S3. The uploader
  originally read the object back immediately (a4f2e1b); that read
  intermittently 404'd because the bucket wasn't yet strongly consistent
  in the target region.

  The sleep was added in c83d90f. Its message says "fix flaky upload
  test" — but the diff tells a different story: the same commit deleted
  the retry loop just below it. So the sleep didn't fix a flaky test, it
  replaced real retry logic with a fixed wait. It's a workaround, not a
  fix — the race is still there if S3 is slow.

  Sources
    a4f2e1b  add direct read-back after upload
    c83d90f  fix flaky upload test
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
    2b1c9aa  wip
    5f0e213  fix
    9dd4c01  tweak config
```

An honest "I don't know" beats a confident wrong answer. That refusal to confabulate is
the point of the tool.

## Install

Requires Node 20+, `git`, and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/dentoverhoed/Lore.git
cd Lore
pnpm install
pnpm build      # produces the `lore` binary in dist/
```

Not on npm yet; when it publishes it will be as `@dentoverhoed/lore` (the bare name `lore`
is an unrelated, abandoned package).

## Use

```bash
lore why <file>:<line>
```

`lore` uses a model only for the final synthesis, and picks one automatically:

- **Local, zero keys (default).** If an [Ollama](https://ollama.com) daemon is running it is
  used — nothing leaves your machine.
  ```bash
  ollama pull llama3.1:8b
  lore why src/server.ts:142
  ```
- **Hosted fallback.** If Ollama isn't running and a key is set, it uses Anthropic.
  ```bash
  export ANTHROPIC_API_KEY=sk-...
  lore why src/server.ts:142
  ```

If neither is available, `lore` tells you exactly how to fix it.

## How it works

Three stages, one direction. No magic, and nothing you can't audit.

1. **Collect** — gather the raw evidence from git: the commits that touched the exact line
   (`git log -L`), the broader file history, and the diff hunks that show how the line
   actually changed over time. Read-only. No interpretation.
2. **Assemble** — rank that evidence by relevance (line changes over file changes, recency
   as tiebreak) into a tight dossier, and decide whether the history is rich enough to
   explain anything at all.
3. **Narrate** — turn the dossier into a sourced answer. This is the only stage that uses a
   model, and it's held to a strict brief: lead with the reason, cite commits, separate
   what a message *claims* from what the code *does*, and admit silence when the record is
   thin.

## Design principles

- **Leads with the decision**, not a chronological changelog.
- **Cites everything.** Every claim points to a commit SHA you can open and distrust.
- **Never invents a motive.** When git doesn't explain it, `lore` says the history is
  silent. This is the cardinal rule, not a nice-to-have.
- **Local-first.** Your code and its history stay on your machine. The only thing that ever
  leaves is what you explicitly route to a hosted model — and a local model is the default
  we're building toward.
- **Not a chatbot, not a refactorer.** One question, one sourced answer. `lore` never
  writes to your code.

## Privacy

`lore` reads your git history locally and sends the assembled dossier — relevant commit
messages and diff hunks for the line you asked about — to whichever model you configure.
With the local Ollama narrator (the default when it's running), nothing leaves your machine
at all. `lore` never transmits your full repository, and it never writes to it.

## Status

Slice 1 — the thin vertical slice that proves the bet (is the synthesis any good?) — is built
and validated. The `why` pipeline works end-to-end (git history in, sourced narrative out) and
has passed a validation gate against a local model on targets with known ground truth,
including a confabulation trap it correctly refused to answer. See `docs/validation-gate.md`.

Shipped: rename-aware Collect, a ranked dossier with thin-evidence detection, the
anti-confabulation prompt, and **both narrators** — a local Ollama default (zero keys) and a
hosted Anthropic fallback, chosen by auto-resolution.

Deliberately not built yet:

- Pull-request and issue mining (GitHub, GitLab) to recover the *discussion* behind a change,
  not just the commit.
- A richer interactive terminal UI and streamed output.
- Response caching and an OpenAI-compatible narrator.

The architecture is built so these slot in without a rewrite. See `CLAUDE.md` for the
internals and the reasoning behind the scope.

## Contributing

Issues and PRs welcome. The one thing held sacred: an answer must never assert a "why" the
commits don't support. If you can make `lore` confabulate, that's the most valuable bug
report you can file.

## License

MIT
