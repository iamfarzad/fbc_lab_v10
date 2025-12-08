#!/bin/bash

# Multimodal System Test Script
# Quick verification of multimodal integration

set -e

echo "🧪 Multimodal System Test"
echo "========================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if all key files exist
echo -e "${BLUE}📁 Step 1: Checking integration files...${NC}"
if [ -f "scripts/check-multimodal-integration.sh" ]; then
    ./scripts/check-multimodal-integration.sh
else
    echo -e "${RED}✗${NC} check-multimodal-integration.sh not found"
fi

echo ""
echo -e "${BLUE}🏥 Step 2: Checking backend health...${NC}"
BACKEND_URL="https://fb-consulting-websocket.fly.dev/health"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Backend is healthy (HTTP $HEALTH_RESPONSE)"
    curl -s "$BACKEND_URL"
    echo ""
else
    echo -e "${RED}✗${NC} Backend health check failed (HTTP $HEALTH_RESPONSE)"
    echo -e "${YELLOW}⚠${NC} Backend may be down or unreachable"
fi

echo ""
echo -e "${BLUE}🔌 Step 3: Checking WebSocket endpoint...${NC}"
WS_URL="wss://fb-consulting-websocket.fly.dev"
echo -e "${YELLOW}ℹ${NC} WebSocket endpoint: $WS_URL"
echo -e "${YELLOW}ℹ${NC} WebSocket testing requires browser or specialized tool"
echo -e "${YELLOW}ℹ${NC} Use browser Network tab (WS filter) to verify connection"

echo ""
echo -e "${BLUE}📋 Step 4: Manual Testing Checklist${NC}"
echo ""
echo "Open the app in your browser and test:"
echo ""
echo -e "${GREEN}Text Input:${NC}"
echo "  [ ] Send a text message"
echo "  [ ] Verify response appears"
echo "  [ ] Check Network tab for /api/chat/persist-message"
echo ""
echo -e "${GREEN}Voice:${NC}"
echo "  [ ] Click 'Start Voice' or microphone button"
echo "  [ ] Verify connection state changes to CONNECTED"
echo "  [ ] Speak and verify transcription appears"
echo "  [ ] Check Network tab (WS) for REALTIME_INPUT messages"
echo ""
echo -e "${GREEN}Webcam:${NC}"
echo "  [ ] Enable webcam (requires voice connection)"
echo "  [ ] Verify preview appears (top-right)"
echo "  [ ] Check console for: '[App] Webcam frame sent to Live API'"
echo "  [ ] Check Network tab (WS) for image/jpeg messages"
echo ""
echo -e "${GREEN}Screen Share:${NC}"
echo "  [ ] Enable screen share (requires voice connection)"
echo "  [ ] Verify preview appears (top-right)"
echo "  [ ] Check console for: '📺 Screen frame streamed to Live API'"
echo "  [ ] Wait ~4 seconds for analysis"
echo "  [ ] Check console for: '[App] Screen share analysis: ...'"
echo "  [ ] Check Network tab (WS) for CONTEXT_UPDATE messages"
echo ""

echo -e "${BLUE}📊 Step 5: Backend Log Monitoring${NC}"
echo ""
echo "To monitor backend logs, run in another terminal:"
echo -e "${YELLOW}  fly logs --app fb-consulting-websocket --follow${NC}"
echo ""
echo "Or check specific message types:"
echo -e "${YELLOW}  fly logs --app fb-consulting-websocket | grep REALTIME_INPUT${NC}"
echo -e "${YELLOW}  fly logs --app fb-consulting-websocket | grep CONTEXT_UPDATE${NC}"
echo ""

echo -e "${BLUE}✅ Testing Complete${NC}"
echo ""
echo "For detailed testing procedures, see:"
echo "  docs/MULTIMODAL_TESTING_GUIDE.md"
echo ""

