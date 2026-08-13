// CLI: node scripts/gate.mjs <version-file.json> [date]
// Fetches deps, loads the full case suite, runs real inference for the
// candidate version, writes runs/<date>/gate.json plus one trace.json
// (the first failing case, else the first case), both schema-validated
// before write.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validate } from "../lib/schemas.mjs";
import { gateFrom } from "../lib/gate.mjs";
import { runSuite } from "../lib/run-agent.mjs";

const versionPath = process.argv[2];
if (!versionPath) {
  console.error("usage: node scripts/gate.mjs <version-file.json> [date]");
  process.exit(1);
}

const policy = JSON.parse(readFileSync("policy.json", "utf8"));
const version = JSON.parse(readFileSync(versionPath, "utf8"));
const date = process.argv[3] ?? new Date().toISOString().slice(0, 10);

const depsOut = execFileSync("node", ["scripts/fetch-deps.mjs"], { encoding: "utf8" });
const deps = JSON.parse(depsOut.trim().split("\n").pop());
const cases = JSON.parse(readFileSync("suite/cases.json", "utf8"));

const suiteRun = runSuite(version, cases, deps);
const gate = gateFrom(suiteRun, version, date, policy);
const gateErrors = validate("gate", gate);
if (gateErrors.length) throw new Error(`gate schema invalid: ${gateErrors.join("; ")}`);

const failing = suiteRun.results.find((r) => !r.grader.pass) ?? suiteRun.results[0];
const trace = {
  date, version: version.hash, case_id: failing.case_id, prompt: failing.prompt,
  raw_output: failing.raw_output, parsed: failing.parsed, grader: failing.grader,
  timing_ms: failing.timing_ms, tokens: failing.tokens,
};
const traceErrors = validate("trace", trace);
if (traceErrors.length) throw new Error(`trace schema invalid: ${traceErrors.join("; ")}`);

mkdirSync(`runs/${date}`, { recursive: true });
writeFileSync(`runs/${date}/gate.json`, JSON.stringify(gate, null, 2) + "\n");
writeFileSync(`runs/${date}/trace.json`, JSON.stringify(trace, null, 2) + "\n");
console.log(JSON.stringify(gate));
