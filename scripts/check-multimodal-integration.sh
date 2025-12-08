#!/bin/bash

# Multimodal Integration Diagnostic Script
# Checks for common breakage patterns in the multimodal system

set -e

echo "🔍 Multimodal Integration Diagnostic"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if files exist
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing"
        return 1
    fi
}

# Check for pattern in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description found in $file"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $description NOT found in $file"
        return 1
    fi
}

# Check for missing callback
check_missing_callback() {
    local file=$1
    local hook=$2
    local callback=$3
    
    if grep -A 20 "$hook" "$file" | grep -q "$callback"; then
        echo -e "${GREEN}✓${NC} $callback provided to $hook in $file"
        return 0
    else
        echo -e "${RED}✗${NC} $callback MISSING from $hook in $file"
        return 1
    fi
}

echo "📁 Checking key files..."
echo ""

# Core files
check_file "App.tsx"
check_file "components/MultimodalChat.tsx"
check_file "services/geminiLiveService.ts"
check_file "src/hooks/media/useScreenShare.ts"
check_file "src/hooks/media/useCamera.ts"
check_file "src/hooks/voice/useVoice.ts"

echo ""
echo "🔗 Checking integration points..."
echo ""

# Check App.tsx integration
if [ -f "App.tsx" ]; then
    echo "Checking App.tsx:"
    
    check_pattern "App.tsx" "liveServiceRef" "liveServiceRef defined"
    check_pattern "App.tsx" "handleSendVideoFrame" "handleSendVideoFrame callback"
    check_pattern "App.tsx" "useScreenShare" "useScreenShare hook used"
    
    # Check if sendRealtimeInput is passed to useScreenShare
    if grep -A 10 "useScreenShare" "App.tsx" | grep -q "sendRealtimeInput"; then
        echo -e "${GREEN}✓${NC} sendRealtimeInput provided to useScreenShare"
    else
        echo -e "${RED}✗${NC} sendRealtimeInput MISSING from useScreenShare"
    fi
    
    if grep -A 10 "useScreenShare" "App.tsx" | grep -q "sendContextUpdate"; then
        echo -e "${GREEN}✓${NC} sendContextUpdate provided to useScreenShare"
    else
        echo -e "${YELLOW}⚠${NC} sendContextUpdate MISSING from useScreenShare"
    fi
    
    echo ""
fi

# Check MultimodalChat props
if [ -f "components/MultimodalChat.tsx" ]; then
    echo "Checking MultimodalChat.tsx:"
    
    check_pattern "components/MultimodalChat.tsx" "onSendVideoFrame" "onSendVideoFrame prop"
    check_pattern "components/MultimodalChat.tsx" "WebcamPreview" "WebcamPreview component"
    check_pattern "components/MultimodalChat.tsx" "ScreenSharePreview" "ScreenSharePreview component"
    echo ""
fi

# Check service methods
if [ -f "services/geminiLiveService.ts" ]; then
    echo "Checking geminiLiveService.ts:"
    
    check_pattern "services/geminiLiveService.ts" "sendRealtimeMedia" "sendRealtimeMedia method"
    check_pattern "services/geminiLiveService.ts" "getConnectionId" "getConnectionId method"
    echo ""
fi

# Check hooks
if [ -f "src/hooks/media/useScreenShare.ts" ]; then
    echo "Checking useScreenShare hook:"
    
    check_pattern "src/hooks/media/useScreenShare.ts" "sendRealtimeInput" "sendRealtimeInput usage"
    check_pattern "src/hooks/media/useScreenShare.ts" "sendContextUpdate" "sendContextUpdate usage"
    echo ""
fi

echo "📊 Summary:"
echo "Run this script after making changes to verify multimodal integration."
echo "For detailed investigation, see: docs/MULTIMODAL_BREAKAGE_INVESTIGATION.md"
echo ""

