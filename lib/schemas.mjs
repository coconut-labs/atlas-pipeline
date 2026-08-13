const SCHEMAS = {
  version: { hash: "string", created: "string", model: "string",
    prompt_template: "string", temp: "number", max_tokens: "number",
    variant: "string" },
  gate: { date: "string", version: "string", cases: "number",
    passed: "number", pass_rate: "number", p50_ms: "number",
    p95_ms: "number", tokens_per_task: "number|null",
    est_cost_usd: "number|null", actual_cost_usd: "number",
    verdict: ["pass", "fail"], failing_axis: "string|null" },
  canary: { date: "string", candidate: "string", incumbent: "string",
    cases: "number", axes: "object", verdict: ["pass", "fail"],
    failing_axis: "string|null" },
  decision: { date: "string", candidate: "string", incumbent: "string",
    gate: ["pass", "fail"], canary: ["pass", "fail"],
    action: ["promote", "rollback"], reason: "string" },
  serving: { version: "string", since: "string", history: "array" },
  trace: { date: "string", version: "string", case_id: "string",
    prompt: "string", raw_output: "string", parsed: "object|null",
    grader: "object", timing_ms: "number", tokens: "number|null" },
};

export function validate(kind, obj) {
  const schema = SCHEMAS[kind];
  if (!schema) throw new Error(`unknown schema kind: ${kind}`);
  const errors = [];
  for (const [field, spec] of Object.entries(schema)) {
    const v = obj?.[field];
    if (Array.isArray(spec)) {
      if (!spec.includes(v)) errors.push(`${field}: expected one of ${spec.join("|")}, got ${JSON.stringify(v)}`);
      continue;
    }
    const kinds = spec.split("|");
    const ok = kinds.some((k) =>
      k === "null" ? v === null :
      k === "array" ? Array.isArray(v) :
      k === "object" ? (typeof v === "object" && v !== null && !Array.isArray(v)) :
      typeof v === k);
    if (!ok) errors.push(`${field}: expected ${spec}, got ${typeof v}`);
  }
  return errors;
}
