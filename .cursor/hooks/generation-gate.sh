#!/usr/bin/env bash
# Generation gate: afterFileEdit for specs under tests/**
# Exit 2 = BLOCK (no expect(, or CSS/XPath page.locator)

set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("file_path") or "")')

if [[ -z "$file_path" ]]; then
  echo "[generation-gate] no file_path in hook input; allowing" >&2
  exit 0
fi

# Enforce only for files under tests/ (hooks.json matcher is tool-type; path gate is here)
case "$file_path" in
  */tests/*|tests/*) ;;
  *)
    echo "[generation-gate] skip (not under tests/): $file_path" >&2
    exit 0
    ;;
esac

if [[ ! -f "$file_path" ]]; then
  echo "[generation-gate] file missing after edit: $file_path" >&2
  exit 2
fi

# Block: no assertion
if ! grep -q 'expect(' "$file_path"; then
  echo "[generation-gate] BLOCK: $file_path has no expect( — test asserts nothing" >&2
  exit 2
fi

# Block: CSS/XPath via page.locator('.', '#', or '//')
if python3 - "$file_path" <<'PY'
import re, sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
pat = re.compile(r"""page\.locator\s*\(\s*(['"`])(.*?)\1""", re.DOTALL)
for m in pat.finditer(text):
    arg = m.group(2)
    if "." in arg or "#" in arg or "//" in arg:
        print(arg, file=sys.stderr)
        sys.exit(0)
sys.exit(1)
PY
then
  echo "[generation-gate] BLOCK: $file_path uses CSS/XPath page.locator (., #, or //)" >&2
  exit 2
fi

echo "[generation-gate] ALLOW: $file_path" >&2
exit 0
