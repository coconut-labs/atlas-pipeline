import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { gradeCase } from "./graders.mjs";

export function buildPrompt(version, caseObj) {
  return version.prompt_template
    .replaceAll("{{instruction}}", caseObj.instruction)
    .replaceAll("{{input}}", caseObj.input);
}

export function parseTokens(stderr) {
  const m = stderr.match(/eval time\s*=\s*[\d.]+\s*ms\s*\/\s*(\d+)\s*runs/);
  return m ? Number(m[1]) : null;
}

export function percentile(sorted, p) {
  const a = [...sorted].sort((x, y) => x - y);
  if (a.length === 1) return a[0];
  const idx = (p / 100) * (a.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

// spawnSync (not execFileSync + a shell redirect) so prompt content -
// braces, quotes, $, newlines - never passes through a shell. It returns
// {stdout, stderr, status} on both success and failure, so stderr for
// token parsing is captured on the success path too, no temp file.
export function runSuite(version, caseList, paths) {
  const binDir = resolve(paths.cli, "..");
  const results = [];
  for (const c of caseList) {
    const prompt = buildPrompt(version, c);
    const t0 = Date.now();
    const proc = spawnSync(paths.cli, [
      "-m", paths.model, "-p", prompt, "-n", String(version.max_tokens),
      "--temp", String(version.temp), "--no-display-prompt", "-no-cnv",
    ], {
      encoding: "utf8", timeout: 120000,
      env: { ...process.env, LD_LIBRARY_PATH: binDir },
    });
    const timing_ms = Date.now() - t0;
    const raw = proc.stdout ?? "";
    const stderrText = proc.stderr ?? "";
    const grade = gradeCase(c, raw);
    results.push({
      case_id: c.id, prompt, raw_output: raw, parsed: grade.parsed,
      grader: { kind: grade.kind, pass: grade.pass, expected: grade.expected },
      timing_ms, tokens: parseTokens(stderrText),
    });
  }
  const times = results.map((r) => r.timing_ms);
  const toks = results.map((r) => r.tokens).filter((t) => t !== null);
  return {
    results,
    p50_ms: percentile(times, 50),
    p95_ms: percentile(times, 95),
    tokens_per_task: toks.length ? toks.reduce((a, b) => a + b, 0) / toks.length : null,
  };
}
