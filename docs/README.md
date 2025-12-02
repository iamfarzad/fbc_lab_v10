# Documentation Index

This directory contains all project documentation, organized by purpose, phase, and function.

**Last Updated:** 2025-12-01
**Current Focus:** V8 to V10 Migration & Intelligence System Integration

## 🚀 Quick Start

**New to the project? Start here:**
1. **[Project Status](../PROJECT_STATUS.md)** - The single source of truth for current progress (Root directory).
2. **[Import Process Summary](./README_IMPORT_PROCESS.md)** - Overview of how we are migrating from V8 to V10.
3. **[Strict Import Rules](./STRICT_IMPORT_RULES.md)** - **CRITICAL:** Rules for importing files to maintain code quality.
4. **[Project Configuration](./PROJECT_CONFIG.md)** - Build tools, directory structure, and path conventions.

## 📊 Project Status & Reports

Tracking the migration progress through defined phases.

### Phase Status
- **[Phase 1: Foundation](./PHASE_1_COMPLETE.md)** - ✅ Types, Config, Utilities, Schemas.
- **[Phase 2: Context & Security](./PHASE_2_FINAL_STATUS.md)** - ✅ Context Schema, Capabilities, Security, Embeddings.
- **[Phase 3: Agent Deployment](./PHASE_3_AGENT_DEPLOYMENT.md)** - 🚧 **Current:** Migrating agents and intelligence systems.

### Gap Analysis & Comparisons
- **[Comprehensive Gap Analysis](./COMPREHENSIVE_GAP_ANALYSIS.md)** - Detailed breakdown of missing vs. migrated features.
- **[Gap Analysis vs Plan](./GAP_ANALYSIS_VS_PLAN.md)** - Tracking progress against the initial gap analysis.
- **[V8 to V10 Comparison](./V8_V10_COMPARISON.md)** - Architecture and feature comparison between versions.
- **[V8 Import Status](./V8_IMPORT_STATUS.md)** - Detailed status of V8 file imports.

## 🛠️ Operational Guides

Guides for developing, deploying, and maintaining the system.

### Development & Workflow
- **[Git Workflow](./GIT_WORKFLOW.md)** - Branching, committing, and version control rules.
- **[Secrets Management](./SECRETS_MANAGEMENT.md)** - Handling API keys and environment variables.
- **[Type Check & Lint](./TYPE_CHECK_AND_LINT.md)** - TypeScript, ESLint, and Prettier standards.
- **[Agent Deployment Instructions](./AGENT_DEPLOYMENT_INSTRUCTIONS.md)** - Guide for deploying new agents.
- **[Parallel Agent Strategy](./PARALLEL_AGENT_STRATEGY.md)** - Managing multiple AI agents working on the codebase.

### Deployment & Infrastructure
- **[Deployment Overview](./DEPLOYMENT.md)** - General deployment strategy (Vercel, Fly.io, Supabase).
- **[Fly.io Deployment](./FLY_DEPLOYMENT.md)** - Specific guide for backend deployment.
- **[WebSocket Configuration](./WEBSOCKET_CONFIG.md)** - Setting up real-time communication.
- **[Environment Files](./ENVIRONMENT_FILES.md)** - Configuration for local vs. production environments.
- **[Logging & Monitoring](./LOGGING_AND_MONITORING.md)** - System observability guide.

## 📋 Import Process Resources

Tools and references for the migration process.

- **[Import Strategy](./IMPORT_STRATEGY.md)** - The overarching plan for the migration.
- **[Import Order](./IMPORT_ORDER.md)** - Master list of files to import in priority order.
- **[Duplicate Comparison](./DUPLICATE_COMPARISON_CHECKLIST.md)** - Process for resolving file duplicates.
- **[Cleanup Checklist](./CLEANUP_CHECKLIST.md)** - Ensuring a clean codebase after imports.

## 🔍 Technical Documentation

Deep dives into specific system components.

- **[Agent Coordination](./AGENT_COORDINATION.md)** - How agents interact and collaborate.
- **[MCP Tools Guide](./MCP_TOOLS_GUIDE.md)** - Using Model Context Protocol tools.
- **[Test Strategy](./TESTING_AND_CLEANUP_STRATEGY.md)** - Testing frameworks and procedures.
- **[CI/CD Options](./CI_CD_OPTIONS.md)** - Continuous Integration/Deployment pipeline options.

## 📂 File Organization

```
docs/
├── README.md                          # This index file
├── PROJECT_CONFIG.md                  # Core configuration
├── STRICT_IMPORT_RULES.md             # Mandatory import rules
│
├── status/                            # Progress tracking
│   ├── PHASE_1_COMPLETE.md
│   ├── PHASE_2_FINAL_STATUS.md
│   └── ...
│
├── analysis/                          # System analysis
│   ├── COMPREHENSIVE_GAP_ANALYSIS.md
│   ├── V8_V10_COMPARISON.md
│   └── ...
│
└── guides/                            # Operational guides
    ├── DEPLOYMENT.md
    ├── GIT_WORKFLOW.md
    └── ...
```

*Note: Some files listed in "File Organization" are conceptually grouped but reside in the root `docs/` folder for accessibility.*
