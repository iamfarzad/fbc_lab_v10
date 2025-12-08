---
description: Mandatory rules for AI assistants working on this codebase
---

# AI Development Rules - MANDATORY

> [!CAUTION]
> These rules exist because previous AI sessions created 55 fix commits in 2 weeks.
> Breaking these rules will be detected and flagged.

---

## 🔴 BEFORE ANY CHANGE

// turbo-all

1. Run build verification FIRST:
```bash
pnpm build
```
If this fails, FIX IT before doing anything else.

2. Run type check:
```bash
pnpm type-check
```

3. Never proceed if either fails.

---

## 🚫 FORBIDDEN ACTIONS

### 1. NO changes to App.tsx without extraction first

App.tsx is 2200+ lines. DO NOT add new:
- useState hooks
- useEffect hooks
- useCallback functions
- Business logic

INSTEAD: Create a new hook in `src/hooks/` and import it.

### 2. NO `src/` imports in API routes or server code

WRONG:
```typescript
import { foo } from 'src/core/utils';
```

RIGHT:
```typescript
import { foo } from '../../../src/core/utils.js';
```

API routes and server code use ESM - they need relative paths with `.js` extensions.

### 3. NO shipping broken TypeScript

Never do:
```
COMMIT: feat: add feature
COMMIT: fix: resolve TypeScript errors  ← THIS SHOULD NOT EXIST
```

Always verify build BEFORE committing.

### 4. NO fixing symptoms without fixing root causes

BAD: 10 commits fixing the same import pattern
GOOD: 1 ESLint rule preventing the pattern

---

## ✅ REQUIRED WORKFLOW

### For Every Change:

1. **Verify current build passes** before starting
2. **Make the change**
3. **Run `pnpm build`** - if it fails, fix before committing
4. **Run tests if touching:**
   - Agents: `pnpm test src/core/agents`
   - Voice: Manual browser test required
   - API: `pnpm test:e2e:tools`

### For New Features:

1. **Check if it should go in App.tsx** - answer is almost always NO
2. **Create a hook or component** instead
3. **Import and wire up** in App.tsx with minimal code

### For Bug Fixes:

1. **Identify root cause** - not just the symptom
2. **If pattern-based bug**: Add ESLint rule or automated check
3. **If logic bug**: Add test to prevent regression

---

## 📁 FILE RULES

| File | Rule |
|------|------|
| `App.tsx` | FROZEN - no new logic, only imports |
| `api/**/*.ts` | Use relative imports with `.js` extensions |
| `server/**/*.ts` | Use relative imports with `.js` extensions |
| `src/hooks/**` | Preferred location for new stateful logic |
| `src/lib/**` | Preferred location for pure utilities |

---

## 🧪 TESTING REQUIREMENTS

| Change Type | Required Verification |
|-------------|----------------------|
| Any TypeScript | `pnpm build` must pass |
| Agent logic | Run `pnpm test src/core/agents` |
| Voice/Webcam | Browser test with microphone |
| API endpoints | `pnpm test:e2e:tools` |
| UI components | Visual inspection in browser |

---

## 📝 COMMIT MESSAGE FORMAT

```
<type>: <description>

Types:
- feat: New feature (must include tests if complex)
- fix: Bug fix (must explain root cause)
- refactor: Code change without behavior change
- test: Adding tests
- docs: Documentation only
- chore: Build/tooling changes
```

---

## 🔄 SESSION START CHECKLIST

```bash
# 1. Check build status
pnpm build

# 2. Check for uncommitted changes
git status

# 3. Read current state
cat PROJECT_STATUS.md | head -50

# 4. Only then start work
```

---

## 🔄 SESSION END CHECKLIST

```bash
# 1. Verify build
pnpm build

# 2. Verify type check
pnpm type-check

# 3. Commit with proper message
git add -A && git commit -m "type: description"

# 4. Update PROJECT_STATUS.md
```
