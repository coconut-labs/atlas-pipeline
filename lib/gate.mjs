// Pure: thresholds to verdict. gate.version is the string hash, per the
// gate schema (version: string) -- callers pass the version OBJECT here
// and this function reads version.hash.
export function gateFrom(suiteRun, version, date, policy) {
  const cases = suiteRun.results.length;
  const passed = suiteRun.results.filter((r) => r.grader.pass).length;
  const pass_rate = passed / cases;
  const { p50_ms, p95_ms, tokens_per_task } = suiteRun;
  const est_cost_usd = tokens_per_task === null
    ? null
    : (tokens_per_task * cases * policy.reference_price_per_mtok) / 1e6;

  let verdict = "pass";
  let failing_axis = null;
  if (pass_rate < policy.thresholds.min_pass_rate) {
    verdict = "fail"; failing_axis = "pass_rate";
  } else if (p95_ms > policy.thresholds.max_p95_ms) {
    verdict = "fail"; failing_axis = "p95_ms";
  } else if (tokens_per_task !== null && tokens_per_task > policy.thresholds.max_tokens_per_task) {
    verdict = "fail"; failing_axis = "tokens_per_task";
  }

  return {
    date, version: version.hash, cases, passed, pass_rate, p50_ms, p95_ms,
    tokens_per_task, est_cost_usd, actual_cost_usd: 0, verdict, failing_axis,
  };
}
