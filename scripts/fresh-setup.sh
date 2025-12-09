#!/bin/bash

# Fresh Setup Script
# Cleans, installs, builds, and prepares for testing

set -e  # Exit on error

echo "🧹 Fresh Setup Starting..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Cleanup
echo -e "${BLUE}Step 1: Cleaning up...${NC}"
rm -rf node_modules
rm -rf dist
rm -rf .vite
rm -rf server/node_modules
rm -rf server/dist
rm -rf .turbo
rm -rf .next
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

# Step 2: Install
echo -e "${BLUE}Step 2: Installing dependencies...${NC}"
pnpm install
echo -e "${GREEN}✅ Install complete${NC}"
echo ""

# Step 3: Build
echo -e "${BLUE}Step 3: Building...${NC}"
pnpm build
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 4: Type Check
echo -e "${BLUE}Step 4: Type checking...${NC}"
pnpm type-check
echo -e "${GREEN}✅ Type check complete${NC}"
echo ""

# Step 5: Summary
echo -e "${GREEN}✅ Fresh setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start servers:  pnpm dev:all"
echo "  2. Run E2E tests:  pnpm test:e2e:browser"
echo "  3. Check logs:     pnpm logs:local"
echo ""

