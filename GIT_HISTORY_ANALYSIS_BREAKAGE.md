# Git History Analysis: Feature Breakage Points

**Date:** 2025-12-08  
**Analysis:** Identifying where webcam, voice, PDF email, and screen share features broke

---

## 🔴 Critical Issues Found

### 1. Webcam Image Analysis Failure

**Broken in:** `a172b1a` (Wed Dec 3, 2025) - "feat: 7-day sprint complete + production deployment prep"

**Root Cause:**
- **API Route Issue:** `api/tools/webcam.ts` uses `bodyParser: false` but tries to parse `req.body as string` with `JSON.parse()`
- **Problem:** Vercel's `VercelRequest` doesn't expose `req.body` as a string when bodyParser is disabled - you need to read the stream manually
- **Current Code (Lines 51-57):**
  ```typescript
  // Manually parse JSON body since bodyParser is disabled
  let body: { image?: string; prompt?: string };
  try {
    body = JSON.parse(req.body as string) as { image?: string; prompt?: string };
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  ```
- **Router Fallback Issue:** `src/lib/services/router-helpers.ts:routeImageAnalysis()` is a stub that returns mock data, causing the router path to always fail

**Commits:**
- `a172b1a` - Changed from `formidable` (FormData) to JSON parsing but didn't properly handle Vercel Request API
- `ae456fc` - Attempted fix for "build errors in webcam API route" but didn't address body parsing
- `2b9bfa6` - Added `.js` extensions (not related to breakage)

**Fix Needed:**
```typescript
// Read body stream manually for Vercel when bodyParser is false
import { getRawBody } from '@vercel/node';

const rawBody = await getRawBody(req);
const body = JSON.parse(rawBody.toString()) as { image?: string; prompt?: string };
```

OR use `@vercel/node`'s built-in body parsing by removing `bodyParser: false` and accessing `req.body` directly.

---

### 2. Voice Connection Drops Frequently

**Broken in:** `6146eaf` (Mon Dec 8, 2025) - "feat: AudioWorklet migration, webcam fixes, and UX improvements"

**Root Causes:**
1. **AudioWorklet Migration Issue:**
   - Migrated from `ScriptProcessorNode` (deprecated) to `AudioWorkletNode`
   - Added fallback try/catch but fallback doesn't actually create ScriptProcessorNode
   - **Current Code (services/geminiLiveService.ts:324-330):**
     ```typescript
     try {
       await this.inputAudioContext.audioWorklet.addModule('/audio-processor.js');
     } catch (e) {
       console.error('Failed to load audio worklet, falling back to ScriptProcessor', e);
       // Fallback or error handling could go here, but for now we assume it works
     }
     this.processor = new AudioWorkletNode(this.inputAudioContext, 'audio-recorder-worklet');
     ```
   - **Problem:** If AudioWorklet fails to load, it still tries to create `AudioWorkletNode`, causing crashes

2. **Session Start Timeout Changes (Commit 07a0353):**
   - Changed timeout from 15s to 20s and made it non-fatal (warning only)
   - Added fallback `setup_complete` listener
   - **Potential Issue:** Session might connect but not properly signal readiness, causing audio to not send

**Commits:**
- `6146eaf` - AudioWorklet migration with incomplete fallback
- `07a0353` - Session timeout handling changes (may mask real connection issues)
- `9a4906f` - "prevent voice connection loop caused by handleConnect dependency" (indicates connection loop issues)

**Fix Needed:**
1. Implement proper ScriptProcessorNode fallback in AudioWorklet catch block
2. Verify `audio-processor.js` is accessible and loads correctly
3. Add connection health monitoring/reconnection logic

---

### 3. PDF Email Fails (Download Works)

**Broken in:** `5866acb` (Thu Dec 4, 2025) - "fix: Location sharing, PDF email, calendar links, and context flattening"

**Root Cause:**
- **Attachment Format Mismatch:**
  - **In commit 5866acb (original):** Used `content: pdfBase64, encoding: 'base64'`
  - **Current code (line 61):** Uses `content: Buffer.from(pdfBase64, 'base64')`
  - **EmailService behavior:** `encodeAttachment()` converts Buffer → base64 string
  - **Resend API expects:** Base64-encoded string OR Buffer that will be encoded
  - **Issue:** The current implementation creates a Buffer, EmailService encodes it to base64 string, but Resend might expect the base64 string directly with proper headers

**Current Code (api/send-pdf-summary/route.ts:59-63):**
```typescript
attachments: pdfBase64 ? [{
  filename: `FBC-Consultation-${recipientName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`,
  content: Buffer.from(pdfBase64, 'base64'),
  contentType: 'application/pdf'
}] : []
```

**EmailService (src/core/email-service.ts:86-92):**
```typescript
function encodeAttachment(content: string | Buffer) {
  if (typeof content === 'string') {
    return Buffer.from(content).toString('base64')
  }
  return Buffer.from(content).toString('base64')
}
```

**Problem:** 
- If `pdfBase64` is already base64, `Buffer.from(pdfBase64, 'base64')` decodes it
- Then `encodeAttachment` encodes it back to base64
- This double-encoding/decoding might corrupt the PDF

**Fix Needed:**
- Pass the base64 string directly to EmailService (don't convert to Buffer)
- OR verify Resend API expects Buffer and update EmailService to handle it correctly

---

### 4. Screen Share Likely Fails (Similar to Webcam)

**Analysis:** Screen share uses same pattern as webcam for image analysis

**Root Cause:**
- `src/hooks/media/useScreenShare.ts` likely calls same router/API endpoints
- Same issues as webcam:
  1. Router helper is stub (`routeImageAnalysis`)
  2. API endpoint body parsing issue
  3. Fallback to `/api/tools/webcam` which has body parsing bug

**Fix Needed:**
- Same fixes as webcam (fix body parsing in API route)
- Implement real router logic or ensure fallback works

---

## 📊 Summary Table

| Feature | Broken Commit | Date | Issue Type | Severity |
|---------|--------------|------|------------|----------|
| **Webcam Analysis** | `a172b1a` | Dec 3, 2025 | API body parsing + router stub | 🔴 Critical |
| **Voice Connection** | `6146eaf` | Dec 8, 2025 | AudioWorklet fallback missing | 🔴 Critical |
| **PDF Email** | `5866acb` | Dec 4, 2025 | Attachment encoding mismatch | 🟡 Medium |
| **Screen Share** | `a172b1a` | Dec 3, 2025 | Same as webcam (shared code) | 🔴 Critical |

---

## 🔧 Recommended Fix Order

1. **Fix webcam API body parsing** (affects webcam + screen share)
2. **Fix AudioWorklet fallback** (voice stability)
3. **Fix PDF email attachment encoding** (email delivery)
4. **Implement real router logic** (long-term improvement)

---

## 🔍 Related Commits

```
a172b1a - feat: 7-day sprint complete + production deployment prep
  → Broke webcam API body parsing

5866acb - fix: Location sharing, PDF email, calendar links, and context flattening  
  → Changed PDF attachment format (may have introduced encoding bug)

6146eaf - feat: AudioWorklet migration, webcam fixes, and UX improvements
  → Incomplete AudioWorklet fallback implementation

07a0353 - fix: critical production fixes - screen share, voice session, API error handling
  → Attempted fixes but may have masked root causes

9a4906f - fix: prevent voice connection loop caused by handleConnect dependency
  → Indicates ongoing connection instability issues
```

