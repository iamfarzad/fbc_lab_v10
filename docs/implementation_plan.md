# Implementation Plan

[Overview]
Fix all 29 ESLint `no-unsafe-argument` errors by adding proper type guards, type assertions, and parameter validation to ensure type safety across the codebase.

The `no-unsafe-argument` rule from TypeScript ESLint flags situations where values of type `any` are passed to functions expecting specific types. This analysis revealed 29 instances across 15 files where `any` values are being passed to typed parameters without proper validation or type narrowing. The errors primarily occur in API handlers, React components, and service layers where external data or dynamic values need proper type checking before being used.

[Types]
Define utility types and validation functions to handle dynamic data safely.

### Utility Type Guards
```typescript
// Type guard functions for common patterns
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

function isSetStateAction<T>(value: unknown): value is SetStateAction<T> {
  return typeof value === 'function' || value !== undefined;
}

// Generic validation with type predicates
function validateAndConvert<T>(
  value: unknown,
  validator: (v: unknown) => v is T,
  errorMessage: string
): T {
  if (!validator(value)) {
    throw new Error(errorMessage);
  }
  return value;
}
```

### Request Body Validators
```typescript
// API request validators
interface PersistMessageRequest {
  sessionId: string;
  role: 'user' | 'model';
  content?: string;
  timestamp: string;
  attachment?: {
    mimeType: string;
    data: string;
    filename?: string;
  };
}

function validatePersistMessageRequest(body: unknown): PersistMessageRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }
  
  const req = body as Record<string, unknown>;
  
  return {
    sessionId: validateAndConvert(req.sessionId, isString, 'sessionId must be a string'),
    role: validateAndConvert(req.role, (r): r is 'user' | 'model' => r === 'user' || r === 'model', 'role must be user or model'),
    content: req.content !== undefined ? validateAndConvert(req.content, isString, 'content must be a string') : undefined,
    timestamp: validateAndConvert(req.timestamp, isString, 'timestamp must be a string'),
    attachment: req.attachment ? {
      mimeType: validateAndConvert(req.attachment.mimeType, isString, 'attachment.mimeType must be a string'),
      data: validateAndConvert(req.attachment.data, isString, 'attachment.data must be a string'),
      filename: req.attachment.filename
    } : undefined
  };
}
```

### Context Type Validators
```typescript
// LogContext validator
function isValidLogContext(value: unknown): value is LogContext {
  if (!value || typeof value !== 'object') return false;
  
  const ctx = value as Record<string, unknown>;
  return (
    (ctx.sessionId === undefined || typeof ctx.sessionId === 'string') &&
    (ctx.userId === undefined || typeof ctx.userId === 'string') &&
    (ctx.action === undefined || typeof ctx.action === 'string')
  );
}
```

[Files]
Modify 15 files to fix the 29 `no-unsafe-argument` errors by adding proper type validation.

### Files Requiring Modifications

1. **App.tsx** (1 error)
   - Line 223: Fix `SetStateAction<UserProfile | null>` parameter

2. **api/chat/persist-batch.ts** (2 errors)
   - Lines 17, 21: Fix `string` and `string | number | Date` parameters

3. **api/chat/persist-message.ts** (3 errors)
   - Lines 22, 26: Fix `string` and `string | number | Date` parameters
   - Line 22: Fix `Omit<ConversationTurn, "timestamp">` parameter

4. **components/AdminDashboard.tsx** (1 error)
   - Line 259: Fix `SetStateAction<ResearchResult | null>` parameter

5. **components/chat/Attachments.tsx** (2 errors)
   - Lines 81, 167: Fix `string` and `number` parameters

6. **components/chat/WebcamPreview.tsx** (2 errors)
   - Lines 69, 184: Fix `Landmark3D[]` and `string | number | Timeout | undefined` parameters

7. **server/handlers/audio-handler.ts** (1 error)
   - Line 132: Fix `TurnCompletionClient` parameter

8. **server/handlers/start-handler.ts** (6 errors)
   - Lines 213, 284, 310, 354, 444, 502: Fix `{}` and `string` parameters

9. **server/live-api/config-builder.ts** (1 error)
   - Line 65: Fix `PersonalizationData` parameter

10. **server/live-api/tool-processor.ts** (1 error)
    - Line 64: Fix `{ query: string; urls?: string[]; }` parameter

11. **server/utils/tool-implementations.ts** (1 error)
    - Line 134: Fix `number` parameter

12. **server/utils/websocket-helpers.ts** (1 error)
    - Line 40: Fix `BufferLike` parameter

