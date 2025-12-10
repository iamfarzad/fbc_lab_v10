# Critical Rate Limiting Issue - Logs Analysis
**Date:** 2025-12-10  
**Severity:** 🔴 CRITICAL  
**Impact:** Screen share, webcam, and audio streaming completely broken

---

## Executive Summary

The logs reveal **massive rate limiting failures** causing:
- **100% of screen share frames dropped** after ~50 seconds
- **Audio chunks being rate limited** in bursts
- **Live API connection timeouts** due to missing data
- **Vision accuracy failures** (frames never reach API)

**Root Cause:** Rate limits are too restrictive for real-time multimodal streaming.

---

## Log Analysis

### Rate Limit Warnings Pattern

From logs (12:05:50 - 12:06:12):
```
[websocket] Rate limit exceeded for REALTIME_INPUT {"isAudioChunk":false,"mimeType":"image/jpeg"}
[websocket] Rate limit exceeded for REALTIME_INPUT {"isAudioChunk":true,"mimeType":"audio/pcm;rate=16000"}
```

**Frequency:**
- **Image frames:** ~2 FPS (every 500ms) = **120 frames/minute**
- **Audio chunks:** Bursts of 6-8 chunks per timestamp = **>200 chunks/second** during bursts

### Current Rate Limits

**Location:** `server/rate-limiting/websocket-rate-limiter.ts`

```typescript
export const CLIENT_RATE_LIMIT = { windowMs: 60000, max: 100 } // 100 messages per minute
export const AUDIO_RATE_LIMIT = { windowMs: 1000, max: 200 } // 200 chunks/second
```

**Problem:**
- **REALTIME_INPUT** (images) uses `CLIENT_RATE_LIMIT` = **100/minute**
- Screen share sends **120 frames/minute** → **Exceeds limit after 50 seconds**
- Audio bursts exceed **200/second** → **Rate limited during speech**

---

## Impact Analysis

### 1. Screen Share Completely Broken

**Timeline:**
1. **0-50 seconds:** Frames sent successfully (100 frames)
2. **50+ seconds:** All frames rate limited and dropped
3. **Result:** AI sees no screen content after 50 seconds

**Evidence from logs:**
```
[12:05:50.308Z] Rate limit exceeded for REALTIME_INPUT {"mimeType":"image/jpeg"}
[12:05:50.811Z] Rate limit exceeded for REALTIME_INPUT {"mimeType":"image/jpeg"}
... (hundreds more)
```

**User Impact:**
- Screen share appears to work initially
- After ~50 seconds, AI stops seeing screen content
- User experiences "hallucination" (AI makes up content)
- No error message to user (silent failure)

### 2. Audio Streaming Degraded

**Evidence:**
- Multiple audio chunks rate limited in bursts
- Pattern: 6-8 chunks at same timestamp → all rate limited
- Audio continues but with gaps/delays

**Impact:**
- Voice responses delayed
- Transcription accuracy reduced
- User experience degraded

### 3. Vision Accuracy Issues

**Connection to Rate Limiting:**
- Webcam frames also use `REALTIME_INPUT` → same 100/minute limit
- Finger counting tests failed because frames were dropped
- AI received incomplete visual data

### 4. Live API Connection Timeouts

**Evidence:**
```
[12:07:23.519Z] Live API connection timeout after 30s
[12:07:59.517Z] Live API connection timeout after 30s
```

**Root Cause:**
- Rate limiting causes data starvation
- Live API expects continuous stream
- Missing frames cause connection issues

---

## Code Flow Analysis

### Current Implementation

**File:** `server/handlers/realtime-input-handler.ts:40-45`

```typescript
// Check rate limit - use audio rate limit for audio chunks, regular limit for others
const rateLimit = checkRateLimit(
  connectionId, 
  client.sessionId, 
  isAudioChunk ? MESSAGE_TYPES.USER_AUDIO : MESSAGE_TYPES.REALTIME_INPUT
)
```

**Problem:**
- Images use `MESSAGE_TYPES.REALTIME_INPUT` → `CLIENT_RATE_LIMIT` (100/minute)
- Audio uses `MESSAGE_TYPES.USER_AUDIO` → `AUDIO_RATE_LIMIT` (200/second)
- **No separate limit for image/video frames**

### Rate Limiter Logic

**File:** `server/rate-limiting/websocket-rate-limiter.ts:82-112`

```typescript
if (messageType === MESSAGE_TYPES.USER_AUDIO || messageType === 'user_audio') {
  // Use AUDIO_RATE_LIMIT (200/second)
} else {
  // Use CLIENT_RATE_LIMIT (100/minute) ← Images fall here!
}
```

**Issue:** Images and video frames are treated as regular messages, not high-frequency media.

---

## Required Fixes

### Fix #1: Add Media Rate Limit

**Add to `websocket-rate-limiter.ts`:**

```typescript
// High-frequency media messages (images, video frames)
export const MEDIA_RATE_LIMIT = { windowMs: 60000, max: 300 } // 300 frames/minute (5 FPS)
```

**Rationale:**
- Screen share: 2-4 FPS = 120-240 frames/minute
- Webcam: 1-2 FPS = 60-120 frames/minute
- **300/minute** allows for 5 FPS with headroom

