#!/bin/bash

# Script to verify Vercel environment variables
# This script helps verify that required env vars are set in Vercel

echo "=========================================="
echo "Vercel Environment Variables Verification"
echo "=========================================="
echo ""

# Check if .vercel/project.json exists
if [ ! -f .vercel/project.json ]; then
    echo "❌ Error: .vercel/project.json not found"
    echo "   Run: vercel link (or npx vercel link)"
    exit 1
fi

PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)

echo "📋 Project Info:"
echo "   Project ID: $PROJECT_ID"
echo "   Org ID: $ORG_ID"
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null && ! command -v npx &> /dev/null; then
    echo "⚠️  Vercel CLI not found in PATH"
    echo ""
    echo "📝 Manual Verification Steps:"
    echo "   1. Go to: https://vercel.com/dashboard"
    echo "   2. Select project: fbc_lab_v10"
    echo "   3. Go to: Settings → Environment Variables"
    echo "   4. Verify these variables are set for PRODUCTION:"
    echo ""
    echo "   Required Variables:"
    echo "   ✅ NEXT_PUBLIC_SUPABASE_URL"
    echo "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   ✅ SUPABASE_SERVICE_ROLE_KEY"
    echo "   ✅ GEMINI_API_KEY"
    echo ""
    echo "   Optional but recommended:"
    echo "   ⚪ NEXT_PUBLIC_LIVE_SERVER_URL"
    echo "   ⚪ GOOGLE_APPLICATION_CREDENTIALS"
    echo ""
    exit 0
fi

echo "🔍 Checking environment variables..."
echo ""

# Try to list env vars using vercel CLI
if command -v vercel &> /dev/null; then
    vercel env ls 2>&1 | grep -E "NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE|GEMINI_API" || echo "⚠️  Could not retrieve env vars via CLI"
elif command -v npx &> /dev/null; then
    npx vercel env ls 2>&1 | grep -E "NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE|GEMINI_API" || echo "⚠️  Could not retrieve env vars via CLI"
fi

echo ""
echo "📋 Local .env.local comparison:"
if [ -f .env.local ]; then
    echo "   ✅ .env.local exists"
    echo ""
    echo "   Variables in .env.local:"
    grep -E "^NEXT_PUBLIC_SUPABASE|^SUPABASE_SERVICE|^GEMINI_API" .env.local | sed 's/=.*/=***HIDDEN***/' || echo "   ⚠️  No matching variables found"
else
    echo "   ❌ .env.local not found"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "1. Compare Vercel Dashboard env vars with .env.local"
echo "2. Ensure all required vars are set for PRODUCTION environment"
echo "3. Redeploy if variables were added/updated"
echo "=========================================="

