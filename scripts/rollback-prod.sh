#!/bin/bash
# Production Rollback Script for Schemory
# Reverts to previous working commit

if [ -z "$1" ]; then
    echo "Usage: ./scripts/rollback-prod.sh <commit-hash>"
    echo ""
    echo "To find commit hash, run: git log --oneline -5"
    exit 1
fi

TARGET_COMMIT=$1

echo "🔙 Rolling back to commit: $TARGET_COMMIT"

# Reset to target commit
git reset --hard $TARGET_COMMIT

# Force push (CAUTION: This rewrites history)
echo "📤 Force pushing to origin/main..."
git push origin main --force

# Redeploy
echo "🚀 Redeploying..."
./scripts/deploy-prod.sh

echo ""
echo "✅ Rollback to $TARGET_COMMIT complete!"
echo "Current commit: $(git rev-parse HEAD)"
