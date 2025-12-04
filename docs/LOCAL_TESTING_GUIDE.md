# Local Testing Guide - Unified Tool Integration

## Quick Start

### 1. Type Check
```bash
pnpm type-check
```
**Expected:** ✅ Passes with 0 errors

### 2. Lint Check
```bash
pnpm lint
```
**Expected:** ✅ Passes (warnings OK, no errors)

### 3. Unit Tests
```bash
pnpm test -- test/tool-integration.test.ts
```
**Expected:** ✅ All tests pass

### 4. Tool Processor Tests
```bash
pnpm test -- server/live-api/__tests__/tool-processor.test.ts
```
**Expected:** ✅ All tests pass

## Testing Voice Tool Calls (Local)

### Prerequisites
1. **WebSocket Server Running:**
   ```bash
   pnpm start:server
   ```
   Should start on `http://localhost:3001`

2. **Environment Variables:**
   - `GEMINI_API_KEY` - Required for tool execution
   - `GOOGLE_SEARCH_API_KEY` - Required for `search_web` tool
   - `GOOGLE_SEARCH_ENGINE_ID` - Required for `search_web` tool

### Test Voice Tool Call Flow

1. **Start Frontend:**
   ```bash
   pnpm dev
   ```

2. **Connect Voice Mode:**
   - Navigate to voice mode in UI
   - Start a voice session
   - Trigger a tool call (e.g., "Search for AI trends")

3. **Verify Tool Execution:**
   - Check WebSocket server logs for:
     - `Processing tool call` - Tool call received
     - `Tool validation failed` or `Tool executed` - Validation/execution
     - `Tool results sent to Gemini` - Response sent back

4. **Check Logs:**
   ```bash
   # In WebSocket server terminal
   # Look for:
   # - Schema validation logs
   # - Retry attempts (if transient error)
   # - Timeout warnings (if > 25s)
   # - Capability tracking logs
   ```

## Testing Chat Tool Calls (Local)

### Test Chat Agent Tools

1. **Start Frontend:**
   ```bash
   pnpm dev
   ```

2. **Test Closer Agent:**
   - Navigate to chat
   - Send message that triggers tool (e.g., "Calculate ROI for $10k investment")
   - Verify tool execution in network tab
   - Check for toolExecutor logs (retry, caching)

3. **Test Admin Agent:**
   - Navigate to admin chat
   - Test unified tools (search_web, calculate_roi, etc.)
   - Verify agent-specific tools still work

## Testing Schema Validation

### Test Invalid Args

1. **Voice Mode:**
   - Trigger tool with invalid args (e.g., empty query for search_web)
   - Should see validation error in logs
   - Should return `{ success: false, error: "Schema validation failed: ..." }`

2. **Chat Mode:**
   - Same validation applies
   - Check browser console for validation errors

## Testing Retry Logic

### Simulate Transient Errors

1. **Mock Transient Error:**
   ```typescript
   // In test or mock
   vi.mocked(executeUnifiedTool).mockRejectedValueOnce(
     new Error('ECONNRESET network error')
   ).mockResolvedValue({ success: true, data: {} })
   ```

2. **Verify:**
   - Retry should trigger (2 attempts for voice)
   - Should succeed on retry
   - Logs should show retry attempts

## Testing Timeout

### Simulate Slow Tool

1. **Mock Slow Execution:**
   ```typescript
   vi.mocked(executeUnifiedTool).mockImplementation(
     () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 30000))
   )
   ```

2. **Verify:**
   - Should timeout after 25s
   - Should return `{ success: false, error: "Tool ... timed out after 25000ms" }`

## Common Issues

### Issue: "Unknown tool" error
**Cause:** Tool name mismatch between Live API declarations and unified registry
**Fix:** Check `src/config/live-tools.ts` matches `unified-tool-registry.ts`

### Issue: Validation always fails
**Cause:** Schema mismatch or args format issue
**Fix:** Check Zod schema in `unified-tool-registry.ts` matches expected args

### Issue: Retry not working
**Cause:** Error not recognized as transient
**Fix:** Check `isTransientError()` logic in `unified-tool-registry.ts`

### Issue: Timeout not triggering
**Cause:** `withTimeout` not wrapping execution
**Fix:** Verify `tool-processor.ts` wraps `executeUnifiedTool` with `withTimeout`

## Integration Test Checklist

- [ ] Voice tool call executes successfully
- [ ] Chat tool call executes successfully
- [ ] Schema validation catches invalid args
- [ ] Retry logic handles transient errors
- [ ] Timeout prevents hanging (> 25s)
- [ ] Capability tracking works (only on success)
- [ ] Context tracking works (all calls)
- [ ] Response format is correct (`{ name, response: ToolResult }`)
- [ ] Error handling returns proper ToolResult format
- [ ] Both voice and chat use same underlying implementations

## Production Testing

After local testing passes:

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Deploy WebSocket Server:**
   ```bash
   fly deploy
   ```

3. **Monitor Logs:**
   - Vercel: Check function logs for API routes
   - Fly.io: Check WebSocket server logs
   - Supabase: Check capability_usage_log table

4. **Test Production:**
   - Voice mode tool calls
   - Chat mode tool calls
   - Verify no regressions

