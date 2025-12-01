#!/usr/bin/env node

/**
 * Helper script to update PROJECT_STATUS.md
 * Ensures status is always up to date
 */

const fs = require('fs')
const path = require('path')

const statusPath = path.join(__dirname, '../PROJECT_STATUS.md')

console.log(`
=== Status Update Helper ===

This script helps ensure PROJECT_STATUS.md is kept up to date.

Current status file: ${statusPath}

To update status manually:
1. Open PROJECT_STATUS.md
2. Update relevant sections:
   - ✅ Completed - What was done
   - 🚧 In Progress - Current task
   - 📋 Next Steps - What's next
   - ⚠️ Blockers - Any issues
   - 📊 Progress Tracking - Counts

Required updates:
- After importing files
- After completing phases
- After fixing issues
- After making decisions
- At end of each session

Status file structure:
- ✅ Completed section
- 🚧 In Progress section
- 📋 Next Steps section
- ⚠️ Blockers section
- 📊 Progress Tracking section
- 🔍 Current Context section
- 📝 Session Notes section

See .cursor/context-rules.md for complete rules.
`)

// Check if status file exists
if (fs.existsSync(statusPath)) {
  const content = fs.readFileSync(statusPath, 'utf-8')
  const lastUpdated = content.match(/\*\*Last Updated:\*\* (.+)/)?.[1]
  console.log(`\nStatus file last updated: ${lastUpdated || 'Unknown'}`)
} else {
  console.log('\n⚠️  Status file not found! Create PROJECT_STATUS.md')
}

