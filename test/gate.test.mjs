import test from "node:test";
import assert from "node:assert/strict";
import { gateFrom } from "../lib/gate.mjs";
const policy = { thresholds: { min_pass_rate: 0.7, max_p95_ms: 30000, max_tokens_per_task: 400 }, reference_price_per_mtok: 0.15 };
const mkRun = (passed, p95, tokens) => ({
  results: Array.from({ length: 20 }, (_, i) => ({ grader: { pass: i < passed } })),
  p50_ms: 800, p95_ms: p95, tokens_per_task: tokens,
});
test("low pass rate fails on pass_rate axis", () => {
  const g = gateFrom(mkRun(13, 1000, 200), { hash: "abc" }, "2026-08-13", policy);
  assert.equal(g.verdict, "fail");
  assert.equal(g.failing_axis, "pass_rate");
});
test("clean run passes with cost estimate", () => {
  const g = gateFrom(mkRun(18, 1000, 200), { hash: "abc" }, "2026-08-13", policy);
  assert.equal(g.verdict, "pass");
  assert.ok(Math.abs(g.est_cost_usd - (200 * 20 * 0.15) / 1e6) < 1e-9);
});
test("null tokens: cost null, tokens axis skipped", () => {
  const g = gateFrom(mkRun(18, 1000, null), { hash: "abc" }, "2026-08-13", policy);
  assert.equal(g.est_cost_usd, null);
  assert.equal(g.verdict, "pass");
});
