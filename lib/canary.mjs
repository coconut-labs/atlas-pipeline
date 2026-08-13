// Pure: candidate vs incumbent on the fixed 6-case slice. Axes evaluated
// in order quality, p95_ms, errors; failing_axis names the first one that
// trips. Errors = count of cases where JSON recovery failed (parsed null).
export function canaryFrom(candRun, incRun, candHash, incHash, date) {
  const cases = candRun.results.length;
  const quality = (run) => run.results.filter((r) => r.grader.pass).length / run.results.length;
  const errorCount = (run) => run.results.filter((r) => r.parsed === null).length;

  const candQuality = quality(candRun);
  const incQuality = quality(incRun);
  const candErrors = errorCount(candRun);
  const incErrors = errorCount(incRun);
  const candP95 = candRun.p95_ms;
  const incP95 = incRun.p95_ms;

  let verdict = "pass";
  let failing_axis = null;
  if (candQuality < incQuality - 0.15) {
    verdict = "fail"; failing_axis = "quality";
  } else if (candP95 > incP95 * 2) {
    verdict = "fail"; failing_axis = "p95_ms";
  } else if (candErrors > incErrors + 2) {
    verdict = "fail"; failing_axis = "errors";
  }

  return {
    date, candidate: candHash, incumbent: incHash, cases,
    axes: {
      quality: { cand: candQuality, inc: incQuality },
      p95_ms: { cand: candP95, inc: incP95 },
      errors: { cand: candErrors, inc: incErrors },
      tokens: { cand: candRun.tokens_per_task, inc: incRun.tokens_per_task },
    },
    verdict, failing_axis,
  };
}
