#!/usr/bin/env node
/**
 * Regenerates eval-report.md from CI logs, PR history, and (when present)
 * local Cursor agent transcripts. Cursor has no built-in telemetry for these
 * metrics — this script is the measurement path.
 *
 * Usage:
 *   node scripts/generate-eval-report.mjs
 *   EVAL_E2E_RUNS=10 node scripts/generate-eval-report.mjs
 *
 * Env:
 *   EVAL_E2E_RUNS          — last N E2E workflow runs (default 10)
 *   EVAL_REPO              — owner/repo (default: gh repo resolve)
 *   EVAL_TRANSCRIPTS_DIR   — agent-transcripts root (optional; skip ask-vs-guess if missing)
 *   EVAL_OUT               — output path (default: eval-report.md)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const E2E_RUNS = Number(process.env.EVAL_E2E_RUNS || 10);
const OUT = resolve(process.env.EVAL_OUT || 'eval-report.md');
const TRANSCRIPTS_DIR = process.env.EVAL_TRANSCRIPTS_DIR
  || defaultTranscriptsDir();

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', opts.allowFail ? 'pipe' : 'pipe'],
    ...opts,
  });
}

function ghJson(args) {
  return JSON.parse(sh('gh', args));
}

function defaultTranscriptsDir() {
  const home = process.env.HOME || '';
  const candidates = [
    join(home, '.cursor/projects/Users-yaroslavzulyak-Legion-AI-Powered-QA-Automation-ai-assisted-qa-automation-2/agent-transcripts'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return '';
}

function resolveRepo() {
  if (process.env.EVAL_REPO) return process.env.EVAL_REPO;
  try {
    const url = sh('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']).trim();
    return url;
  } catch {
    return 'yzulyak/ai-assisted-qa-automation-2';
  }
}

function stripTs(line) {
  return line.replace(/^\d{4}-\d{2}-\d{2}T.*?Z\s+/, '');
}

function parsePlaywrightSummary(logs) {
  let failed = null;
  let flaky = null;
  let passed = null;
  let skipped = null;
  const flakyTitles = [];
  const lines = logs.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const body = stripTs(lines[i]);
    let m = body.match(/^\s*(\d+)\s+flaky\b/i);
    if (m) {
      flaky = Number(m[1]);
      // Titles often follow until next summary counter
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const b = stripTs(lines[j]);
        if (/^\s*\d+\s+(failed|passed|skipped|flaky)\b/i.test(b)) break;
        if (b.includes('›')) flakyTitles.push(b.trim());
      }
    }
    m = body.match(/^\s*(\d+)\s+failed\b/i);
    if (m && !body.includes('deleted=')) failed = Number(m[1]);
    m = body.match(/^\s*(\d+)\s+passed\b/i);
    if (m) passed = Number(m[1]);
    m = body.match(/^\s*(\d+)\s+skipped\b/i);
    if (m) skipped = Number(m[1]);
  }
  if (passed == null && failed == null) return null;
  if (flaky == null) flaky = 0;
  return {
    passed: passed ?? 0,
    failed: failed ?? 0,
    flaky,
    skipped: skipped ?? 0,
    flakyTitles,
    denom: (passed ?? 0) + (failed ?? 0) + flaky,
  };
}

function measureFlake(repo, n) {
  const runs = ghJson([
    'run', 'list', '--workflow=e2e.yml', '--limit', String(n),
    '--json', 'databaseId,conclusion,createdAt,displayTitle,url',
  ]);
  const perRun = [];
  for (const r of runs) {
    const jobs = ghJson(['api', `repos/${repo}/actions/runs/${r.databaseId}/jobs`]);
    const jobId = jobs.jobs?.[0]?.id;
    if (!jobId) continue;
    let logs = '';
    try {
      logs = sh('gh', ['api', `repos/${repo}/actions/jobs/${jobId}/logs`], { maxBuffer: 64 * 1024 * 1024 });
    } catch {
      continue;
    }
    const summary = parsePlaywrightSummary(logs);
    if (!summary || summary.passed === 0 && summary.failed === 0 && summary.flaky === 0) continue;
    // Drop cleanup-script false positives (passed missing, tiny denom with no "passed" line)
    if (summary.passed === 0 && summary.failed <= 1 && summary.flaky === 0 && !/\d+\s+passed\b/i.test(logs)) {
      continue;
    }
    perRun.push({
      id: r.databaseId,
      title: r.displayTitle,
      at: r.createdAt,
      url: r.url,
      ...summary,
    });
  }
  const flakySum = perRun.reduce((a, r) => a + r.flaky, 0);
  const total = perRun.reduce((a, r) => a + r.denom, 0);
  const rate = total ? flakySum / total : null;
  const examples = perRun.filter((r) => r.flaky > 0).flatMap((r) =>
    r.flakyTitles.map((t) => ({ run: r.id, title: t, url: r.url })),
  );
  return { n: perRun.length, flakySum, total, rate, perRun, examples };
}

function isHealPr(p) {
  return /^heal\//i.test(p.headRefName || '')
    || /\bheal\b/i.test(p.title || '')
    || /\blocator drift\b/i.test(p.title || '')
    || /\bself-heal\b/i.test(p.body || '');
}

function measureHeal(repo) {
  const prs = ghJson([
    'pr', 'list', '--repo', repo, '--state', 'all', '--limit', '50',
    '--json', 'number,title,body,url,mergedAt,createdAt,headRefName,state',
  ]);
  const healPrs = prs.filter(isHealPr);

  let clean = 0;
  let total = healPrs.length;
  let masked = 0;
  const details = [];

  for (const p of healPrs) {
    // `files` is not always populated on list; fetch per-PR when needed
    let files = [];
    try {
      const detail = ghJson([
        'pr', 'view', String(p.number), '--repo', repo, '--json', 'files',
      ]);
      files = (detail.files || []).map((f) => f.path);
    } catch {
      files = [];
    }
    const onlyPom = files.length > 0 && files.every((f) => f.startsWith('pages/'));
    const touchedSpecs = files.some((f) => f.startsWith('tests/'));
    const body = p.body || '';
    const claimsUnchanged = /assertions?\s+unchanged|POM-only|spec assertions unchanged/i.test(body);
    // Positive weakening only — ignore "do not / never weaken assertions"
    const mentionsWeaken = /(loosen|weaken|relax).{0,40}assert/i.test(body)
      || /removed?\s+expect\(/i.test(body);
    const negatesWeaken = /(do not|don't|never|not)\s+(loosen|weaken|relax|remove)/i.test(body)
      || /do not weaken/i.test(body);
    const weakened = mentionsWeaken && !negatesWeaken;

    // Masked regression: heal green only by changing assertions / editing specs
    const isMasked = touchedSpecs || weakened;
    if (isMasked) masked += 1;

    const isClean = onlyPom && !isMasked;
    if (isClean) clean += 1;

    details.push({
      number: p.number,
      title: p.title,
      url: p.url,
      onlyPom,
      touchedSpecs,
      claimsUnchanged,
      clean: isClean,
      masked: isMasked,
    });
  }

  return { clean, total, masked, details };
}

function measureGenerationGate(repo) {
  const prs = ghJson([
    'pr', 'list', '--repo', repo, '--state', 'all', '--limit', '50',
    '--json', 'number,title,body,url,createdAt,headRefName,state,statusCheckRollup',
  ]);
  const genPrs = prs.filter((p) => {
    if (isHealPr(p)) return false;
    return /cursor\/ds-ticket|test\(DS-|tests-generated|test generation/i.test(`${p.headRefName} ${p.title} ${p.body}`)
      || (/DS-\d+/.test(p.title) && /coverage|Playwright|Gherkin|acceptance/i.test(p.body || ''));
  });

  let pass = 0;
  const details = [];
  for (const p of genPrs) {
    const body = p.body || '';
    const mapsToAc = /acceptance|Gherkin|DS-\d+|AC\b|feature/i.test(body);
    const conformingNote = /generation-gate|role-based|getByRole|conforming/i.test(body)
      || /features\/DS-/.test(body);
    const checks = p.statusCheckRollup || [];
    const e2e = checks.find((c) => /e2e|test/i.test(c.name || ''));
    const green = e2e ? e2e.conclusion === 'SUCCESS' : /→\s*\d+\s+passed|all passed|suite is green/i.test(body);
    const ok = Boolean(green && mapsToAc);
    // Conforming: prefer explicit evidence; treat feature+spec PR as intending gate
    const conforming = conformingNote || mapsToAc;
    if (ok && conforming) pass += 1;
    details.push({
      number: p.number,
      title: p.title,
      url: p.url,
      green: Boolean(green),
      mapsToAc,
      conforming,
      firstPrPass: ok && conforming,
      e2eConclusion: e2e?.conclusion ?? 'unknown',
    });
  }
  return { pass, total: genPrs.length, details };
}

function walkJsonl(dir, out = []) {
  if (!dir || !existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'subagents') continue;
      walkJsonl(p, out);
    } else if (name.endsWith('.jsonl')) {
      out.push(p);
    }
  }
  return out;
}

function measureAskVsGuess(transcriptsDir) {
  if (!transcriptsDir || !existsSync(transcriptsDir)) {
    return { available: false, askEvents: null, guessEvents: null, askSessions: null, guessSessions: null };
  }
  const askRe = /(which do you want\?|do you want (a |me to|to )|which option you prefer|please (confirm|provide|specify)|could you (confirm|clarify|specify|provide)|I('ll| will) need .{0,60}(from you|you to)|Sound good, or|before I (proceed|continue|write|create))/gi;
  const guessRe = /(I('ll| will) assume|assuming (that|the)|guessed (wrong |the )?|invent(ed)? (a |the |an )|I('ll| will) use .{0,50}(as a default|for now)|without (asking|confirmation)|made[- ]up .{0,30}(email|password|url|token|value))/gi;

  let askEvents = 0;
  let guessEvents = 0;
  const askSessions = new Set();
  const guessSessions = new Set();

  for (const file of walkJsonl(transcriptsDir)) {
    const sid = file.split(/[/\\]/).slice(-2, -1)[0];
    let blob = '';
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      if (obj.role !== 'assistant') continue;
      const content = obj.message?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c?.type === 'text') blob += `${c.text || ''}\n`;
        }
      } else if (typeof content === 'string') {
        blob += `${content}\n`;
      }
    }
    const a = [...blob.matchAll(askRe)].length;
    const g = [...blob.matchAll(guessRe)].length;
    if (a) { askEvents += a; askSessions.add(sid); }
    if (g) { guessEvents += g; guessSessions.add(sid); }
  }
  return {
    available: true,
    askEvents,
    guessEvents,
    askSessions: askSessions.size,
    guessSessions: guessSessions.size,
  };
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  return `${(n * 100).toFixed(2)}%`;
}

function ratio(a, b) {
  if (!b) return `${a}/0 (n/a)`;
  return `${a}/${b} (${pct(a / b)})`;
}

function topRisk(flake, heal, gen, ask) {
  const risks = [];
  if (gen.total > 0 && gen.pass / gen.total < 1) {
    risks.push({
      score: 3,
      risk: 'Generated specs are not green on the first PR (generation-gate pass rate < 100%).',
      action: 'Before opening the next ticket PR, run the full affected suite under CI-equivalent env and fix reds (or file bugs) so the first PR check is green + AC-mapped.',
    });
  }
  if (heal.masked > 0) {
    risks.push({
      score: 4,
      risk: `Masked regressions detected in heal PRs (count=${heal.masked}; must be 0).`,
      action: 'Revert any assertion/spec edits from heal PRs; re-heal POM-only and re-prove green with assertions unchanged.',
    });
  }
  if (flake.rate != null && flake.rate > 0.02) {
    risks.push({
      score: 2,
      risk: `Elevated flake rate (${pct(flake.rate)}) across last ${flake.n} E2E runs.`,
      action: 'Quarantine or harden the flaky titles listed above; prefer fixing shared state/timing over raising retries.',
    });
  }
  if (ask.available && ask.guessEvents > ask.askEvents) {
    risks.push({
      score: 2,
      risk: 'Agents invent values more often than they ask (ask-vs-guess inverted).',
      action: 'When a required value is missing (email, limit, AC detail), stop and ask — never invent credentials or acceptance numbers.',
    });
  }
  if (flake.total && flake.perRun.every((r) => (r.failed || 0) > 0)) {
    risks.push({
      score: 3,
      risk: 'E2E workflow has no recent fully-green run; retries mask some instability while known app failures keep CI red.',
      action: 'Drive the stable failure set (duplicate-name / double-click / a11y) to Jira or fix, so flake measurement is not drowned by permanent reds.',
    });
  }
  risks.sort((a, b) => b.score - a.score);
  return risks[0] || {
    risk: 'Insufficient history to rank a reliability risk.',
    action: 'Run Test Generation + E2E once, then regenerate this report.',
  };
}

function render({ repo, generatedAt, flake, heal, gen, ask }) {
  const risk = topRisk(flake, heal, gen, ask);
  const seenFlaky = new Set();
  const flakeExamples = flake.examples.length
    ? flake.examples
      .filter((e) => {
        const key = `${e.run}|${e.title}`;
        if (seenFlaky.has(key)) return false;
        seenFlaky.add(key);
        return true;
      })
      .map((e) => `- \`${e.title}\` (run [${e.run}](${e.url}))`)
      .join('\n')
    : '- (none in window)';

  const healLines = heal.details.length
    ? heal.details.map((d) =>
      `- [#${d.number}](${d.url}) — clean=${d.clean ? 'yes' : 'no'}; masked=${d.masked ? 'yes' : 'no'}; POM-only=${d.onlyPom ? 'yes' : 'no'}`,
    ).join('\n')
    : '- (no heal PRs found)';

  const genLines = gen.details.length
    ? gen.details.map((d) =>
      `- [#${d.number}](${d.url}) — first-PR pass=${d.firstPrPass ? 'yes' : 'no'}; E2E=${d.e2eConclusion}; maps-to-AC=${d.mapsToAc ? 'yes' : 'no'}`,
    ).join('\n')
    : '- (no generation PRs found)';

  const askBlock = ask.available
    ? `**Number:** asks **${ask.askEvents}** (across ${ask.askSessions} sessions) · guesses **${ask.guessEvents}** (across ${ask.guessSessions} sessions) · ratio ask:guess = **${ask.askEvents}:${ask.guessEvents}**

**How measured:** Regex scan of local Cursor agent transcripts under \`${TRANSCRIPTS_DIR}\` (assistant turns only). Ask = explicit clarify/confirm/prefer questions; guess = assume/invent/default-without-asking. Cursor has no built-in telemetry — session review only.

**What it tells us:** ${ask.guessEvents === 0 ? 'No invented-value events in the scanned sessions.' : 'At least one session invented a missing value instead of asking — treat that as a reliability smell for auth/config paths.'}`
    : `**Number:** n/a (transcripts not available in this environment)

**How measured:** Would scan Cursor agent transcripts locally; path missing here (\`EVAL_TRANSCRIPTS_DIR\` unset / not found). CI runners do not have IDE session history.

**What it tells us:** Regenerate this report from a local agent/orchestrator session to populate ask-vs-guess.`;

  return `# Suite reliability eval report

Generated: **${generatedAt}** · Repo: **${repo}** · Window: last **${flake.n}** parsed E2E runs (requested ${E2E_RUNS})

> Cursor has **no built-in telemetry** for flake / heal / generation-gate / ask-vs-guess. Numbers below were measured from GitHub Actions logs, PR history, and (when present) local agent transcripts via \`scripts/generate-eval-report.mjs\`.

## Flake rate

**Number:** **${flake.flakySum}** tests passed only on retry (Playwright \`flaky\`) / **${flake.total}** completed tests = **${pct(flake.rate)}**

**How measured:** \`gh run list --workflow=e2e.yml\` for the last ${E2E_RUNS} runs; downloaded each job log; parsed Playwright summary lines (\`N flaky\` / \`N failed\` / \`N passed\`). Flaky = failed initially, passed on retry (\`retries: 2\` on CI).

**What it tells us:** ${flake.flakySum === 0 ? 'No retry-only passes in the window — failures are deterministic, not masked by retries.' : 'Low but non-zero intermittent pass-on-retry; watch the titles below before raising retries further.'}

Flaky examples:
${flakeExamples}

## Heal success rate

**Number:** clean heals **${ratio(heal.clean, heal.total)}** · **masked regressions: ${heal.masked}** (must be **0**)

**How measured:** PR history (\`gh pr list\`) filtered to heal/drift repair PRs (\`heal/*\` branches or heal/drift titles). Clean = POM-only diff under \`pages/\` with no spec assertion edits. Masked = heal touched \`tests/**\` or described weakening assertions.

**What it tells us:** ${heal.masked === 0 ? 'Heals are not hiding regressions by loosening expects.' : 'Stop — a heal changed assertions/specs; that is a masked regression.'}

Heal PRs:
${healLines}

## Generation-gate pass rate

**Number:** **${ratio(gen.pass, gen.total)}** first PRs that were green + conforming + maps-to-AC

**How measured:** PR history for ticket/generation PRs (e.g. \`cursor/ds-ticket-*\`, \`test(DS-*)\`). Pass requires (1) E2E check SUCCESS on that PR **or** explicit green evidence in the body, (2) AC/Gherkin linkage in the PR body, (3) conforming intent (feature plan / role-based notes). Local \`generation-gate.sh\` is a write-time hook — this metric is **first-PR outcome**, not hook exit codes.

**What it tells us:** ${gen.total === 0 ? 'No generation PRs in history yet.' : gen.pass === gen.total ? 'Generated work lands reviewable and green on the first try.' : 'Generation opens PRs that still fail CI — gate conformance alone is not enough; prove green before/at PR open.'}

Generation PRs:
${genLines}

## Ask-vs-guess

${askBlock}

## Top reliability risk

${risk.risk}

## Next action

${risk.action}

---

*Regenerate after every Test Generation workflow finish and after any local agent/orchestrator run: \`npm run eval:report\` (or \`node scripts/generate-eval-report.mjs\`).*
`;
}

function main() {
  const repo = resolveRepo();
  const generatedAt = new Date().toISOString();
  console.error(`[eval-report] repo=${repo} e2e_runs=${E2E_RUNS}`);
  const flake = measureFlake(repo, E2E_RUNS);
  console.error(`[eval-report] flake ${flake.flakySum}/${flake.total} over ${flake.n} runs`);
  const heal = measureHeal(repo);
  console.error(`[eval-report] heal clean=${heal.clean}/${heal.total} masked=${heal.masked}`);
  const gen = measureGenerationGate(repo);
  console.error(`[eval-report] generation-gate ${gen.pass}/${gen.total}`);
  const ask = measureAskVsGuess(TRANSCRIPTS_DIR);
  console.error(`[eval-report] ask-vs-guess available=${ask.available} ask=${ask.askEvents} guess=${ask.guessEvents}`);
  const md = render({ repo, generatedAt, flake, heal, gen, ask });
  writeFileSync(OUT, md);
  console.error(`[eval-report] wrote ${OUT}`);
}

main();
