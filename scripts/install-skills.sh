#!/usr/bin/env bash
# Pull private shared skills for local AI tooling (not committed to this repo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${SKILLS_REPO:-jvchi/dev-skills}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Installing skills from ${REPO}"
if command -v gh >/dev/null 2>&1; then
  gh repo clone "$REPO" "$TMP/dev-skills" -- --depth 1
else
  git clone --depth 1 "https://github.com/${REPO}.git" "$TMP/dev-skills"
fi

if [ -x "$TMP/dev-skills/install.sh" ]; then
  bash "$TMP/dev-skills/install.sh" "$ROOT"
else
  mkdir -p "$ROOT/.agents/skills"
  cp -R "$TMP/dev-skills/skills/." "$ROOT/.agents/skills/"
  echo "✓ Copied to .agents/skills"
fi

