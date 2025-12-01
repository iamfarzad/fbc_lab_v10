# Clean Codebase Checklist

Comprehensive checklist to ensure a clean codebase without duplicates or gaps.

## 🔍 Duplicate Detection

### Code Duplicates
- [ ] **Function duplicates** - Same function in multiple files
- [ ] **Type duplicates** - Same type/interface defined multiple times
- [ ] **Constant duplicates** - Same constants in multiple files
- [ ] **Utility duplicates** - Same utility functions in multiple places
- [ ] **Component duplicates** - Same React components in multiple locations

### File Structure Duplicates
- [ ] **Directory duplicates** - `api/_lib/` vs `src/` (already identified)
- [ ] **Config duplicates** - Multiple config files doing the same thing
- [ ] **Type definition duplicates** - Types defined in multiple places
- [ ] **Schema duplicates** - Same Zod/validation schemas in multiple files

## 🔗 Dependency Issues

### Circular Dependencies
- [ ] **Detect circular imports** - Files importing each other
- [ ] **Break circular dependencies** - Refactor to remove cycles
- [ ] **Document allowed circular patterns** - If any are necessary

### Missing Dependencies
- [ ] **Broken imports** - Files importing non-existent modules
- [ ] **Missing type definitions** - Types referenced but not defined
- [ ] **Missing dependencies in package.json** - Used but not installed

### Unused Dependencies
- [ ] **Unused imports** - Imports that are never used
- [ ] **Unused exports** - Functions/types exported but never imported
- [ ] **Dead code** - Files that are never imported
- [ ] **Unused npm packages** - Packages in package.json but not used

## 📁 File Organization

### Naming Conventions
- [ ] **Consistent file naming** - camelCase vs kebab-case vs PascalCase
- [ ] **Consistent directory naming** - All lowercase? kebab-case?
- [ ] **Consistent export naming** - Named exports vs default exports
- [ ] **Index files** - Proper use of index.ts for re-exports

### Directory Structure
- [ ] **No orphaned files** - Files not in proper directories
- [ ] **No misplaced files** - Files in wrong directories
- [ ] **Consistent structure** - Same pattern across similar features
- [ ] **Barrel exports** - Proper use of index.ts files

## 🔧 Configuration & Environment

### Config Files
- [ ] **Single source of truth** - One config file per concern
- [ ] **No config duplicates** - Same config in multiple places
- [ ] **Environment separation** - Dev/staging/prod configs separate
- [ ] **Secret management** - No secrets in code/config files

### Build Configuration
- [ ] **Single build config** - One vite.config.ts, one tsconfig.json
- [ ] **No conflicting configs** - Configs that contradict each other
- [ ] **Proper path aliases** - If using aliases, consistent everywhere

## 🧪 Testing

### Test Organization
- [ ] **Test file location** - Consistent test file placement
- [ ] **Test naming** - Consistent test file naming (*.test.ts vs *.spec.ts)
- [ ] **No duplicate tests** - Same test in multiple files
- [ ] **Test utilities** - Shared test utilities in one place

### Test Coverage
- [ ] **Dead test code** - Tests for code that no longer exists
- [ ] **Missing tests** - Critical code without tests
- [ ] **Test duplicates** - Same test logic in multiple places

## 📝 Code Quality

### Type Safety
- [ ] **No `any` types** - All types properly defined
- [ ] **No type assertions** - Proper type guards instead
- [ ] **Consistent type definitions** - Same types defined once
- [ ] **Type exports** - Types exported from proper locations

### Error Handling
- [ ] **Consistent error handling** - Same pattern everywhere
- [ ] **No duplicate error classes** - One error class per error type
- [ ] **Proper error propagation** - Errors handled at right level

### Logging
- [ ] **Consistent logging** - Same logger everywhere
- [ ] **No duplicate loggers** - One logger instance
- [ ] **Proper log levels** - Consistent use of log levels

## 🔌 API & Routes

### API Endpoints
- [ ] **No duplicate routes** - Same endpoint defined multiple times
- [ ] **Consistent route structure** - Same pattern for all routes
- [ ] **Proper route organization** - Routes in correct directories
- [ ] **No conflicting routes** - Routes that overlap

### API Utilities
- [ ] **Single auth utility** - One auth implementation
- [ ] **Single rate limiting** - One rate limiter
- [ ] **Single response format** - Consistent API responses

## 🗄️ Database & Data

### Database Types
- [ ] **Single type source** - Types from one generated file
- [ ] **No manual type duplicates** - Types not duplicated manually
- [ ] **Proper type imports** - Types imported from correct location

