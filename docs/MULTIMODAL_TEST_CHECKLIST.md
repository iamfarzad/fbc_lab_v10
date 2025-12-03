# Multimodal Integration Test Checklist

**Purpose:** Manual verification of all 6 multimodal scenarios to ensure the system works across every modality before production deployment.

**Status:** ⏳ Pending Verification

---

## Prerequisites

- [ ] Development server running (`pnpm dev` or `pnpm dev:api:local`)
- [ ] Frontend accessible at `http://localhost:3000` (or configured URL)
- [ ] All environment variables configured
- [ ] Test files ready (Excel/CSV file, test URL)

---

## Test Scenarios

### ✅ Scenario 1: Text + File Upload

**Test Steps:**
1. Open chat interface
2. Type message: "Here's our budget"
3. Upload an Excel/CSV file with budget data (e.g., `budget.xlsx` with $150K, $200K values)
4. Send message

**Expected Result:**
- [ ] Agent response mentions specific numbers from the file (e.g., "$150K", "$200K")
- [ ] Agent references the file/spreadsheet
- [ ] Response shows agent analyzed file content

**Verification:**
- [ ] Check response contains budget numbers from file
- [ ] Check response mentions "spreadsheet", "file", or "budget"
- [ ] Verify `MultimodalContextManager` stored upload context

**Pass/Fail:** ☐ Pass  ☐ Fail

**Notes:**
```
[Record any issues or observations here]
```

---

### ✅ Scenario 2: Voice + Screen Share

**Test Steps:**
1. Start voice call (if available) OR simulate with text transcript
2. Enable screen share
3. Share a dashboard or visual content
4. Say (or type): "Can you see this?"

**Expected Result:**
- [ ] Agent response says "Yes, I see..." or references specific visual elements
- [ ] Agent mentions dashboard, charts, or visual content
- [ ] Response shows agent analyzed screen content

**Verification:**
- [ ] Check response contains visual references
- [ ] Check response mentions "dashboard", "screen", or "visual"
- [ ] Verify screen analysis was stored in `MultimodalContextManager`

**Pass/Fail:** ☐ Pass  ☐ Fail

**Notes:**
```
[Record any issues or observations here]
```

---

### ✅ Scenario 3: Webcam + Text

**Test Steps:**
1. Enable webcam
2. Show face/environment to camera
3. Type message: "What do you think?"

**Expected Result:**
- [ ] Agent response references visual context (e.g., "I can see you're in an office...")
- [ ] Agent mentions environment, setup, or visual details
- [ ] Response shows agent analyzed webcam feed

**Verification:**
- [ ] Check response contains visual context references
- [ ] Check response mentions "office", "monitor", "environment", or similar
- [ ] Verify webcam analysis was stored

**Pass/Fail:** ☐ Pass  ☐ Fail

**Notes:**
```
[Record any issues or observations here]
```

---

### ✅ Scenario 4: URL Drop

**Test Steps:**
1. Type message: "This is our product: https://farzadbayat.com" (or any real URL)
2. Send message

**Expected Result:**
- [ ] Agent response shows it analyzed the webpage
- [ ] Agent mentions specific content from the page
- [ ] Response contains insights about the URL/page

**Verification:**
- [ ] Check response mentions "page", "website", "site", or URL
- [ ] Check response contains specific insights from the page
- [ ] Verify URL analysis was performed (check logs)

**Pass/Fail:** ☐ Pass  ☐ Fail

**Notes:**
```
[Record any issues or observations here]
```

---

### ✅ Scenario 5: Mixed Chaos (All Modalities)

**Test Steps:**
1. In one conversation session:
   - Upload a file
   - Share screen
   - Enable webcam
   - Paste a URL
   - Send voice/text messages
2. Send final message: "So what do you think overall?"

**Expected Result:**
- [ ] Agent response references multiple modalities
- [ ] Agent mentions file, screen, webcam, and/or URL
- [ ] Response shows comprehensive context awareness

**Verification:**
- [ ] Check response references at least 2 different modalities
- [ ] Check response is comprehensive and contextual
- [ ] Verify all modalities were stored in context

**Pass/Fail:** ☐ Pass  ☐ Fail

**Notes:**
```
[Record any issues or observations here]
```

---

### ✅ Scenario 6: Reload Test (Context Persistence)

**Test Steps:**
1. Start a conversation
2. Send 3-4 messages establishing context
3. Note the current stage (DISCOVERY, QUALIFIED, PITCHING, etc.)
4. Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
5. Continue the conversation

**Expected Result:**
- [ ] Conversation history is preserved
- [ ] Stage persists (doesn't reset to DISCOVERY)
- [ ] Multimodal context (uploads, screen shares) is remembered
- [ ] Agent continues naturally from where you left off

**Verification:**
- [ ] Check conversation history is intact
- [ ] Check stage matches pre-reload stage (or advanced correctly)
- [ ] Check multimodal context is available
- [ ] Verify Supabase stored stage correctly

**Pass/Fail:** ☐ Pass  ☐ Fail

**Notes:**
```
[Record any issues or observations here]
```

---

## Final Verification

### Context Manager Check

- [ ] `MultimodalContextManager` stores all file uploads
- [ ] `MultimodalContextManager` stores all screen/webcam analyses
- [ ] `MultimodalContextManager` stores URL context
- [ ] Context flows to all agents (discovery, pitch, objection)

### Agent Integration Check

- [ ] Discovery agent references multimodal context
- [ ] Pitch agent references multimodal context
- [ ] Objection agent can access context if needed
- [ ] All agents see the same multimodal data

### Stage Persistence Check

- [ ] Stage persists in Supabase `conversations` table
- [ ] Stage survives page reload
- [ ] Stage advances correctly through funnel

---

## Test Results Summary

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Text + File Upload | ☐ Pass ☐ Fail | |
| 2. Voice + Screen Share | ☐ Pass ☐ Fail | |
| 3. Webcam + Text | ☐ Pass ☐ Fail | |
| 4. URL Drop | ☐ Pass ☐ Fail | |
| 5. Mixed Chaos | ☐ Pass ☐ Fail | |
| 6. Reload Test | ☐ Pass ☐ Fail | |

**Overall Status:** ☐ All Pass  ☐ Some Fail

---

## Next Steps

- [ ] If all tests pass: Mark as "Multimodal verified" and proceed to deployment
- [ ] If any tests fail: Document issues, fix, and re-test
- [ ] Run automated test script: `tsx scripts/multimodal-integration-test.ts`
- [ ] Compare automated vs manual results

---

**Last Updated:** [Date]
**Tested By:** [Name]
**Status:** ⏳ Pending / ✅ Verified / ❌ Failed

