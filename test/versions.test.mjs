import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { baseVersion, candidateFor, versionHash } from "../lib/versions.mjs";
import { validate } from "../lib/schemas.mjs";

const policy = JSON.parse(readFileSync("policy.json", "utf8"));

test("baseVersion validates against the version schema", () => {
  const v = baseVersion(policy);
  assert.deepEqual(validate("version", v), []);
  assert.equal(v.variant, "base");
});

test("drift schedule is deterministic by date", () => {
  assert.equal(candidateFor("2026-08-02", policy).variant, "drift-truncate"); // 2 % 3 === 2
  assert.equal(candidateFor("2026-08-05", policy).variant, "drift-hot");      // 5 % 7 === 5, checked before day % 3
  assert.equal(candidateFor("2026-08-01", policy).variant, "candidate");
});

test("hash is stable and 12 hex chars", () => {
  const v = baseVersion(policy);
  assert.equal(versionHash(v), versionHash({ ...v }));
  assert.match(versionHash(v), /^[0-9a-f]{12}$/);
});
