// Mechanical graders. No AI grades AI here: extraction and tool calls are
// exact-object matches after tolerant JSON recovery; arithmetic checks the
// numeric answer within 1e-6. Tolerant recovery means: strip code fences,
// take the first {...} block, parse or fail to null.
function recoverJson(raw) {
  const stripped = raw.replace(/```(?:json)?/g, "");
  const start = stripped.indexOf("{");
  if (start === -1) return null;
  // Walk to the matching close brace of the first object.
  let depth = 0;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === "{") depth++;
    if (stripped[i] === "}") depth--;
    if (depth === 0) {
      try { return JSON.parse(stripped.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function deepEqual(a, b) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== "object") return a === b;
  const ka = Object.keys(a).sort(); const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

export function gradeCase(caseObj, rawOutput) {
  const parsed = recoverJson(rawOutput);
  let pass = false;
  if (parsed !== null) {
    if (caseObj.kind === "extract" || caseObj.kind === "toolcall") {
      pass = deepEqual(parsed, caseObj.expect);
    } else if (caseObj.kind === "arith") {
      pass = typeof parsed.answer === "number" &&
        Math.abs(parsed.answer - caseObj.expect.answer) < 1e-6 &&
        typeof parsed?.args?.expression === "string" &&
        parsed.args.expression.length > 0 &&
        parsed.tool === "calculator";
    }
  }
  return { kind: caseObj.kind, pass, expected: caseObj.expect, parsed };
}
