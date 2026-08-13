// CLI: node scripts/decide.mjs <date>
//      node scripts/decide.mjs --bootstrap
// Bootstrap writes registry/versions/<basehash>.json AND registry/serving.json
// (canary loads the incumbent via serving.json -> registry/versions/<hash>.json,
// so serving alone is not enough to make the first canary runnable).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { validate } from "../lib/schemas.mjs";
import { decideFrom, bootstrapServing } from "../lib/decide.mjs";
import { baseVersion } from "../lib/versions.mjs";

const policy = JSON.parse(readFileSync("policy.json", "utf8"));

if (process.argv[2] === "--bootstrap") {
  if (existsSync("registry/serving.json")) {
    console.log("registry/serving.json already exists, bootstrap skipped");
    process.exit(0);
  }
  const base = baseVersion(policy);
  const baseErrors = validate("version", base);
  if (baseErrors.length) throw new Error(`base version schema invalid: ${baseErrors.join("; ")}`);
  mkdirSync("registry/versions", { recursive: true });
  writeFileSync(`registry/versions/${base.hash}.json`, JSON.stringify(base, null, 2) + "\n");

  const serving = bootstrapServing(base);
  const servingErrors = validate("serving", serving);
  if (servingErrors.length) throw new Error(`serving schema invalid: ${servingErrors.join("; ")}`);
  writeFileSync("registry/serving.json", JSON.stringify(serving, null, 2) + "\n");
  console.log(JSON.stringify(serving));
  process.exit(0);
}

const date = process.argv[2];
if (!date) {
  console.error("usage: node scripts/decide.mjs <date> | node scripts/decide.mjs --bootstrap");
  process.exit(1);
}

const gate = JSON.parse(readFileSync(`runs/${date}/gate.json`, "utf8"));
const canary = JSON.parse(readFileSync(`runs/${date}/canary.json`, "utf8"));
const serving = JSON.parse(readFileSync("registry/serving.json", "utf8"));

const { decision, newServing } = decideFrom(gate, canary, serving, date);

const decisionErrors = validate("decision", decision);
if (decisionErrors.length) throw new Error(`decision schema invalid: ${decisionErrors.join("; ")}`);
const servingErrors = validate("serving", newServing);
if (servingErrors.length) throw new Error(`serving schema invalid: ${servingErrors.join("; ")}`);

writeFileSync(`runs/${date}/decision.json`, JSON.stringify(decision, null, 2) + "\n");
writeFileSync("registry/serving.json", JSON.stringify(newServing, null, 2) + "\n");
console.log(JSON.stringify(decision));
