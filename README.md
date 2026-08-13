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
not run locally. Local verification here is `node --test test/`, the
pure-part suite; real inference runs in GitHub Actions.
