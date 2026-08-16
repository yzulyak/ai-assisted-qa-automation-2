#!/bin/bash
# Assert / WONT guard: afterFileEdit for tests/** and pages/**
# Matcher in hooks.json is tool type (Write); path filter is here via file_path.
# Exit 2 = BLOCK

set -euo pipefail

export ASSERT_GUARD_INPUT
ASSERT_GUARD_INPUT=$(cat)

python3 <<'PY'
import json, os, re, sys
from pathlib import Path

payload = json.loads(os.environ.get("ASSERT_GUARD_INPUT") or "{}")
file_path = payload.get("file_path") or ""

if not file_path:
    print("[assert-guard] no file_path in hook input; allowing", file=sys.stderr)
    sys.exit(0)

normalized = file_path.replace("\\", "/")
under_tests = normalized.startswith("tests/") or "/tests/" in normalized
under_pages = normalized.startswith("pages/") or "/pages/" in normalized
if not (under_tests or under_pages):
    print(f"[assert-guard] skip (not under tests/ or pages/): {file_path}", file=sys.stderr)
    sys.exit(0)

edits = payload.get("edits") or []


def strip_comments(text: str) -> str:
    """Strip // and /* */ comments without touching // inside string literals."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    out: list[str] = []
    for line in text.splitlines(keepends=True):
        in_str = None
        i = 0
        while i < len(line):
            c = line[i]
            if in_str:
                if c == "\\" and i + 1 < len(line):
                    i += 2
                    continue
                if c == in_str:
                    in_str = None
                i += 1
                continue
            if c in "'\"`":
                in_str = c
                i += 1
                continue
            if c == "/" and i + 1 < len(line) and line[i + 1] == "/":
                line = line[:i] + ("\n" if line.endswith("\n") else "")
                break
            i += 1
        out.append(line)
    return "".join(out)


def count_active_expects(text: str) -> int:
    return len(re.findall(r"expect\s*\(", strip_comments(text)))


def count_raw_expects(text: str) -> int:
    return len(re.findall(r"expect\s*\(", text))


def commented_out_expects(old: str, new: str) -> bool:
    """True when an active expect( in old appears only inside a comment in new."""
    old_active = count_active_expects(old)
    new_active = count_active_expects(new)
    if new_active >= old_active:
        return False
    if count_raw_expects(new) >= count_raw_expects(old) and count_raw_expects(new) > new_active:
        return True
    old_lines = {
        ln.strip()
        for ln in old.splitlines()
        if re.search(r"expect\s*\(", ln) and not re.match(r"^\s*//", ln)
    }
    for ln in new.splitlines():
        stripped = ln.strip()
        if not re.match(r"^//", stripped):
            continue
        body = re.sub(r"^//\s*", "", stripped)
        if re.search(r"expect\s*\(", body) and any(body in ol or ol in body for ol in old_lines):
            return True
    return False


def load_content() -> str:
    path = Path(file_path)
    if path.is_file():
        return path.read_text(encoding="utf-8", errors="replace")
    return "\n".join((e.get("new_string") or "") for e in edits)


content = load_content()
active = strip_comments(content)

# --- WONT: waitForTimeout ---
if re.search(r"\bwaitForTimeout\s*\(", active):
    print(
        f"[assert-guard] BLOCK: {file_path} uses waitForTimeout (use web-first expect waits)",
        file=sys.stderr,
    )
    sys.exit(2)

# --- WONT: XPath locators ---
xpath_hits = []
for m in re.finditer(
    r"""(?:page|this\.page|\w+)\.locator\s*\(\s*(['"`])(.*?)\1""",
    active,
    flags=re.DOTALL,
):
    arg = m.group(2).strip()
    if arg.startswith("//") or arg.startswith("xpath=") or "//" in arg:
        xpath_hits.append(arg[:80])
if re.search(r"""['"`]xpath\s*=""", active):
    xpath_hits.append("xpath=…")
if xpath_hits:
    print(
        f"[assert-guard] BLOCK: {file_path} uses XPath locator: {xpath_hits[0]!r}",
        file=sys.stderr,
    )
    sys.exit(2)

# --- WONT: TypeScript any ---
any_pat = re.compile(
    r"""(?x)
    (?::\s*any\b)
    |(?:\bas\s+any\b)
    |(?:<\s*any\s*>)
    |(?:\bany\s*\[\])
    |(?:\bPromise\s*<\s*any\s*>)
    |(?:\bArray\s*<\s*any\s*>)
    |(?:\bRecord\s*<[^>]*,\s*any\s*>)
    """
)
if any_pat.search(active):
    print(
        f"[assert-guard] BLOCK: {file_path} uses the any type (type the value properly)",
        file=sys.stderr,
    )
    sys.exit(2)

# --- WONT: hardcoded credentials / secrets ---
cred_pats = [
    (
        "Bearer token",
        re.compile(
            r"""(['"`])Bearer\s+[A-Za-z0-9_\-.=+/]{8,}\1""",
            re.IGNORECASE,
        ),
    ),
    (
        "password/secret literal",
        re.compile(
            r"""(?i)\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*(['"`])(?!process\.env)(?!import\.meta\.env)[^'"`\n]{4,}\2"""
        ),
    ),
    (
        "Authorization header literal",
        re.compile(
            r"""(?i)Authorization\s*[:=]\s*(['"`])(?!process\.env)[^'"`\n]{8,}\1"""
        ),
    ),
]
for label, pat in cred_pats:
    if pat.search(active):
        print(
            f"[assert-guard] BLOCK: {file_path} has hardcoded credential ({label})",
            file=sys.stderr,
        )
        sys.exit(2)

# --- WONT: tag on test.describe() ---
describe_tag = re.compile(
    r"""test\.describe(?:\.\w+)?\s*\(\s*(?:['"`][^'"`]*['"`]\s*,\s*)?\{[^}]*\btag\b""",
    re.DOTALL,
)
if describe_tag.search(active):
    print(
        f"[assert-guard] BLOCK: {file_path} puts a tag on test.describe() "
        "(tags belong on individual test() only)",
        file=sys.stderr,
    )
    sys.exit(2)

# --- WONT: removed / weakened expect( (edit hunk comparison) ---
if edits:
    old_active = 0
    new_active = 0
    commented = False
    for edit in edits:
        old = edit.get("old_string") or ""
        new = edit.get("new_string") or ""
        old_active += count_active_expects(old)
        new_active += count_active_expects(new)
        if commented_out_expects(old, new):
            commented = True

    if new_active < old_active:
        print(
            f"[assert-guard] BLOCK: {file_path} weakened assertions "
            f"(active expect( {old_active} → {new_active})",
            file=sys.stderr,
        )
        sys.exit(2)

    if commented:
        print(
            f"[assert-guard] BLOCK: {file_path} commented out an expect(",
            file=sys.stderr,
        )
        sys.exit(2)

    print(
        f"[assert-guard] ALLOW: {file_path} (active expect( {old_active} → {new_active})",
        file=sys.stderr,
    )
else:
    print(
        f"[assert-guard] ALLOW: {file_path} (no edits payload; static WONT clean)",
        file=sys.stderr,
    )

sys.exit(0)
PY
