import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, parseTokens, percentile } from "../lib/run-agent.mjs";

test("buildPrompt substitutes case fields into the version template", () => {
  const v = { prompt_template: "SYS: answer as JSON.\nTASK: {{instruction}}\nINPUT: {{input}}" };
  const c = { instruction: "Do X.", input: "Y" };
  const p = buildPrompt(v, c);
  assert.ok(p.includes("Do X.") && p.includes("INPUT: Y"));
  assert.ok(!p.includes("{{"));
});

test("parseTokens reads llama.cpp eval line, null on absence", () => {
  const stderr = "llama_perf_context_print:        eval time =    1234.56 ms /    87 runs";
  assert.equal(parseTokens(stderr), 87);
  assert.equal(parseTokens("nothing here"), null);
});

test("percentile is exact on small arrays", () => {
  assert.equal(percentile([10, 20, 30, 40], 50), 25);
  assert.equal(percentile([10], 95), 10);
});
