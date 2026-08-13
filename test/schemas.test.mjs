import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../lib/schemas.mjs";

test("valid gate object passes", () => {
  const gate = {
    date: "2026-08-13", version: "abc123", cases: 20, passed: 17,
    pass_rate: 0.85, p50_ms: 900, p95_ms: 4100, tokens_per_task: 210,
    est_cost_usd: 0.0006, actual_cost_usd: 0, verdict: "pass",
    failing_axis: null,
  };
  assert.deepEqual(validate("gate", gate), []);
});

test("gate with missing field and wrong enum fails with named errors", () => {
  const errs = validate("gate", { date: "2026-08-13", verdict: "maybe" });
  assert.ok(errs.some((e) => e.includes("version")));
  assert.ok(errs.some((e) => e.includes("verdict")));
});

test("unknown kind throws", () => {
  assert.throws(() => validate("nope", {}));
});
