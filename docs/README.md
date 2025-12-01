# Documentation Index

This directory contains all project documentation organized by purpose.

## 🚀 Getting Started

**Start here if you're new:**
1. [Import Process Summary](./README_IMPORT_PROCESS.md) - Overview of the import process
2. [Project Configuration](./PROJECT_CONFIG.md) - Build tool, import paths, project structure

## 📋 Import Strategy & Process

### Core Documents
- **[Import Strategy](./IMPORT_STRATEGY.md)** - Overall strategy, file structure, decisions
- **[Import Order](./IMPORT_ORDER.md)** - Prioritized import list (128 files in order)
- **[Duplicate Comparison Checklist](./DUPLICATE_COMPARISON_CHECKLIST.md)** - Step-by-step process for comparing duplicates
- **[Cleanup Checklist](./CLEANUP_CHECKLIST.md)** - Comprehensive checklist to prevent duplicates and gaps

### Quick Reference
- **[Import Process Summary](./README_IMPORT_PROCESS.md)** - Quick overview and workflow

## ⚙️ Configuration

- **[Project Configuration](./PROJECT_CONFIG.md)** - Build tool (Vite), import paths, project structure
- **[Type Check & Lint Setup](./TYPE_CHECK_AND_LINT.md)** - TypeScript, ESLint, Prettier configuration
- **[Deployment](./DEPLOYMENT.md)** - Vercel, Fly.io, Supabase deployment setup
- **[Fly.io Deployment](./FLY_DEPLOYMENT.md)** - Detailed Fly.io server deployment guide
- **[WebSocket Configuration](./WEBSOCKET_CONFIG.md)** - WebSocket setup (local vs production)
- **[Environment Files](./ENVIRONMENT_FILES.md)** - .env files guide (local vs production)
- **[Deployment Summary](./DEPLOYMENT_SUMMARY.md)** - Quick deployment reference
- **[Git Workflow](./GIT_WORKFLOW.md)** - Complete commit guidelines, hooks, and workflow
- **[Git Setup](./GIT_SETUP.md)** - How to set up Git hooks
- **[Git Setup Guide](./GIT_SETUP_GUIDE.md)** - How to set up local and remote repository
- **[Commit Guidelines](./COMMIT_GUIDELINES.md)** - Quick commit reference
- **[Secrets Management](./SECRETS_MANAGEMENT.md)** - **CRITICAL:** How to handle API keys and secrets
- **[Setup Complete](./SETUP_COMPLETE.md)** - Summary of completed setup tasks

## 📊 Analysis & Data

- **[Import Map](../what_to_import.md)** - Complete file import and rendering map (3316 lines)
  - Generated analysis of all file imports
  - Dependency relationships
  - Component rendering map

## 🛠️ Tools & Scripts

### Custom Scripts (in `scripts/` directory)
- `analyze-dependencies.js` - Analyzes import map, identifies dependency levels
- `analyze-import-patterns.js` - Analyzes import patterns (absolute vs relative vs @ alias)
- `compare-duplicates.js` - Compares duplicate files
- `check-secrets.js` - **Detects API keys and secrets** (runs automatically before commit)
- `check-circular-deps.js` - Detects circular dependencies
- `check-unused-exports.js` - Finds potentially unused exports
- `check-naming-consistency.js` - Checks naming consistency
- `test-browser-e2e.js` - Guide for browser E2E testing
- `verify-deployment.js` - Guide for deployment verification

**Run with:** `pnpm check:secrets`, `pnpm check:circular`, `pnpm check:unused`, `pnpm check:naming`, or `pnpm check:all`

### MCP Tools Available
- **Browser Extension MCP** - E2E testing, visual verification, accessibility
- **Vercel MCP** - Deployment verification, build logs, environment checks
- **shadcn MCP** - UI component reference (for component development)

See [Testing & Cleanup Strategy](./TESTING_AND_CLEANUP_STRATEGY.md), [MCP Tools Guide](./MCP_TOOLS_GUIDE.md), and [Logging & Monitoring](./LOGGING_AND_MONITORING.md) for how to use these tools.

## 📊 Project Status & Gaps

- **[Gap Analysis](./GAP_ANALYSIS.md)** - What's missing and what we need
- **[Readiness Checklist](./READINESS_CHECKLIST.md)** - Verify we're ready to import
- **[Context Preservation](./CONTEXT_PRESERVATION.md)** - How context is maintained
- **[CI/CD Options](./CI_CD_OPTIONS.md)** - CI/CD options (FREE alternatives)

## Document Purpose Guide

### When to read what:

**Before starting imports:**
1. Read [Import Strategy](./IMPORT_STRATEGY.md) - Understand the plan
2. Read [Project Configuration](./PROJECT_CONFIG.md) - Understand import paths
3. Read [Type Check & Lint Setup](./TYPE_CHECK_AND_LINT.md) - Understand code quality setup

**During imports:**
1. Follow [Import Order](./IMPORT_ORDER.md) - Import files in order
2. Use [Duplicate Comparison Checklist](./DUPLICATE_COMPARISON_CHECKLIST.md) - For duplicate files
3. Reference [Import Process Summary](./README_IMPORT_PROCESS.md) - Quick workflow

**For reference:**
- [Import Map](../what_to_import.md) - Complete dependency analysis
- [Setup Complete](./SETUP_COMPLETE.md) - What's been set up

## File Organization

```
docs/
├── README.md                          # This file - documentation index
├── ORGANIZATION.md                    # Documentation organization guide
├── README_IMPORT_PROCESS.md          # Import process overview
├── IMPORT_STRATEGY.md                 # Main strategy document
├── IMPORT_ORDER.md                    # Prioritized import list
├── DUPLICATE_COMPARISON_CHECKLIST.md  # Duplicate comparison process
├── PROJECT_CONFIG.md                  # Project configuration
├── TYPE_CHECK_AND_LINT.md             # TypeScript/ESLint setup
└── SETUP_COMPLETE.md                  # Setup summary

Root:
├── README.md                          # Project overview
├── what_to_import.md                  # Import map (large data file)
├── analyze-dependencies.js            # Analysis tool
├── analyze-import-patterns.js         # Pattern analysis tool
└── compare-duplicates.js               # Duplicate comparison tool
```

See [ORGANIZATION.md](./ORGANIZATION.md) for detailed organization structure.

## Quick Links

- **Start importing?** → [Import Order](./IMPORT_ORDER.md)
- **Found a duplicate?** → [Duplicate Comparison Checklist](./DUPLICATE_COMPARISON_CHECKLIST.md)
- **Want to prevent issues?** → [Cleanup Checklist](./CLEANUP_CHECKLIST.md)
- **Testing & cleanup?** → [Testing & Cleanup Strategy](./TESTING_AND_CLEANUP_STRATEGY.md) | [MCP Tools Guide](./MCP_TOOLS_GUIDE.md)
- **Monitoring logs?** → [Logging & Monitoring](./LOGGING_AND_MONITORING.md) | [Quick Reference](./LOG_MONITORING_QUICK_REF.md)
- **Need import path?** → [Project Configuration](./PROJECT_CONFIG.md)
- **Deploying?** → [Deployment](./DEPLOYMENT.md) | [Deployment Summary](./DEPLOYMENT_SUMMARY.md)
- **Type errors?** → [Type Check & Lint Setup](./TYPE_CHECK_AND_LINT.md)

