// Pure: promote only on double green; otherwise rollback with a reason
// naming the failing axis. gate.failing_axis (when set) is always one of
// gate's own field names ("pass_rate" | "p95_ms" | "tokens_per_task"), so
// gate[gate.failing_axis] reads the offending value directly.
export function decideFrom(gate, canary, serving, date) {
  const gatePass = gate.verdict === "pass";
  const canaryPass = canary.verdict === "pass";

  let action, reason;
  if (gatePass && canaryPass) {
    action = "promote";
    reason = "both green: candidate promoted";
  } else {
    action = "rollback";
    if (!gatePass) {
      reason = `gate failed on ${gate.failing_axis} (${gate.failing_axis} = ${gate[gate.failing_axis]})`;
    } else {
      const axis = canary.failing_axis;
      const a = canary.axes[axis];
      reason = `canary failed on ${axis} (candidate ${a.cand} vs incumbent ${a.inc})`;
    }
  }

  const newServing = action === "promote"
    ? {
        version: gate.version,
        since: new Date().toISOString(),
        history: [...serving.history, { version: gate.version, from: date, action }],
      }
    : {
        ...serving,
        history: [...serving.history, { version: gate.version, from: date, action }],
      };

  const decision = {
    date, candidate: gate.version, incumbent: serving.version,
    gate: gate.verdict, canary: canary.verdict, action, reason,
  };
  return { decision, newServing };
}

// Bootstrap: first-run serving state, no promotion/rollback history yet.
export function bootstrapServing(version) {
  return { version: version.hash, since: new Date().toISOString(), history: [] };
}
