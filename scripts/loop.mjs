// node scripts/loop.mjs [--dry] [--date YYYY-MM-DD]
// One command runs the whole night: fetch-deps, ensure bootstrap, build
// the candidate for the date, gate it, canary it against the incumbent,
// decide, write runs/<date>/*.json + registry state, print one summary
// line. Exit 0 even on rollback -- a caught gate/canary failure is a
// successful run of the loop. Exit nonzero only on infrastructure errors
// (uncaught throws below, e.g. missing files, malformed artifacts).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validate } from "../lib/schemas.mjs";
import { baseVersion, candidateFor } from "../lib/versions.mjs";
import { runSuite } from "../lib/run-agent.mjs";
import { gateFrom } from "../lib/gate.mjs";
import { canaryFrom } from "../lib/canary.mjs";
import { decideFrom, bootstrapServing } from "../lib/decide.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const dateFlagIdx = args.indexOf("--date");
const date = dateFlagIdx !== -1 ? args[dateFlagIdx + 1] : new Date().toISOString().slice(0, 10);

function writeValidated(kind, obj, path) {
  const errors = validate(kind, obj);
  if (errors.length) throw new Error(`${kind} schema invalid at ${path}: ${errors.join("; ")}`);
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

const policy = JSON.parse(readFileSync("policy.json", "utf8"));

// 1. fetch-deps
const depsOut = execFileSync("node", ["scripts/fetch-deps.mjs"], { encoding: "utf8" });
const deps = JSON.parse(depsOut.trim().split("\n").pop());

mkdirSync("registry/versions", { recursive: true });
mkdirSync(`runs/${date}`, { recursive: true });

// 2. ensure bootstrap (first-ever run: no serving state yet)
if (!existsSync("registry/serving.json")) {
  const base = baseVersion(policy);
  writeValidated("version", base, `registry/versions/${base.hash}.json`);
  writeValidated("serving", bootstrapServing(base), "registry/serving.json");
}

const serving = JSON.parse(readFileSync("registry/serving.json", "utf8"));
const incumbent = JSON.parse(readFileSync(`registry/versions/${serving.version}.json`, "utf8"));

// 3. build candidate
const candidate = candidateFor(date, policy);
writeValidated("version", candidate, `registry/versions/${candidate.hash}.json`);

const allCases = JSON.parse(readFileSync("suite/cases.json", "utf8"));

// 4. gate (full 20 cases; --dry = first 3 cases, still real inference)
const gateCases = dry ? allCases.slice(0, 3) : allCases;
const gateRun = runSuite(candidate, gateCases, deps);
const gate = gateFrom(gateRun, candidate, date, policy);
writeValidated("gate", gate, `runs/${date}/gate.json`);

const gateFailing = gateRun.results.find((r) => !r.grader.pass) ?? gateRun.results[0];
const trace = {
  date, version: candidate.hash, case_id: gateFailing.case_id, prompt: gateFailing.prompt,
  raw_output: gateFailing.raw_output, parsed: gateFailing.parsed, grader: gateFailing.grader,
  timing_ms: gateFailing.timing_ms, tokens: gateFailing.tokens,
};
writeValidated("trace", trace, `runs/${date}/trace.json`);

// 5. canary. --dry slices this too: the full canary is 6 ids x 2 versions
// = 12 real inferences on top of the gate's 3, which is 5x the intended
// probe cost and would fail the feasibility gate for a reason that isn't
// feasibility. Dry mode caps the slice to 2 ids (4 inferences).
const canaryIds = dry ? policy.canary_case_ids.slice(0, 2) : policy.canary_case_ids;
const canarySlice = canaryIds.map((id) => {
  const c = allCases.find((x) => x.id === id);
  if (!c) throw new Error(`canary_case_ids references unknown case id: ${id}`);
  return c;
});
const candCanaryRun = runSuite(candidate, canarySlice, deps);
const incCanaryRun = runSuite(incumbent, canarySlice, deps);
const canary = canaryFrom(candCanaryRun, incCanaryRun, candidate.hash, incumbent.hash, date);
writeValidated("canary", canary, `runs/${date}/canary.json`);

// 6. decide
const { decision, newServing } = decideFrom(gate, canary, serving, date);
writeValidated("decision", decision, `runs/${date}/decision.json`);
writeValidated("serving", newServing, "registry/serving.json");

// 7. summary -- Plan B's cheapest ingestion surface. dry is recorded so
// the artifact never overclaims a full run it did not do.
const summary = {
  date, action: decision.action, gate_verdict: gate.verdict,
  canary_verdict: canary.verdict, candidate: candidate.hash,
  serving_after: newServing.version, dry,
};
writeValidated("summary", summary, `runs/${date}/summary.json`);

console.log(
  `${date} ${decision.action} gate=${gate.verdict} canary=${canary.verdict} ` +
  `serving=${newServing.version}${dry ? " (dry)" : ""}`,
);
