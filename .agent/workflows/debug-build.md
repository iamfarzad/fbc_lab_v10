---
description: Fix TypeScript compilation and build failures
---

# Debug Build / TypeScript Errors

// turbo-all

## 1. Run type check to see all errors
```bash
pnpm type-check 2>&1 | head -100
```

## 2. Run build to see full output
```bash
pnpm build 2>&1 | tail -50
```

## 3. Check for common import issues in API routes
API routes need relative imports with .js extensions:
```bash
grep -rn "from 'src/" api/ server/ 2>/dev/null | head -20
```
If results found → These need to be converted to relative imports

## 4. Check for unused imports
```bash
pnpm lint 2>&1 | grep "unused" | head -20
```

## 5. Quick fix attempt for auto-fixable lint issues
```bash
pnpm lint:fix
```

## 6. Re-run build after fixes
```bash
pnpm build
```

## Common TypeScript Errors & Fixes

### "Cannot find module 'src/...'"
In `api/` and `server/` files, change:
```typescript
// WRONG
import { foo } from 'src/core/utils';

// RIGHT  
import { foo } from '../../../src/core/utils.js';
```

### "Property X is missing"
Check the interface definition and add the missing property, or mark as optional with `?`

### "Type 'undefined' is not assignable"
Add null checks:
```typescript
// WRONG
const x = obj.prop;

// RIGHT
const x = obj?.prop ?? defaultValue;
```

### "Object is possibly 'undefined'"
Add optional chaining or guard clauses:
```typescript
if (obj) {
  obj.method();
}
```

## Files Most Likely to Have Issues
- `api/**/*.ts` - ESM import issues
- `server/**/*.ts` - ESM import issues
- `App.tsx` - Large file with complex types
- `src/core/agents/*.ts` - Agent type mismatches
