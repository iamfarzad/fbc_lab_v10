#!/bin/bash
set -e

echo "🔧 Starting ESLint cleanup..."

echo ""
echo "Phase 1: Auto-fix"
pnpm lint:fix

echo ""
echo "Phase 2: Floating promises"
node scripts/fix-floating-promises.js

echo ""
echo "Phase 3: Require-await"
node scripts/fix-require-await.js

echo ""
echo "Phase 4: Unescaped entities"
node scripts/fix-unescaped-entities.js

echo ""
echo "Phase 6: Misused promises"
node scripts/fix-misused-promises.js

echo ""
echo "Phase 7: Console.log"
node scripts/fix-console-logs.js

echo ""
echo "✅ Done! Checking results..."
ERROR_COUNT=$(pnpm lint 2>&1 | grep -c "error" || echo "0")
echo "Errors remaining: $ERROR_COUNT"

