#!/usr/bin/env node

/**
 * Helper script to guide browser E2E testing
 * Use with Cursor Browser Extension MCP
 */

console.log(`
=== Browser E2E Testing Guide ===

This script helps you test the application using the Browser Extension MCP.

Prerequisites:
1. Start dev server: pnpm dev
2. Ensure app is running on http://localhost:3000

Testing Steps (use Browser Extension MCP):

1. Navigate to app
   - browser_navigate({ url: "http://localhost:3000" })

2. Take snapshot to see page structure
   - browser_snapshot()

3. Check for key elements
   - Look for: buttons, forms, navigation
   - Verify: no broken images, proper layout

4. Test interactions
   - Click buttons: browser_click()
   - Fill forms: browser_fill_form()
   - Test navigation: browser_navigate()

5. Check console
   - browser_console_messages()
   - Should have no errors

6. Check network
   - browser_network_requests()
   - Verify API calls succeed
   - Check WebSocket connections

7. Test accessibility
   - browser_snapshot() (shows a11y tree)
   - Verify semantic HTML
   - Check ARIA labels

8. Test responsive design
   - browser_resize({ width: 375, height: 667 }) // Mobile
   - browser_resize({ width: 1920, height: 1080 }) // Desktop
   - Verify layout adapts

9. Test WebSocket (if applicable)
   - Start WebSocket connection
   - Send messages
   - Verify responses
   - Check connection status

10. Test error handling
    - Trigger error conditions
    - Verify error messages display
    - Check error boundaries work

Common Issues to Check:
- Console errors
- Failed network requests
- Broken imports
- Type errors in console
- Missing environment variables
- WebSocket connection failures

After testing, run:
- pnpm check:all
- pnpm test
- pnpm build

See docs/TESTING_AND_CLEANUP_STRATEGY.md for full strategy.
`)

