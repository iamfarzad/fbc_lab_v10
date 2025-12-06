# E2E Tool Testing Guide

## Overview

End-to-end integration tests for the unified tool system validate the complete tool execution flow across voice and chat modalities, ensuring consistency, reliability, and proper error handling.

## Test Structure

### Test Files

- `test/tool-integration-e2e.test.ts` - Main E2E test file
- `test/helpers/tool-integration-helpers.ts` - Test utilities
- `test/helpers/test-env.ts` - Environment configuration

### Test Suites

1. **Voice Tool Call Flow** (6 tests)
   - Success path
   - Schema validation failure
   - Retry logic
   - Timeout handling
   - Unknown tool handling
   - Multiple tool calls

2. **Chat Tool Call Flow** (4 tests)
   - Success path
   - Schema validation
   - ToolExecutor retry/caching
   - Multiple agents

3. **Cross-Modality Consistency** (3 tests)
   - Same implementation for voice and chat
   - Consistent ToolResult format
   - Consistent error handling

4. **Real Tool Execution** (3 tests, optional)
   - Real search_web execution
   - Real calculate_roi execution
   - Real extract_action_items execution

## Running Tests

### Default (Skipped)

By default, E2E tests are skipped to keep test runs fast:

```bash
pnpm test
```

### Enable E2E Tests

To run E2E tests with mocks:

```bash
pnpm test:e2e:tools
```

Or set environment variable:

```bash
ENABLE_E2E_TOOL_TESTS=1 pnpm test test/tool-integration-e2e.test.ts
```

### Use Real Tool Implementations

To run E2E tests with real tool implementations (requires API keys):

```bash
pnpm test:e2e:tools:real
```

Or set environment variables:

```bash
ENABLE_E2E_TOOL_TESTS=1 USE_REAL_TOOLS=1 pnpm test test/tool-integration-e2e.test.ts
```

### Use Real Servers

To test against real WebSocket or API servers:

```bash
# With real WebSocket server
ENABLE_E2E_TOOL_TESTS=1 USE_REAL_WEBSOCKET=1 pnpm test test/tool-integration-e2e.test.ts

# With real API server
ENABLE_E2E_TOOL_TESTS=1 USE_REAL_API=1 pnpm test test/tool-integration-e2e.test.ts

# With both
ENABLE_E2E_TOOL_TESTS=1 USE_REAL_WEBSOCKET=1 USE_REAL_API=1 pnpm test test/tool-integration-e2e.test.ts
```

## Environment Variables

### Test Control

- `ENABLE_E2E_TOOL_TESTS` - Enable/disable E2E tests (default: false)
  - Set to `1` or `true` to enable
  - Tests are skipped if not set

### Tool Execution

- `USE_REAL_TOOLS` - Use real tool implementations (default: false)
  - Set to `1` or `true` to use real implementations
  - Requires API keys if enabled

### Server Configuration

- `USE_REAL_WEBSOCKET` - Use real WebSocket server (default: false)
  - Set to `1` or `true` to use real server
  - Requires WebSocket server running on `TEST_WS_URL`

- `USE_REAL_API` - Use real API server (default: false)
  - Set to `1` or `true` to use real server
  - Requires API server running on `TEST_API_URL`

### Server URLs

- `TEST_WS_URL` - WebSocket server URL (default: `ws://localhost:3001`)
- `TEST_API_URL` - API server URL (default: `http://localhost:3002`)

### Test Configuration

- `TEST_TIMEOUT` - Test timeout in milliseconds (default: 30000)

## Required API Keys

For real tool execution, the following API keys are required:

- `GEMINI_API_KEY` or `API_KEY` - Required for all tools
- `GOOGLE_SEARCH_API_KEY` - Required for `search_web` tool
- `GOOGLE_SEARCH_ENGINE_ID` - Required for `search_web` tool

## Test Scenarios

### Voice Tool Call Flow

**Test 1: Success Path**
- Sends tool call via WebSocket
- Verifies tool executes successfully
- Verifies response sent back
- Verifies capability tracking

**Test 2: Schema Validation Failure**
- Sends invalid tool args
- Verifies validation catches error
- Verifies error response sent
- Verifies capability NOT tracked

