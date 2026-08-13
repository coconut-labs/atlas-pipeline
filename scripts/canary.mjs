// CLI: node scripts/canary.mjs <candidate-version-file.json> [date]
// Runs the fixed 6-case slice for real against both the candidate and the
// registry incumbent (registry/serving.json -> registry/versions/<hash>.json),
// writes runs/<date>/canary.json, schema-validated before write.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validate } from "../lib/schemas.mjs";
import { canaryFrom } from "../lib/canary.mjs";
import { runSuite } from "../lib/run-agent.mjs";

const candPath = process.argv[2];
if (!candPath) {
  console.error("usage: node scripts/canary.mjs <candidate-version-file.json> [date]");
  process.exit(1);
}

const policy = JSON.parse(readFileSync("policy.json", "utf8"));
const candidate = JSON.parse(readFileSync(candPath, "utf8"));
const date = process.argv[3] ?? new Date().toISOString().slice(0, 10);

const serving = JSON.parse(readFileSync("registry/serving.json", "utf8"));
const incumbent = JSON.parse(readFileSync(`registry/versions/${serving.version}.json`, "utf8"));

const depsOut = execFileSync("node", ["scripts/fetch-deps.mjs"], { encoding: "utf8" });
const deps = JSON.parse(depsOut.trim().split("\n").pop());

const allCases = JSON.parse(readFileSync("suite/cases.json", "utf8"));
const slice = policy.canary_case_ids.map((id) => {
  const c = allCases.find((x) => x.id === id);
  if (!c) throw new Error(`canary_case_ids references unknown case id: ${id}`);
  return c;
});

const candRun = runSuite(candidate, slice, deps);
const incRun = runSuite(incumbent, slice, deps);

const canary = canaryFrom(candRun, incRun, candidate.hash, incumbent.hash, date);
const errors = validate("canary", canary);
if (errors.length) throw new Error(`canary schema invalid: ${errors.join("; ")}`);

mkdirSync(`runs/${date}`, { recursive: true });
writeFileSync(`runs/${date}/canary.json`, JSON.stringify(canary, null, 2) + "\n");
console.log(JSON.stringify(canary));
