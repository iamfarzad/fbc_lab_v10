# FBC Lab v10

Clean project structure for FBC Lab - importing and organizing codebase.

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Verify setup:**
   ```bash
   pnpm type-check
   pnpm lint
   ```

3. **Start importing files:**
   - See [docs/README.md](./docs/README.md) for documentation
   - Follow [docs/IMPORT_ORDER.md](./docs/IMPORT_ORDER.md) for import sequence

## Documentation

All documentation is in the [`docs/`](./docs/) directory:

- **[Documentation Index](./docs/README.md)** - Start here
- **[Import Strategy](./docs/IMPORT_STRATEGY.md)** - Overall plan
- **[Import Order](./docs/IMPORT_ORDER.md)** - File import sequence
- **[Project Configuration](./docs/PROJECT_CONFIG.md)** - Build tool, import paths

## Project Structure

```
fbc_lab_v10/
├── docs/                    # Documentation
├── components/             # React components (to be imported)
├── services/               # Frontend services (to be imported)
├── utils/                  # Utilities (to be imported)
├── src/                    # Core source code (to be imported)
├── server/                 # WebSocket server (to be imported)
├── api/                    # API routes (to be imported)
└── what_to_import.md      # Import map analysis
```

## Build Tool

- **Vite + React + TypeScript**
- **Import paths:** Absolute from root (no `@/` alias)
  - Use: `components/X`, `services/Y`, `src/Z`
  - Don't use: `@/components/X` or `../components/X`

## Scripts

```bash
pnpm dev              # Development server
pnpm build            # Build for production
pnpm type-check       # TypeScript type checking
pnpm lint             # ESLint linting
pnpm lint:fix         # Fix linting issues
pnpm test             # Run tests
pnpm check:all        # Run all checks (type, lint, circular, unused, naming)
```

## Git Workflow

**Before committing:**
- ✅ Type check runs automatically (pre-commit hook)
- ✅ Lint check runs automatically (pre-commit hook)
- ✅ Tests run automatically (pre-push hook)

**Commit guidelines:**
- Use conventional commits: `import: add types.ts`
- Only commit working code
- See [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md) for details

## Status

- ✅ Project structure planned
- ✅ TypeScript & ESLint configured
- ✅ Import strategy defined
- ✅ Context preservation system set up
- ⏳ Importing files (ready to start)

**Current Status:** See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed progress.

**For AI Assistant:** Read [.cursor/START_HERE.md](./.cursor/START_HERE.md) first in new sessions.

See [docs/SETUP_COMPLETE.md](./docs/SETUP_COMPLETE.md) for setup status.