### Fix #2: Update ConnectionState Type

**Add media tracking:**

```typescript
export type ConnectionState = {
  isReady: boolean
  lastPing: number
  messageCount: number
  lastMessageAt: number
  audioCount: number
  audioLastAt: number
  mediaCount: number      // NEW
  mediaLastAt: number     // NEW
}
```

### Fix #3: Update Rate Limit Check

**Modify `checkRateLimit()` function:**

```typescript
export function checkRateLimit(
  connectionId: string,
  sessionId?: string,
  messageType?: string
): { allowed: boolean; remaining?: number } {
  // ... existing code ...
  
  const now = Date.now()
  
  // Audio: 200/second
  if (messageType === MESSAGE_TYPES.USER_AUDIO || messageType === 'user_audio') {
    // ... existing audio logic ...
  }
  
  // Media (images/video): 300/minute
  if (messageType === MESSAGE_TYPES.REALTIME_INPUT) {
    const mimeType = /* extract from context or pass as param */
    if (mimeType?.startsWith('image/') || mimeType?.startsWith('video/')) {
      if (now - st.mediaLastAt >= MEDIA_RATE_LIMIT.windowMs) {
        st.mediaCount = 0
        st.mediaLastAt = now
      }
      if (st.mediaCount >= MEDIA_RATE_LIMIT.max) {
        return { allowed: false, remaining: Math.ceil((MEDIA_RATE_LIMIT.windowMs - (now - st.mediaLastAt)) / 1000) }
      }
      st.mediaCount++
      return { allowed: true }
    }
  }
  
  // Regular messages: 100/minute
  // ... existing logic ...
}
```

### Fix #4: Pass MIME Type to Rate Limiter

**Update `realtime-input-handler.ts`:**

```typescript
// Extract mimeType before rate limit check
const mimeType = chunk?.mimeType || ''
const isAudioChunk = mimeType.startsWith('audio/') || mimeType.includes('pcm') || mimeType.includes('rate=')
const isMediaChunk = mimeType.startsWith('image/') || mimeType.startsWith('video/')

// Check rate limit with context
const rateLimit = checkRateLimit(
  connectionId, 
  client.sessionId, 
  isAudioChunk ? MESSAGE_TYPES.USER_AUDIO : MESSAGE_TYPES.REALTIME_INPUT,
  mimeType  // NEW: Pass mimeType for media detection
)
```

**Update `checkRateLimit()` signature:**

```typescript
export function checkRateLimit(
  connectionId: string,
  sessionId?: string,
  messageType?: string,
  mimeType?: string  // NEW
): { allowed: boolean; remaining?: number }
```

### Fix #5: Increase Audio Rate Limit (Optional)

**If audio bursts continue:**

```typescript
export const AUDIO_RATE_LIMIT = { windowMs: 1000, max: 300 } // Increase from 200 to 300/second
```

**Rationale:**
- Current: 200 chunks/second
- Observed bursts: 6-8 chunks at once
- **300/second** provides more headroom for bursts

---

## Testing Plan

### Test Case 1: Screen Share Rate Limiting
1. Start screen share
2. Monitor logs for rate limit warnings
3. **Expected:** No rate limit warnings for 5+ minutes
4. **Verify:** Frames continue to reach Live API

### Test Case 2: Webcam Rate Limiting
1. Start webcam
2. Monitor logs for rate limit warnings
3. **Expected:** No rate limit warnings
4. **Verify:** Vision accuracy improves

### Test Case 3: Audio Burst Handling
1. Speak rapidly (create audio bursts)
2. Monitor logs for rate limit warnings
3. **Expected:** No rate limit warnings
4. **Verify:** Audio streaming remains smooth

### Test Case 4: Combined Modalities
1. Enable voice + webcam + screen share simultaneously
2. Monitor logs for rate limit warnings
3. **Expected:** All modalities work without rate limiting
4. **Verify:** No connection timeouts

---

## Related Issues

This rate limiting issue explains:

1. **Screen Share Hallucination** (`CONVERSATION_TRANSCRIPT_ANALYSIS.md`)
   - Frames dropped → AI sees no content → hallucinates

2. **Vision Accuracy Problems** (`CONVERSATION_TRANSCRIPT_ANALYSIS.md`)
   - Frames dropped → incomplete visual data → wrong finger counts

3. **Live API Connection Timeouts**
   - Data starvation → connection issues → timeouts

---

## Priority

**🔴 CRITICAL - Fix Immediately**

This is blocking all multimodal functionality. Without this fix:
- Screen share unusable after 50 seconds
- Webcam accuracy degraded
- Audio streaming degraded
- User experience completely broken

---

## Implementation Checklist

- [ ] Add `MEDIA_RATE_LIMIT` constant
- [ ] Update `ConnectionState` type with media tracking
- [ ] Modify `checkRateLimit()` to handle media separately
- [ ] Update `realtime-input-handler.ts` to pass mimeType
- [ ] Update `checkRateLimit()` signature to accept mimeType
- [ ] Test screen share for 5+ minutes
- [ ] Test webcam accuracy
- [ ] Test audio bursts
- [ ] Test combined modalities
- [ ] Update documentation

---

**Analysis Completed:** 2025-12-10  
**Next Steps:** Implement fixes and test thoroughly
