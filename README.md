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