### Data Access
- [ ] **Single client instance** - One Supabase client
- [ ] **No duplicate queries** - Same query in multiple places
- [ ] **Consistent data access pattern** - Same pattern everywhere

## 🎨 UI & Components

### Component Organization
- [ ] **No duplicate components** - Same component in multiple places
- [ ] **Proper component structure** - Components in correct directories
- [ ] **Consistent component patterns** - Same structure for similar components

### Styling
- [ ] **No duplicate styles** - Same styles in multiple places
- [ ] **Consistent styling approach** - Tailwind vs CSS modules vs styled-components
- [ ] **No unused styles** - Styles that are never used

## 🔐 Security

### Authentication
- [ ] **Single auth implementation** - One auth system
- [ ] **No duplicate auth logic** - Auth logic in one place
- [ ] **Proper session management** - Consistent session handling
- [ ] **No secrets in code** - All secrets in environment variables
- [ ] **No API keys committed** - Use .env files instead
- [ ] **No database credentials in code** - Use connection strings from env
- [ ] **No JWT secrets in code** - Use environment variables
- [ ] **.env files gitignored** - Only .env.example committed

### Validation
- [ ] **No duplicate validations** - Same validation in multiple places
- [ ] **Consistent validation** - Same validation library/pattern
- [ ] **Proper input sanitization** - Consistent sanitization

## 📊 Monitoring & Analytics

### Logging & Tracking
- [ ] **Single analytics implementation** - One analytics system
- [ ] **No duplicate tracking** - Same events tracked multiple times
- [ ] **Consistent event naming** - Same naming convention

## 🚀 Performance

### Optimization
- [ ] **No duplicate data fetching** - Same data fetched multiple times
- [ ] **Proper caching** - Consistent caching strategy
- [ ] **No duplicate computations** - Same computation in multiple places

## 📋 Import/Export Patterns

### Import Consistency
- [ ] **Consistent import paths** - All use absolute paths from root
- [ ] **No mixed import styles** - Not mixing relative and absolute
- [ ] **Proper barrel exports** - Using index.ts correctly
- [ ] **No circular barrel exports** - Index files don't create cycles

### Export Consistency
- [ ] **Consistent export style** - Named vs default exports
- [ ] **No duplicate exports** - Same thing exported multiple times
- [ ] **Proper re-exports** - Re-exports from correct locations

## 🛠️ Tools & Scripts

### Build Tools
- [ ] **Single build system** - One way to build
- [ ] **No conflicting scripts** - Scripts that do the same thing
- [ ] **Proper script organization** - Scripts in correct locations

### Development Tools
- [ ] **Single dev server** - One way to run dev
- [ ] **Consistent tooling** - Same tools for same purposes
- [ ] **No duplicate tool configs** - Same tool configured multiple times

## ✅ Verification Steps

### Before Importing Each File
1. [ ] Check if file has duplicate
2. [ ] Check if file has circular dependencies
3. [ ] Check if file has unused imports
4. [ ] Check if file follows naming conventions
5. [ ] Check if file is in correct directory

### After Importing Each File
1. [ ] Run type check: `pnpm type-check`
2. [ ] Run linter: `pnpm lint`
3. [ ] Verify imports resolve
4. [ ] Check for circular dependencies
5. [ ] Verify no duplicate code

### Periodic Checks
1. [ ] Run dependency analysis: `node analyze-dependencies.js`
2. [ ] Check for unused exports
3. [ ] Check for dead code
4. [ ] Review file structure
5. [ ] Check for naming inconsistencies

## 🔍 Tools to Help

### Automated Checks
- **TypeScript compiler** - `pnpm type-check` - Catches type errors and some circular deps
- **ESLint** - `pnpm lint` - Catches unused imports, code quality issues
- **Dependency analysis** - `pnpm check:circular` - Detects circular dependencies
- **Unused exports** - `pnpm check:unused` - Finds potentially unused exports
- **Naming consistency** - `pnpm check:naming` - Checks naming patterns
- **All checks** - `pnpm check:all` - Runs all checks at once
- **Duplicate finder** - `node scripts/compare-duplicates.js` - For file comparison

### Manual Checks
- **Code review** - Review each imported file
- **Dependency graph** - Visualize import relationships
- **Search codebase** - Search for duplicate function names
- **Type checking** - Ensure all types are properly defined

## 📝 Notes

- Check this list before importing each file
- Mark items as you verify them
- Add new items as you discover issues
- Review periodically during import process

