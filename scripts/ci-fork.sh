#!/usr/bin/env bash
#
# ci-fork.sh — local gate for the omnisurge OpenCLI fork.
#   bash scripts/ci-fork.sh           # fast: typecheck + docs + unit
#   bash scripts/ci-fork.sh --docs    # docs only
#   bash scripts/ci-fork.sh --full    # release: build + manifest + convention gates + npm test projects
#
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

mode="fast"
case "${1:-}" in
  --docs) mode="docs" ;;
  --full) mode="full" ;;
  "") ;;
  *) echo "usage: bash scripts/ci-fork.sh [--docs|--full]" >&2; exit 2 ;;
esac

step() { printf '\n==> %s\n' "$*"; }
run() { step "$*"; "$@"; }

if [[ "$mode" != "docs" ]]; then
  run npx tsc --noEmit
fi

run npm run check:docs

if [[ "$mode" == "docs" ]]; then
  echo "fork gate: docs OK"
  exit 0
fi

if [[ "$mode" == "full" ]]; then
  run npm run build
  step "verify cli-manifest.json is committed and current"
  if ! git diff --exit-code HEAD -- cli-manifest.json; then
    echo "ERROR: cli-manifest.json changed after build; rebuild and commit it." >&2
    exit 1
  fi
  run npm run check:silent-column-drop
  run npm run check:typed-error-lint
  run npm test
else
  run npx vitest run --project unit
fi

echo "fork gate: ${mode} OK"
