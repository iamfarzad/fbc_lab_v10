---
description: Debug PDF generation, email summary, and transcript download features
---

# Debug PDF & Email Summary

// turbo-all

## 1. Check API server is running
```bash
lsof -i :3002 | grep LISTEN
```

## 2. Test send-pdf-summary endpoint
```bash
curl -s -X POST http://localhost:3002/api/send-pdf-summary \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","pdfData":"data:application/pdf;base64,JVBERi0="}' \
  2>/dev/null | head -10
```

## 3. Check PDF generator files exist
```bash
ls -la src/core/pdf/
```

## 4. Check discovery report generator
```bash
grep -n "generateDiscoveryReport\|buildDiscoveryReportData" src/core/pdf/discovery-report-generator.ts | head -15
```

## 5. Check email service configuration
```bash
grep -n "sendEmail\|RESEND\|EMAIL" src/core/email-service.ts | head -20
```

## 6. Verify PDF templates
```bash
ls -la src/core/pdf/templates/
```

## 7. Check client-side PDF utilities
```bash
grep -n "generatePDF\|downloadPDF\|createDiscovery" utils/discoveryReportUtils.ts 2>/dev/null | head -15
```

## 8. Check MultimodalChat PDF menu
```bash
grep -n "pdf\|PDF\|Download\|Email" components/MultimodalChat.tsx | head -20
```

---

## Browser Debugging

1. Open DevTools → Console
2. Filter by: `pdf`, `email`, `download`
3. Watch for:
   - ✅ "PDF generated successfully"
   - ✅ "Email sent"
   - ❌ "Failed to generate PDF"
   - ❌ "Email send failed"

4. Network tab:
   - Check `/api/send-pdf-summary` requests
   - Verify request body has valid pdfData or sessionId

---

## Common PDF Issues

### PDF won't generate
1. Check Puppeteer is installed: `ls node_modules/puppeteer`
2. Server-side PDF needs Puppeteer chromium
3. Client-side uses pdf-lib (no Puppeteer needed)

### PDF is corrupted
**Cause:** Double base64 encoding
**Fix:** Check pdfData isn't encoded twice
```bash
grep -n "base64\|btoa\|atob" api/send-pdf-summary/route.ts | head -10
```

### PDF has no content
1. Check conversation history is being passed
2. Verify transcript data exists
3. Check template is rendering correctly

---

## Common Email Issues

### Email not sending
1. Check `RESEND_API_KEY` in `.env.local`
2. Verify email service is configured
```bash
grep "RESEND" .env.local
```

### Email sent but no attachment
1. Check pdfBase64 is not empty
2. Verify content is valid base64
3. Check EmailService.encodeAttachment

### Wrong email address
1. Check toEmail vs email field in request
2. Verify form data is correct

---

## Transcript Download

### Check transcript generation
```bash
grep -n "transcript\|Transcript\|exportTranscript" components/ src/ --include="*.tsx" --include="*.ts" 2>/dev/null | head -20
```

### Common transcript issues
1. Transcript empty → Check conversation history exists
2. Download fails → Check blob URL creation
3. Wrong format → Verify text/markdown generation

---

## Key Files

| File | Purpose |
|------|---------|
| `api/send-pdf-summary/route.ts` | Email PDF endpoint |
| `src/core/pdf/discovery-report-generator.ts` | PDF generation |
| `src/core/pdf/templates/` | PDF templates |
| `src/core/email-service.ts` | Email sending |
| `utils/discoveryReportUtils.ts` | Client-side PDF utils |
| `components/MultimodalChat.tsx` | PDF menu & download UI |
| `components/chat/DiscoveryReportPreview.tsx` | Report preview |

---

## Environment Variables Required

```bash
# For email sending
RESEND_API_KEY=re_xxxx

# For server-side PDF (if using Puppeteer)
# Puppeteer auto-downloads chromium on install
```

---

## Test Email Locally

1. Generate a PDF in the chat
2. Click "Email Summary"
3. Enter email address
4. Check:
   - Network tab for API call
   - Console for errors
   - Your inbox for the email
