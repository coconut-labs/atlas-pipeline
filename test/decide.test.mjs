import test from "node:test";
import assert from "node:assert/strict";
import { decideFrom, bootstrapServing } from "../lib/decide.mjs";
import { validate } from "../lib/schemas.mjs";

const serving = { version: "inc000000001", since: "2026-08-01T00:00:00.000Z", history: [] };

test("promote path: double green flips serving to candidate", () => {
  const gate = { version: "cand00000001", verdict: "pass", pass_rate: 0.9 };
  const canary = { verdict: "pass", axes: {} };
  const { decision, newServing } = decideFrom(gate, canary, serving, "2026-08-13");
  assert.equal(decision.action, "promote");
  assert.equal(decision.reason, "both green: candidate promoted");
  assert.equal(newServing.version, "cand00000001");
  assert.equal(newServing.history.length, 1);
  assert.deepEqual(newServing.history[0], { version: "cand00000001", from: "2026-08-13", action: "promote" });
});

test("gate-fail path: rollback, serving unchanged, reason names the axis", () => {
  const gate = { version: "cand00000002", verdict: "fail", failing_axis: "pass_rate", pass_rate: 0.55 };
  const canary = { verdict: "pass", axes: {} };
  const { decision, newServing } = decideFrom(gate, canary, serving, "2026-08-14");
  assert.equal(decision.action, "rollback");
  assert.ok(decision.reason.includes("pass_rate"));
  assert.ok(decision.reason.includes("0.55"));
  assert.equal(newServing.version, serving.version);
  assert.equal(newServing.history.length, 1);
  assert.deepEqual(newServing.history[0], { version: "cand00000002", from: "2026-08-14", action: "rollback" });
});

test("canary-fail path: gate passed but canary rolls it back, reason names the axis", () => {
  const gate = { version: "cand00000003", verdict: "pass", pass_rate: 0.9 };
  const canary = { verdict: "fail", failing_axis: "quality", axes: { quality: { cand: 0.5, inc: 0.9 } } };
  const { decision, newServing } = decideFrom(gate, canary, serving, "2026-08-15");
  assert.equal(decision.action, "rollback");
  assert.ok(decision.reason.includes("quality"));
  assert.equal(newServing.version, serving.version);
});

test("bootstrap path: serving = base version, empty history, schema-valid", () => {
  const base = { hash: "base00000001", created: "2026-08-01T00:00:00.000Z", model: "m",
    prompt_template: "t", temp: 0.2, max_tokens: 256, variant: "base" };
  const s = bootstrapServing(base);
  assert.equal(s.version, "base00000001");
  assert.deepEqual(s.history, []);
  assert.deepEqual(validate("serving", s), []);
});
