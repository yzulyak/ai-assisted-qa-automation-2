#!/usr/bin/env bash
# After agent stop: if this session looked like QA orchestration / agents,
# follow up once so eval-report.md is regenerated.
# Exit 0 always (fail open). loop_limit on the hook prevents infinite loops.

set -euo pipefail

input=$(cat)

# Only follow up when the session status is completed (not aborted)
status=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status") or "")' 2>/dev/null || true)
if [[ "$status" != "completed" ]]; then
  echo '{}'
  exit 0
fi

# Detect orchestration / agent work from the last assistant message / loop context
# Hook payload fields vary; scan the raw JSON for known markers.
if printf '%s' "$input" | python3 -c '
import json, sys, re
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except Exception:
    data = {}
blob = raw.lower()
markers = [
    "qa-orchestration",
    "test-writer",
    "self-heal",
    "bug-reporter",
    "jira-ticket-to-gherkin",
    "explore-and-generate",
    "backlog mode",
    "npx playwright test",
    "test-generation",
    "eval-report",
    "heal on red",
]
# Avoid re-triggering solely because we just wrote the eval report
if "generate-eval-report" in blob or "npm run eval:report" in blob:
    # Still allow if other markers dominate; only skip pure eval-report sessions
    other = [m for m in markers if m != "eval-report" and m in blob]
    if not other:
        sys.exit(1)
hit = any(m in blob for m in markers)
sys.exit(0 if hit else 1)
'; then
  cat <<'EOF'
{
  "followup_message": "Regenerate the suite reliability report now per .cursor/skills/eval-report/SKILL.md: run `npm run eval:report` (or `node scripts/generate-eval-report.mjs`) and leave eval-report.md updated. Do not ask whether to run it."
}
EOF
else
  echo '{}'
fi

exit 0
