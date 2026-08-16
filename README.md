# AI-assisted QA automation

Playwright end-to-end tests for [Didaxis Studio](https://test.didaxis.studio), plus Cursor agents and skills that turn Jira tickets into Gherkin plans and Playwright specs.

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
git clone <repo-url>
cd ai-assisted-qa-automation-2
npm ci
npx playwright install --with-deps chromium
```

## Configure env

```bash
cp .env.example .env
```

Edit `.env` with real values. Never commit `.env`.

| Section | Vars | Needed for |
|---|---|---|
| **Run tests** | `DIDAXIS_URL`, `DIDAXIS_EMAIL`, `DIDAXIS_PASSWORD`, `DIDAXIS_API_TOKEN` | `npx playwright test` |
| Optional | `DIDAXIS_ALT_EMAIL`, `DIDAXIS_ALT_PASSWORD` | Permission / non-admin probes |
| **Agent / CI** | `CURSOR_API_KEY`, `ATLASSIAN_API_TOKEN`, `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL` | Headless agent in `.github/workflows/test-generation.yml`; Atlassian MCP tokens also go in Cursor settings |

## Run tests

```bash
npx playwright test
```

Other scripts: `npm run test:ui`, `npm run test:headed`, `npm run test:debug`, `npm run report`.

### Tagged slices

Each test carries exactly one tag: `@smoke`, `@sanity`, `@regression`, `@api`, `@e2e`, or `@destructive`.

```bash
npm run test:smoke
npm run test:sanity
npm run test:regression
npm run test:api
npm run test:e2e
npm run test:destructive   # --workers=1 (shared/global state only)
```

## Cursor agents & skills

This repo’s `.cursor/` folder wires the QA loop:

| Path | Role |
|---|---|
| `.cursor/rules/` | Always-on policy (`constitution`, `qa-orchestration`, `playwright-conventions`) |
| `.cursor/agents/` | Subagents: `test-writer`, `triage`, `bug-reporter` |
| `.cursor/skills/` | Skills such as `jira-ticket-to-gherkin`, `self-heal`, `pom-conventions` |

**Local Cursor** — open the project in Cursor; rules and skills load automatically. Configure Atlassian MCP (and any other MCP servers) in Cursor settings with the same Atlassian credentials as in `.env` when you want ticket lookup / bug filing from chat.

**CI / headless** — `.github/workflows/test-generation.yml` installs the Cursor CLI and runs `agent` with `CURSOR_API_KEY` plus Atlassian env vars for Jira REST (MCP OAuth is unavailable in Actions). Those secrets live in the GitHub `dev1` environment; they are not required to run Playwright locally.

## Reliability eval report

After Test Generation (CI) or any local agent/orchestrator run, refresh `eval-report.md`:

```bash
npm run eval:report
```

It measures flake rate, heal success (masked regressions must be 0), generation-gate first-PR pass rate, and ask-vs-guess from CI logs / PR history / local transcripts — Cursor has no built-in telemetry for these.