**Test 3: Retry Logic**
- Mocks transient error
- Verifies retry attempts (2 for voice)
- Verifies success on retry
- Verifies capability tracked after success

**Test 4: Timeout Handling**
- Mocks slow tool execution (>25s)
- Verifies timeout triggers
- Verifies timeout error returned
- Verifies capability NOT tracked

**Test 5: Unknown Tool**
- Sends unknown tool call
- Verifies error returned
- Verifies proper error message

**Test 6: Multiple Tools**
- Sends multiple tool calls
- Verifies all tools execute
- Verifies all responses sent

### Chat Tool Call Flow

**Test 7: Success Path**
- Calls chat API route
- Verifies agent receives tool call
- Verifies tool executes via unified registry
- Verifies toolExecutor wrapping

**Test 8: Schema Validation**
- Sends invalid tool args
- Verifies validation catches error
- Verifies error returned to client

**Test 9: ToolExecutor Retry**
- Mocks transient error
- Verifies retry attempts (3 for chat)
- Verifies caching works
- Verifies logging works

**Test 10: Multiple Agents**
- Tests closer-agent with unified tools
- Tests admin-agent with unified tools
- Verifies both use same unified registry

### Cross-Modality Consistency

**Test 11: Same Tool - Voice vs Chat**
- Executes same tool via voice
- Executes same tool via chat
- Verifies both use same implementation
- Verifies results are consistent

**Test 12: Tool Result Format**
- Verifies voice path returns ToolResult format
- Verifies chat path returns compatible format
- Verifies both formats match

**Test 13: Error Handling**
- Verifies errors handled consistently
- Verifies error format matches

## Troubleshooting

### Tests Skipped

**Issue:** Tests are skipped even when enabled

**Solution:**
- Check `ENABLE_E2E_TOOL_TESTS` is set to `1` or `true`
- Verify environment variable is set before running tests
- Check test file uses `getDescribeFunction()` correctly

### Mock Errors

**Issue:** Mocks not working correctly

**Solution:**
- Verify mocks are set up in `beforeEach`
- Check mock implementations match expected signatures
- Ensure `vi.clearAllMocks()` is called in `afterEach`

### Timeout Errors

**Issue:** Tests timing out

**Solution:**
- Increase `TEST_TIMEOUT` environment variable
- Check if real servers are slow to respond
- Verify network connectivity if using real servers

### Real Tool Execution Fails

**Issue:** Real tool execution tests fail

**Solution:**
- Verify API keys are set correctly
- Check API key permissions
- Verify network connectivity
- Check tool implementation logs for errors

### WebSocket Connection Fails

**Issue:** WebSocket connection fails in tests

**Solution:**
- Verify WebSocket server is running
- Check `TEST_WS_URL` is correct
- Verify firewall/network settings
- Check server logs for connection errors

### API Route Tests Fail

**Issue:** API route tests fail

**Solution:**
- Verify API server is running
- Check `TEST_API_URL` is correct
- Verify CORS settings
- Check API route logs for errors

## Best Practices

### CI/CD

- Use mocks for all external dependencies
- Keep tests fast (<30s)
- No external services required
- Tests should be deterministic

### Local Development

- Option to use real servers for comprehensive testing
- Option to use real tool implementations
- Slower but more thorough
- Helps catch integration issues

### Production Testing

- Use real services
- Test against production endpoints
- Verify actual tool execution
- Requires API keys and credentials
- Run separately from CI/CD

## Test Coverage

### Covered

- Voice tool call flow
- Chat tool call flow
- Schema validation
- Retry logic
- Timeout handling
- Error handling
- Cross-modality consistency
- Tool result format

### Not Covered (Future)

- Full WebSocket server integration
- Full API route integration
- Real Gemini Live API integration
- Real chat agent orchestration
- Performance testing
- Load testing

## Related Documentation

- [Local Testing Guide](./LOCAL_TESTING_GUIDE.md) - Manual testing guide
- [Tool Integration Cleanup](./TOOL_INTEGRATION_CLEANUP.md) - Cleanup summary
- [Tool Integration Master Plan](./TOOL_INTEGRATION_MASTER_PLAN.md) - Implementation plan



