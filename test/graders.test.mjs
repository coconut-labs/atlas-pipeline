import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gradeCase } from "../lib/graders.mjs";

const cases = JSON.parse(readFileSync("suite/cases.json", "utf8"));

test("suite has exactly 20 cases with unique ids and valid kinds", () => {
  assert.equal(cases.length, 20);
  assert.equal(new Set(cases.map((c) => c.id)).size, 20);
  for (const c of cases) assert.ok(["extract", "toolcall", "arith"].includes(c.kind));
});

test("extract: exact object match passes, wrong value fails", () => {
  const c = cases.find((x) => x.id === "ex-01");
  const good = gradeCase(c, "```json\n" + JSON.stringify(c.expect) + "\n```");
  assert.equal(good.pass, true);
  const bad = gradeCase(c, JSON.stringify({ ...c.expect, total_usd: 1 }));
  assert.equal(bad.pass, false);
});

test("toolcall: tc-01 exact call passes; wrong tool fails", () => {
  const c = cases.find((x) => x.id === "tc-01");
  assert.equal(gradeCase(c, '{"tool":"get_weather","args":{"city":"Pune"}}').pass, true);
  assert.equal(gradeCase(c, '{"tool":"search_flights","args":{}}').pass, false);
});

test("arith: numeric tolerance on answer, expression must be non-empty", () => {
  const c = cases.find((x) => x.id === "ar-01");
  const out = JSON.stringify({ tool: "calculator", args: { expression: "2*3" }, answer: c.expect.answer + 1e-9 });
  assert.equal(gradeCase(c, out).pass, true);
});

test("garbage output fails cleanly with parsed null", () => {
  const c = cases[0];
  const r = gradeCase(c, "I cannot help with that.");
  assert.equal(r.pass, false);
  assert.equal(r.parsed, null);
});
