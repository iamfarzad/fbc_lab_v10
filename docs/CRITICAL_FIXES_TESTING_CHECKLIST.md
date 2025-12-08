# Critical Fixes Testing Checklist

**Date:** 2025-12-08  
**Status:** All 6 fixes implemented and validated  
**Ready for:** Manual browser testing

---

## Pre-Testing Setup

1. **Start Development Servers:**
   ```bash
   # Terminal 1: Frontend
   pnpm dev
   
   # Terminal 2: WebSocket Server
   pnpm dev:server
   
   # Terminal 3: API Server (optional, for testing error handling)
   pnpm dev:api:3002
   ```

2. **Open Browser:**
   - Navigate to `http://localhost:3000`
   - Open DevTools (F12)
   - Go to Console tab
   - Enable debug logging (optional): `localStorage.setItem('debug', 'true'); location.reload();`

---

## Test 1: Supabase Singleton Fix ✅

**Objective:** Verify no multiple GoTrueClient instances warning

**Steps:**
1. Open browser console
2. Reload the page
3. Check for warning: `Multiple GoTrueClient instances detected`

**Expected Result:**
- ❌ **No warning should appear**
- ✅ Console should be clean (no Supabase warnings)

**If Warning Appears:**
- Check if `security-audit.ts` is being called
- Verify `getSupabaseServer()` is used everywhere
- Check for other files creating Supabase clients directly

---

## Test 2: API Connection Error Handling ✅

**Objective:** Verify user-friendly error messages when API server is down

**Steps:**
1. **With API server running:**
   - Send a text message
   - Should work normally

2. **Stop API server** (Ctrl+C in terminal running `pnpm dev:api:3002`)
   - Send a text message
   - Check error message

**Expected Result:**
- ✅ Error message: "API server not running. Start it with: pnpm dev:api:3002"
- ✅ Error shown as toast notification (not chat message)
- ✅ Fallback to StandardChatService if available

**If Error Message is Generic:**
- Check `aiBrainService.ts` lines 170-190 and 309-329
- Verify `isConnectionRefused` detection logic

---

## Test 3: LiveService Recreation Loop Fix ✅

**Objective:** Verify service is not disconnected unnecessarily

**Steps:**
1. Start voice connection
2. Wait for connection to establish (CONNECTED state)
3. Check console for: `[App] Disconnecting existing LiveService before creating new one`

**Expected Result:**
- ✅ **No disconnection warning** when already connected
- ✅ Console shows: `[App] LiveService already connected, skipping recreation`
- ✅ Connection remains stable

**If Warning Appears:**
- Check `App.tsx` line 1125-1128 guard logic
- Verify `connectionState === LiveConnectionState.CONNECTED` check

---

## Test 4: Session Timeout Fix ✅

**Objective:** Verify improved session timeout handling

**Steps:**
1. Start voice connection
2. Monitor console for timeout warnings
3. Check if `session_started` event is received
4. If timeout occurs, verify connection doesn't disconnect

**Expected Result:**
- ✅ Timeout increased to 20s (from 15s)
- ✅ If timeout occurs, shows warning but doesn't disconnect
- ✅ `setup_complete` event can be used as fallback
- ✅ Connection eventually succeeds

**Console Logs to Check:**
- `[GeminiLiveService] Start acknowledged:` - Should appear
- `[GeminiLiveService] Session started:` - Should appear within 20s
- `[GeminiLiveService] Warning: session_started not received within 20s` - Only if timeout occurs
- `[GeminiLiveService] Using setup_complete as fallback` - If fallback used

**If Timeout Still Disconnects:**
- Check `geminiLiveService.ts` lines 195-202
- Verify timeout doesn't call `disconnect()`

---

## Test 5: Error Handling Improvements ✅

**Objective:** Verify graceful fallback when agent system fails

**Steps:**
1. Send a text message
2. If agent system fails (500 error), check behavior

**Expected Result:**
- ✅ Error shown as toast notification (not chat message)
- ✅ Falls back to StandardChatService
- ✅ Context is seeded to fallback service
- ✅ Backend status shows: `mode: 'fallback'`

**Console Logs to Check:**
- `[App] Agent system failed, falling back to standard chat:` - Should appear on error
- `Fell back to StandardChat: [error message]` - Backend status message

**If Fallback Doesn't Work:**
- Check `App.tsx` lines 1576-1606
- Verify `standardChatRef.current` exists
- Check context seeding logic

---

## Test 6: Live API 1007 Error Prevention ✅

**Objective:** Verify tool validation prevents invalid config errors

**Steps:**
1. Start voice connection
2. Check server logs for: `Request contains an invalid argument` (code 1007)
3. Check server logs for tool validation messages

**Expected Result:**
- ✅ **No code 1007 errors** in server logs
- ✅ Server logs show: `[config-builder]` validation messages
- ✅ Tools config is validated before sending to Live API
- ✅ Falls back to `googleSearch` only if validation fails

**Server Logs to Check:**
```bash
# In WebSocket server terminal
fly logs --app fb-consulting-websocket --follow
# OR locally:
# Check terminal running pnpm dev:server
```

**Look for:**
- `[config-builder] No valid function declarations, using googleSearch only` - If validation fails
- `[config-builder] Error building tools config, falling back to no-tools mode:` - If error occurs
- No `code: 1007` or `invalid argument` errors

**If 1007 Error Still Occurs:**
- Check `config-builder.ts` lines 281-306
- Verify tool validation logic
- Check if function declarations are well-formed

---

## Test 7: Combined Integration Test ✅

**Objective:** Verify all fixes work together

**Steps:**
1. Start all servers (frontend, websocket, API)
2. Open browser console
3. Start voice connection
4. Send text message
5. Enable webcam
6. Enable screen share

**Expected Result:**
- ✅ No Supabase warnings
- ✅ Voice connects successfully
- ✅ Text messages work
- ✅ Webcam streams correctly
- ✅ Screen share streams correctly
- ✅ No unnecessary disconnections
- ✅ Error messages are user-friendly

---

## Troubleshooting

### Issue: Supabase warning still appears
**Check:**
- Are there other files creating Supabase clients?
- Run: `grep -r "createClient" src/ --exclude-dir=node_modules`

### Issue: API errors not user-friendly
**Check:**
- Is `aiBrainService.ts` detecting `ECONNREFUSED` correctly?
- Check browser console for original error message

### Issue: LiveService still disconnects
**Check:**
- Is guard logic in `App.tsx` working?
- Check `connectionState` value when guard runs

### Issue: Session timeout still disconnects
**Check:**
- Is timeout handler calling `disconnect()`?
- Check `geminiLiveService.ts` timeout logic

### Issue: 1007 error still occurs
**Check:**
- Are tool declarations valid?
- Check server logs for validation messages
- Verify `config-builder.ts` fallback logic

---

## Success Criteria

All tests pass if:
- ✅ No Supabase warnings in console
- ✅ User-friendly error messages
- ✅ No unnecessary disconnections
- ✅ Session timeout doesn't kill connection
- ✅ Graceful fallback on errors
- ✅ No Live API 1007 errors

---

## Reporting Results

After testing, document:
1. Which tests passed ✅
2. Which tests failed ❌
3. Any new errors or warnings
4. Browser console logs (relevant sections)
5. Server logs (relevant sections)

**Next Steps:**
- If all tests pass → Ready for production deployment
- If tests fail → Document issues and create fix plan

