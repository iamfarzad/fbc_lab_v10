---
description: Debug text chat - AI responses, message persistence, and chat API
---

# Debug Text Chat

// turbo-all

## 1. Check if servers are running
```bash
lsof -i :3000 -i :3002 | grep LISTEN
```

## 2. Test chat API endpoint directly
```bash
curl -s -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello, I need help with AI"}],"sessionId":"test-123"}' \
  2>/dev/null | head -30
```

## 3. Check for API errors
```bash
curl -s -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}' \
  2>&1 | grep -i "error\|failed\|500"
```

## 4. Verify AIBrainService configuration
```bash
grep -n "baseUrl\|determineBaseUrl\|sendMessage" services/aiBrainService.ts | head -20
```

## 5. Check StandardChatService
```bash
grep -n "chat\|generateContent\|model" services/standardChatService.ts | head -20
```

## 6. Check unified context is working
```bash
grep -n "unifiedContext\|setContext\|getContext" services/unifiedContext.ts | head -15
```

## 7. Verify message persistence API
```bash
curl -s -X POST http://localhost:3002/api/chat/persist-message \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","role":"user","content":"test message"}' \
  2>/dev/null | head -10
```

---

## Browser Debugging

1. Open DevTools → Console
2. Filter by: `[AIBrain]`, `[Chat]`, `error`
3. Watch for:
   - ✅ "Agent response received"
   - ❌ "Failed to send message"
   - ❌ "500" or "error"

4. Network tab → Filter by `api/chat`:
   - Check request payload (messages, sessionId)
   - Check response status and body

---

## Common Text Chat Issues

### No response from AI
1. Check GEMINI_API_KEY is set in `.env.local`
2. Check API server is running on port 3002
3. Check browser console for errors

### Response is generic/not personalized
1. Check intelligenceContext is being passed
2. Verify research data exists for the lead
3. Run `/debug-agents` to check agent routing

### Message not saving
1. Check Supabase connection
2. Verify persist-message endpoint works
3. Check sessionId is consistent

### Duplicate responses
1. Check for multiple useEffect triggers
2. Verify no double form submissions
3. Check streaming isn't duplicating

---

## Key Files

| File | Purpose |
|------|---------|
| `services/aiBrainService.ts` | Frontend chat service |
| `services/standardChatService.ts` | Direct Gemini API calls |
| `services/unifiedContext.ts` | Shared context state |
| `api/chat.ts` | Main chat API endpoint |
| `api/chat/unified.ts` | Unified chat handler |
| `api/chat/persist-message.ts` | Message persistence |
| `components/MultimodalChat.tsx` | Chat UI component |
| `components/chat/ChatInputDock.tsx` | Input component |
