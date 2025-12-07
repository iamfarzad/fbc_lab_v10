# Project Guidelines for Junie

These guidelines tell Junie how to understand, build, test, and contribute changes to this repository with minimal, safe edits.

Project overview
- Name: FBC Lab v10 — clean project structure for importing and organizing a codebase.
- Stack: Vite + React + TypeScript on the frontend; Node/WebSocket server; Vercel serverless API routes.
- Primary docs: See README.md and the docs/ folder for import strategy and workflow.

Repository structure (high-level)
- components/ — React UI components
- services/ — Frontend services
- utils/ — Shared utilities
- src/ — Core source code (agents, orchestration, etc.)
- api/ — Serverless API routes (Vercel)
- server/ — Live WebSocket/dev server
- docs/ — Documentation (import strategy, project config, workflow)
- test/ and e2e/ — Tests and end-to-end helpers
- scripts/ — Project maintenance and verification scripts
- .junie/ — This folder with assistant guidelines

How Junie should validate changes
1) Install deps if needed
   - pnpm install
2) Run static checks
   - pnpm type-check
   - pnpm lint
3) Run tests (if relevant files changed or issue requires)
   - Unit tests: pnpm test
   - Coverage (optional): pnpm test:coverage
   - Tool e2e (opt-in): ENABLE_E2E_TOOL_TESTS=1 pnpm test:e2e:tools
4) Build
   - Frontend build: pnpm build
   - Server build (when backend/server changes are made): pnpm build:server
5) All-in-one verification
   - pnpm check:all  (secrets, types, lint, circular, unused, naming, duplicates)

Development scripts (common)
- pnpm dev             — Start Vite dev server
- pnpm dev:server      — Start live WebSocket server
- pnpm dev:api         — Start Vercel dev for API routes
- pnpm dev:all         — Run frontend + websocket + api together

Import and path conventions
- Absolute imports from repo root (no @ alias). Use: components/X, services/Y, src/Z.
- Avoid relative deep paths like ../../../ when a root path is available.

Code style and quality
- TypeScript strictness is enforced via pnpm type-check.
- ESLint + Prettier are configured; run pnpm lint and pnpm lint:fix as needed.
- Commit guidelines follow conventional commits (e.g., "feat:", "fix:", or project-specific like "import:").

Git workflow notes
- Pre-commit hooks run type-check and lint automatically.
- Pre-push runs tests. Keep changes minimal and ensure checks pass before submission.

When implementing issues
- Prefer minimal, targeted edits that satisfy the issue.
- Update or add tests only when required by the change.
- If you alter API/server or build behavior, run the corresponding build step(s) and tests.
- Keep documentation in sync (README.md or docs/*) when behavior or commands change.

Useful references
- README.md — Quick start, scripts, structure overview
- docs/ — Import strategy, configuration, and workflow details
- PROJECT_STATUS.md — Current project progress/status
