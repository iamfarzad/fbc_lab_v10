#!/bin/bash

# Pre-Deployment Check Script
# Runs all checks before deploying to Fly.io and Vercel

set -e  # Exit on error

echo "🔍 Pre-Deployment Check Starting..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to check command
check() {
    local name=$1
    local command=$2
    
    echo -n "Checking $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to check command with output
check_verbose() {
    local name=$1
    local command=$2
    
    echo "Checking $name..."
    if eval "$command"; then
        echo -e "${GREEN}✅ $name PASSED${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ $name FAILED${NC}"
        echo ""
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

echo "=== Phase 1: Static Analysis ==="
check "Type Check" "pnpm type-check"
check "Lint Check" "pnpm lint"

echo ""
echo "=== Phase 2: Build Verification ==="
check_verbose "Frontend Build" "pnpm build"
check "Server Build" "pnpm build:server"

echo ""
echo "=== Phase 3: Git Status ==="
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Uncommitted changes detected${NC}"
    echo "Current changes:"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Commit changes first."
        exit 1
    fi
else
    echo -e "${GREEN}✅ Git is clean${NC}"
fi

echo ""
echo "=== Phase 4: Environment Check ==="
if [ -z "$GEMINI_API_KEY" ] && [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  WARNING: GEMINI_API_KEY not set${NC}"
    echo "Make sure it's set in Fly.io and Vercel"
else
    echo -e "${GREEN}✅ Environment check passed${NC}"
fi

echo ""
echo "=== Summary ==="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to deploy.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy to Fly.io:  fly deploy"
    echo "  2. Deploy to Vercel:   vercel --prod"
    exit 0
else
    echo -e "${RED}❌ $FAILURES check(s) failed. Fix issues before deploying.${NC}"
    exit 1
fi

