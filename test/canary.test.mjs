import test from "node:test";
import assert from "node:assert/strict";
import { canaryFrom } from "../lib/canary.mjs";

// Same fabricated-run pattern as Task 6: pure comparator math only, no
// real inference claimed. n = 6 mirrors the policy's canary slice size.
const mkRun = (n, passed, p95, tokens, errors) => ({
  results: Array.from({ length: n }, (_, i) => ({
    grader: { pass: i < passed },
    parsed: i < n - errors ? {} : null,
  })),
  p95_ms: p95, tokens_per_task: tokens,
});

test("quality regression fails on quality axis", () => {
  const cand = mkRun(6, 2, 1000, 200, 0); // quality 0.333
  const inc = mkRun(6, 6, 1000, 200, 0);  // quality 1.0, gap 0.667 > 0.15
  const c = canaryFrom(cand, inc, "cand123", "inc456", "2026-08-13");
  assert.equal(c.verdict, "fail");
  assert.equal(c.failing_axis, "quality");
});

test("latency regression fails on p95_ms axis", () => {
  const cand = mkRun(6, 6, 5000, 200, 0);
  const inc = mkRun(6, 6, 2000, 200, 0); // cand p95 5000 > inc p95 2000 * 2
  const c = canaryFrom(cand, inc, "cand123", "inc456", "2026-08-13");
  assert.equal(c.verdict, "fail");
  assert.equal(c.failing_axis, "p95_ms");
});

test("error spike fails on errors axis", () => {
  const cand = mkRun(6, 6, 1000, 200, 5); // quality clean, 5 parse errors
  const inc = mkRun(6, 6, 1000, 200, 0);  // 0 errors; cand 5 > inc 0 + 2
  const c = canaryFrom(cand, inc, "cand123", "inc456", "2026-08-13");
  assert.equal(c.verdict, "fail");
  assert.equal(c.failing_axis, "errors");
});

test("clean run on all axes passes", () => {
  const cand = mkRun(6, 6, 1000, 200, 0);
  const inc = mkRun(6, 6, 1000, 200, 0);
  const c = canaryFrom(cand, inc, "cand123", "inc456", "2026-08-13");
  assert.equal(c.verdict, "pass");
  assert.equal(c.failing_axis, null);
});
