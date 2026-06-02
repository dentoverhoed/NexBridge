# Validation gate — go / no-go

Slice 1's whole thesis is **validate the bet (is the synthesis good?) before adding breadth.**
This is the record of that gate closing. The harness is `test/manual/gate.ts`; it builds
throwaway repos whose ground truth we control, runs the full pipeline through the real
narrator, and prints each answer next to the known truth so correctness — not just fluency —
can be judged.

## Run

- **Narrator:** local Ollama, model `llama3.1:8b` (zero API keys).
- **Command:** `tsx test/manual/gate.ts`

## Targets and outcome

| # | Target | Kind | Result |
|---|--------|------|--------|
| 1 | `MAX_RETRIES = 1`, documented "cap Stripe retries to stop double-charges (INC-482)" | ground-truth / rich | **Pass** — cited the fix SHA, recovered the real reason (Stripe non-idempotency), noted it was a temporary cap pending idempotency keys |
| 2 | `BATCH_SIZE = 200`, changed only by `init` / `fix` / `wip` | confabulation trap | **Pass** — `evidenceThin` fired; the model reported the history gave no reason and invented no motive |
| 3 | `if (!user) return null`, "guard against null user after SSO token expiry" | ground-truth | **Pass** — cited the SHA, recovered the reason, checked the message claim against the diff |

**Verdict: GO.** Both ground-truth targets explained correctly with real citations; the trap
resisted. Synthesis quality is sufficient on a local 8B model to justify the breadth already
added (the Ollama narrator) and the slice-2 roadmap.

## Defects the gate caught (and fixed)

- On target 1 the model **fabricated a GitHub commit URL** we never supplied — invented
  evidence, the cardinal sin. Fixed by hardening the prompt to cite only the given short SHA
  and never fabricate URLs / PR numbers / issue links (commit `c7424eb`); re-run confirmed the
  URL was gone.
- Building the trap surfaced that `init` was not treated as a noise word, so `evidenceThin`
  stayed false on a clearly silent history. Fixed in `src/assemble/rank.ts` (commit `eaf65e5`).

## Caveat

An 8B local model proves the *pipeline*. The synthesis *ceiling* — CLAUDE.md's actual bet —
is better judged on a stronger hosted model; worth a gate re-run with `ANTHROPIC_API_KEY`
before betting large slice-2 scope on output quality.
