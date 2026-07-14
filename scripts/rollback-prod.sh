#!/usr/bin/env bash
# Roll back working tree to a commit and redeploy (preserves DB volumes).
# Does NOT force-push to origin — that is intentionally left to a human.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -z "${1:-}" ]; then
  echo "Usage: ./scripts/rollback-prod.sh <commit-hash>"
  echo ""
  echo "Recent commits:"
  git log --oneline -10
  exit 1
fi

TARGET_COMMIT="$1"

echo "Rolling back working tree to: $TARGET_COMMIT"
git rev-parse --verify "$TARGET_COMMIT^{commit}" >/dev/null
git checkout "$TARGET_COMMIT" -- .

echo "Redeploying from $TARGET_COMMIT (volumes preserved)..."
./scripts/deploy-prod.sh --no-cache

echo ""
echo "Rollback deploy complete."
echo "Working tree files match $TARGET_COMMIT; commit/push separately if you want git history updated."
echo "Current HEAD: $(git rev-parse --short HEAD)"
