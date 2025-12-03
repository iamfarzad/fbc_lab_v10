# Type Checking & Linting Setup

## ✅ Configuration Files Created

### TypeScript
- ✅ `tsconfig.json` - Main TypeScript config with strict mode
- ✅ `tsconfig.node.json` - Config for Node.js files (vite.config.ts, etc.)

### ESLint
- ✅ `.eslintrc.cjs` - ESLint configuration with TypeScript and React rules
- ✅ `.eslintignore` - Files to ignore during linting

### Prettier
- ✅ `.prettierrc` - Code formatting rules
- ✅ `.prettierignore` - Files to ignore during formatting

### Build Tools
- ✅ `vite.config.ts` - Vite configuration
- ✅ `vitest.config.ts` - Vitest test configuration
- ✅ `package.json` - Dependencies and scripts

## TypeScript Configuration

### Strict Mode Enabled
- `strict: true` - All strict checks enabled
- `noUnusedLocals: true` - Error on unused variables
- `noUnusedParameters: true` - Error on unused parameters
- `noUncheckedIndexedAccess: true` - Safer array/object access
- `exactOptionalPropertyTypes: true` - Stricter optional properties

### Import Resolution
- `baseUrl: "."` - Absolute imports from root
- No path aliases needed - imports like `components/X` work directly

## ESLint Rules

### TypeScript Rules
- ✅ `@typescript-eslint/recommended` - Recommended TypeScript rules
- ✅ `@typescript-eslint/recommended-requiring-type-checking` - Type-aware rules
- ⚠️ `@typescript-eslint/no-explicit-any: warn` - Warn on `any` usage
- ⚠️ `@typescript-eslint/no-unsafe-*: warn` - Warn on unsafe operations

### React Rules
- ✅ `react-hooks/recommended` - React Hooks rules
- ✅ `react/recommended` - React best practices
- ✅ `react/jsx-runtime` - New JSX transform

### Code Quality
- ✅ `no-unused-vars` - Error on unused variables (with `_` prefix exception)
- ⚠️ `no-console: warn` - Warn on console.log (allow console.warn/error)
- ✅ **Console.log migration**: 30 files migrated to `logger.debug()` from `src/lib/logger`

## Scripts Available

### Type Checking
```bash
# Check types without emitting files
pnpm type-check

# Watch mode for type checking
pnpm type-check:watch
```

### Linting
```bash
# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Run all automated ESLint fixes
./scripts/fix-all-eslint.sh

# Individual fix scripts
node scripts/fix-console-logs.js          # Replace console.log with logger
node scripts/fix-floating-promises.js    # Fix floating promises
node scripts/fix-require-await.js         # Fix require-await errors
node scripts/fix-unescaped-entities.js    # Fix React unescaped entities
node scripts/fix-misused-promises.js      # Fix misused promises
node scripts/report-unsafe-arguments.js  # Report unsafe arguments
```

### Building
```bash
# Type check + build
pnpm build

# Development server
pnpm dev
```

### Testing
```bash
# Run tests
pnpm test

# Test with UI
pnpm test:ui

# Test with coverage
pnpm test:coverage
```

## Pre-commit Checklist

Before committing code:

1. ✅ **Type check passes**: `pnpm type-check`
2. ✅ **Linting passes**: `pnpm lint`
3. ✅ **No TypeScript errors**: Check IDE/terminal
4. ✅ **No ESLint errors**: Check IDE/terminal

## IDE Integration

### VS Code / Cursor
Install extensions:
- ESLint
- Prettier
- TypeScript (built-in)

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## ESLint Status

**Current Status (2025-12-02):**
- ✅ **158 errors** (down from 240 - 34% reduction)
- ✅ **1087 warnings**
- ✅ **30 files fixed** (console.log → logger.debug)

**Remaining Error Categories:**
- 50 `@typescript-eslint/require-await` - Async functions with no await
- 29 `@typescript-eslint/no-unsafe-argument` - Unsafe any arguments
- 20 `@typescript-eslint/no-misused-promises` - Promises in wrong context
- 59 Other type-safety errors

**See:** `docs/ESLINT_FIX_SUMMARY.md` for detailed breakdown

## Common Issues

### Type Errors
- **Unused variables**: Prefix with `_` if intentionally unused
- **Any types**: Use proper types instead of `any`
- **Unsafe operations**: Add proper type guards
- **Unsafe arguments**: Add type assertions: `value as Type`

### Lint Errors
- **Unused imports**: Remove or use them
- **Console.log**: ✅ **Fixed** - Now using `logger.debug()` from `src/lib/logger`
- **React hooks**: Follow rules of hooks
- **Floating promises**: Add `void` operator or await
- **Require-await**: Remove `async` if no `await` present
- **Misused promises**: Wrap in arrow function: `onClick={() => { void promise() }}`

## ESLint Fix Scripts

### Automated Fixes Available
1. **fix-console-logs.js** - Replaces `console.log` with `logger.debug()` ✅ (30 files fixed)
2. **fix-floating-promises.js** - Adds `void` operator to unhandled promises
3. **fix-require-await.js** - Removes `async` from functions with no `await`
4. **fix-unescaped-entities.js** - Escapes JSX entities (`'` → `&apos;`)
5. **fix-misused-promises.js** - Wraps promises in event handlers
6. **report-unsafe-arguments.js** - Reports unsafe arguments for manual fixing

### Usage
```bash
# Run all automated fixes
./scripts/fix-all-eslint.sh

# Or run individually
node scripts/fix-console-logs.js
node scripts/report-unsafe-arguments.js
```

## Next Steps

1. ✅ Install dependencies: `pnpm install`
2. ✅ Run type check: `pnpm type-check`
3. ✅ Run lint: `pnpm lint`
4. ✅ Start importing files with type safety
5. ⏳ **Fix remaining 158 ESLint errors** (see `docs/ESLINT_FIX_SUMMARY.md`)