13. **services/geminiLiveService.ts** (3 errors)
    - Lines 222, 236, 238: Fix `LogContext | undefined` and `any[]` parameters

14. **services/unifiedContext.ts** (1 error)
    - Line 64: Fix `string | number | Date` parameter

15. **src/core/queue/workers.ts** (1 error)
    - Line 115: Fix `SummaryData` parameter

16. **src/core/tools/shared-tool-registry.ts** (1 error)
    - Line 109: Fix `ROIParameters` parameter

17. **src/lib/logger-client.ts** (1 error)
    - Line 87: Fix `LogContext | undefined` parameter

### New Files to Create

1. **src/utils/type-guards.ts**
   - Utility type guard functions
   - Validation helpers for common patterns

2. **src/utils/api-validators.ts**
   - API request body validators
   - Request parameter validation functions

[Functions]
Create validation and type guard functions to safely handle dynamic data.

### New Functions

1. **isString(value: unknown): value is string**
   - Type guard for string validation
   - Location: src/utils/type-guards.ts

2. **isNumber(value: unknown): value is number**
   - Type guard for number validation
   - Location: src/utils/type-guards.ts

3. **isDate(value: unknown): value is Date**
   - Type guard for Date validation
   - Location: src/utils/type-guards.ts

4. **isValidLogContext(value: unknown): value is LogContext**
   - Type guard for LogContext interface
   - Location: src/utils/type-guards.ts

5. **validatePersistMessageRequest(body: unknown): PersistMessageRequest**
   - Validates API request body for persist-message endpoint
   - Location: src/utils/api-validators.ts

6. **validatePersistBatchRequest(body: unknown): PersistBatchRequest**
   - Validates API request body for persist-batch endpoint
   - Location: src/utils/api-validators.ts

### Modified Functions

1. **App.tsx handleTermsComplete()**
   - Add validation for profile data before setUserProfile
   - Ensure typesafe parameter passing

2. **api/chat/persist-batch.ts handler()**
   - Add request body validation
   - Type-safe iteration over messages array

3. **api/chat/persist-message.ts handler()**
   - Add comprehensive request validation
   - Type-safe parameter extraction

4. **Component setState calls**
   - Add type guards before setState calls
   - Validate data structures before state updates

[Classes]
No new classes required. Focus on utility functions and validation logic.

[Dependencies]
No new dependencies required. Using built-in TypeScript features and existing utility patterns.

[Testing]
Comprehensive testing strategy to ensure type safety fixes work correctly.

### Unit Tests

1. **Type Guard Tests**
   - Test all type guard functions with valid/invalid inputs
   - Edge case coverage (null, undefined, empty values)

2. **API Validator Tests**
   - Test request validation with malformed data
   - Ensure proper error throwing for invalid inputs

3. **Integration Tests**
   - Test API endpoints with various request formats
   - Verify React component state updates with validated data

### Test Files

1. **src/utils/__tests__/type-guards.test.ts**
2. **src/utils/__tests__/api-validators.test.ts**
3. **api/chat/__tests__/persist-message.test.ts**
4. **api/chat/__tests__/persist-batch.test.ts**

[Implementation Order]
Logical sequence to implement fixes safely without breaking existing functionality.

1. **Create Type Guard Utilities**
   - Implement src/utils/type-guards.ts
   - Add comprehensive test coverage
   - Verify type guard accuracy

2. **Create API Validators**
   - Implement src/utils/api-validators.ts
   - Add request validation functions
   - Test with various input scenarios

3. **Fix API Handlers**
   - Update api/chat/persist-message.ts
   - Update api/chat/persist-batch.ts
   - Add request validation at entry points
   - Test API functionality

4. **Fix React Components**
   - Update App.tsx state management
   - Update AdminDashboard.tsx state updates
   - Update chat components with validation
   - Test component behavior

5. **Fix Server Handlers**
   - Update server/handlers/ files
   - Add parameter validation
   - Test server functionality

6. **Fix Service Layer**
   - Update services/ files
   - Add context validation
   - Test service integration

7. **Fix Utility Functions**
   - Update src/core/ files
   - Update src/lib/ files
   - Add proper type checking
   - Test utility functions

8. **Final Validation**
   - Run complete ESLint check
   - Verify all 29 errors are resolved
   - Run type-check to ensure no new issues
   - Test application end-to-end

9. **Documentation**
   - Update type safety guidelines
   - Document validation patterns
   - Add examples for future development
