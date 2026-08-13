import { createHash } from "node:crypto";

// Canonical prompt template. {{instruction}} and {{input}} are substituted
// by buildPrompt (lib/run-agent.mjs).
const TEMPLATE = `You are a precise data assistant. Respond with ONLY the JSON asked for,
no prose, no code fences.
TASK: {{instruction}}
INPUT: {{input}}
JSON:`;

export function baseVersion(policy) {
  const v = {
    model: policy.model.name,
    prompt_template: TEMPLATE,
    temp: 0.2,
    max_tokens: 256,
    variant: "base",
  };
  return { ...v, hash: versionHash(v), created: new Date().toISOString() };
}

// Drift schedule, checked in this order: day % 7 === 5 first, then
// day % 3 === 2, else a benign paraphrase. Ordering this way (rather than
// the day % 3 check first) is what makes all three schedule points land
// on their intended variant: day 5 satisfies both day % 3 === 2 and
// day % 7 === 5, and it is the drift-hot case, so the hot check must run
// before the truncate check.
export function candidateFor(dateStr, policy) {
  const day = Number(dateStr.split("-")[2]);
  const base = baseVersion(policy);
  let v;
  if (day % 7 === 5) {
    v = { ...base, temp: 1.4, variant: "drift-hot" };
  } else if (day % 3 === 2) {
    const truncated = base.prompt_template.slice(0, Math.floor(base.prompt_template.length * 0.6));
    v = { ...base, prompt_template: truncated, variant: "drift-truncate" };
  } else {
    const paraphrased = base.prompt_template.replace(
      "You are a precise data assistant.",
      "You are a careful data assistant.",
    );
    v = { ...base, prompt_template: paraphrased, variant: "candidate" };
  }
  return { ...v, hash: versionHash(v), created: new Date().toISOString() };
}

export function versionHash(version) {
  const { hash, created, ...rest } = version;
  const sortedKeys = Object.keys(rest).sort();
  const canonical = {};
  for (const k of sortedKeys) canonical[k] = rest[k];
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 12);
}
