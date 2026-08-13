# atlas-pipeline

The classic MLOps loop, run for real against an LLM agent, every night,
for $0. Register, gate, canary, promote or roll back. Every artifact of
every run is committed here. Some nights are scheduled to fail: the drift
schedule degrades the candidate on purpose and the record shows the loop
catching it.

The agent is Qwen2.5-0.5B-Instruct on llama.cpp, CPU, inside GitHub
Actions. Small on purpose: the claim under test is the loop, not the
model. Scoring is mechanical (exact match and schema validity). No AI
grades AI here.

Rendered live at coconutlabs.org/projects/agentic-mlops.

## Run it yourself

    node scripts/fetch-deps.mjs
    node --test test/
    node scripts/loop.mjs --dry
    node scripts/loop.mjs --date 2026-08-13

`--dry` runs the gate on the first 3 cases and the canary on the first 2
slice ids, still real inference against llama.cpp, for a fast feasibility
check. Without `--dry` the gate runs the full 20-case suite and the
canary runs the full 6-id slice. Exit code 0 even on a rollback: a caught
gate or canary failure is a successful run of the loop. Nonzero exit means
an infrastructure error, not a policy decision.

`fetch-deps.mjs` downloads a Linux x64 llama.cpp build. On macOS it will
not run locally. Local verification here is `node --test`, the pure-part
suite; real inference runs in GitHub Actions.

## The record

`runs/<date>/` holds five files a night: `gate.json` (20-case pass rate,
latency, cost estimate, verdict), `canary.json` (candidate vs incumbent on
a fixed 6-case slice), `decision.json` (promote or rollback, with the
reason), `summary.json` (the one-line ingestion surface), and `trace.json`
(one full prompt and output pair, the first failing case or the first
case). `registry/serving.json` holds the currently promoted version and
its full promote and rollback history. `registry/versions/<hash>.json`
holds every version's exact prompt template, temperature, and token
budget.

Some nights are scheduled to fail on purpose. The candidate's variant is a
pure function of the date: day-of-month mod 7 equal to 5 produces
`drift-hot` (temperature raised to 1.4), day-of-month mod 3 equal to 2
produces `drift-truncate` (the prompt template cut to 60% of its length),
every other day produces a benign paraphrase candidate. This is
deterministic and disclosed here, not hidden in the numbers. The record
shows the gate and canary catching the degraded nights and rolling back.

`est_cost_usd` in each gate is an estimate: tokens per task times case
count times $0.15 per million tokens, a reference small-model API price
used for scale, not a real bill. `actual_cost_usd` is always 0 because
inference runs on GitHub Actions' free CPU minutes for a public repo.
