#!/usr/bin/env node

/**
 * Generate prompts for parallel agents to fix all remaining type errors
 * Groups errors by file/category for efficient parallel work
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const SOURCE_CONFIG = JSON.parse(
  fs.readFileSync(path.join(PROJECT_ROOT, '.source-config.json'), 'utf8')
);

// Parse type-check output and group errors by file
function parseTypeErrors() {
  let output;
  try {
    output = execSync('pnpm type-check 2>&1', { encoding: 'utf8', cwd: PROJECT_ROOT });
  } catch (error) {
    // Type-check exits with non-zero when there are errors, but we still get the output
    // The output can be in error.stdout or error.output array
    if (error.stdout) {
      output = error.stdout;
    } else if (error.output && Array.isArray(error.output)) {
      output = error.output.filter(Boolean).join('');
    } else {
      output = String(error);
    }
  }
  
  const lines = output.split('\n');
  
  const errorsByFile = new Map();
  
  for (const line of lines) {
    // Match: "file.ts:line:col - error TSXXXX: message"
    // Example: "api/admin/login/route.ts(42,11): error TS6133: 'requestId' is declared but its value is never read."
    const fileMatch = line.match(/^([^(]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.+)$/);
    if (fileMatch) {
      const [, file, line, col, code, message] = fileMatch;
      
      if (!errorsByFile.has(file)) {
        errorsByFile.set(file, []);
      }
      
      errorsByFile.get(file).push({
        line: parseInt(line),
        col: parseInt(col),
        code,
        message: message.trim(),
      });
    }
  }
  
  return errorsByFile;
}

// Group files by category for agent distribution
function categorizeFiles(files) {
  const categories = {
    admin: [],
    api: [],
    components: [],
    services: [],
    server: [],
    core: [],
    utils: [],
    root: [],
  };
  
  for (const file of files) {
    if (file.startsWith('api/admin/')) {
      categories.admin.push(file);
    } else if (file.startsWith('api/')) {
      categories.api.push(file);
    } else if (file.startsWith('components/')) {
      categories.components.push(file);
    } else if (file.startsWith('services/')) {
      categories.services.push(file);
    } else if (file.startsWith('server/')) {
      categories.server.push(file);
    } else if (file.startsWith('src/core/')) {
      categories.core.push(file);
    } else if (file.startsWith('utils/')) {
      categories.utils.push(file);
    } else {
      categories.root.push(file);
    }
  }
  
  return categories;
}

// Generate agent prompt for a group of files
function generateAgentPrompt(agentId, category, files, errorsByFile) {
  const totalErrors = files.reduce((sum, file) => sum + errorsByFile.get(file).length, 0);
  const fileList = files.map(f => `- ${f} (${errorsByFile.get(f).length} errors)`).join('\n');
  
  const errorDetails = files.map(file => {
    const errors = errorsByFile.get(file);
    const errorSummary = errors.map(e => `  - Line ${e.line}: ${e.code} - ${e.message}`).join('\n');
    return `${file}:\n${errorSummary}`;
  }).join('\n\n');
  
  return `# Agent ${agentId}: Fix Type Errors - ${category.toUpperCase()}

## Objective
Fix all TypeScript type errors in the ${category} category files.

## Files to Fix (${files.length} files, ${totalErrors} errors)
${fileList}

## Error Details
\`\`\`
${errorDetails}
\`\`\`

## Instructions

1. **Read the source files** from the original codebase:
   - Source path: \`${SOURCE_CONFIG.sourcePath}\`
   - For each file, check if it exists in the source and compare implementations

2. **Fix each error systematically:**
   - **TS2307 (Cannot find module)**: 
     - Check if the module exists in the codebase
     - If missing, check the original codebase for the correct import path
     - Update import paths to use absolute paths from root (no \`@/\` aliases, no \`.js\` extensions)
   
   - **TS6133 (Unused variable)**:
     - Remove unused variables or prefix with \`_\` if needed for future use
   
   - **TS7006 (Implicit any)**:
     - Add explicit type annotations to parameters
   
   - **TS18048 / TS2532 (Possibly undefined)**:
     - Add null checks or use nullish coalescing (\`??\`)
     - Use optional chaining (\`?.\`) where appropriate
   
   - **TS2375 / TS2379 (Type not assignable)**:
     - Fix strict optional property types by explicitly setting \`undefined\` for optional properties
     - Ensure types match exactly (check \`exactOptionalPropertyTypes\` requirements)
   
   - **TS2339 (Property does not exist)**:
     - Check if the property exists in the type definition
     - Add the property if missing or use type assertion if appropriate

3. **Follow the established structure:**
   - Use absolute imports from root (e.g., \`src/lib/logger\`, not \`@/lib/logger\`)
   - No \`.js\` extensions in imports
   - Follow the file structure defined in \`PROJECT_STATUS.md\`

4. **After fixing:**
   - Run \`pnpm type-check\` to verify errors are fixed
   - Run \`pnpm lint\` to check for linting issues
   - Update \`PROJECT_STATUS.md\` with progress

5. **Validation:**
   - All type errors in your assigned files should be resolved
   - No new errors should be introduced
   - Code should follow TypeScript strict mode requirements

## Files Location
- Target files are in: \`${PROJECT_ROOT}\`
- Original source: \`${SOURCE_CONFIG.sourcePath}\`

## Success Criteria
- ✅ All type errors in assigned files are fixed
- ✅ Type check passes for your files
- ✅ No new errors introduced
- ✅ Code follows project structure and conventions

---
**Agent ID:** ${agentId}
**Category:** ${category}
**Files:** ${files.length}
**Errors:** ${totalErrors}
`;
}

// Main execution
function main() {
  console.log('🔍 Analyzing type errors...\n');
  
  const errorsByFile = parseTypeErrors();
  const files = Array.from(errorsByFile.keys());
  const categories = categorizeFiles(files);
  
  console.log(`📊 Found ${errorsByFile.size} files with errors\n`);
  
  // Generate prompts for each category
  const prompts = [];
  let agentId = 1;
  
  for (const [category, categoryFiles] of Object.entries(categories)) {
    if (categoryFiles.length === 0) continue;
    
    const totalErrors = categoryFiles.reduce((sum, file) => sum + errorsByFile.get(file).length, 0);
    
    // Split large categories into multiple agents
    if (totalErrors > 30 && categoryFiles.length > 3) {
      // Split into chunks
      const chunkSize = Math.ceil(categoryFiles.length / 2);
      for (let i = 0; i < categoryFiles.length; i += chunkSize) {
        const chunk = categoryFiles.slice(i, i + chunkSize);
        prompts.push({
          agentId: agentId++,
          category: `${category}-${Math.floor(i / chunkSize) + 1}`,
          files: chunk,
        });
      }
    } else {
      prompts.push({
        agentId: agentId++,
        category,
        files: categoryFiles,
      });
    }
  }
  
  // Generate prompt files
  const promptsDir = path.join(PROJECT_ROOT, 'docs', 'error-fix-prompts');
  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true });
  }
  
  console.log(`📝 Generating ${prompts.length} agent prompts...\n`);
  
  const summary = [];
  
  for (const prompt of prompts) {
    const promptText = generateAgentPrompt(
      prompt.agentId,
      prompt.category,
      prompt.files,
      errorsByFile
    );
    
    const filename = `agent-${String(prompt.agentId).padStart(2, '0')}-${prompt.category}.md`;
    const filepath = path.join(promptsDir, filename);
    
    fs.writeFileSync(filepath, promptText);
    
    const totalErrors = prompt.files.reduce((sum, file) => sum + errorsByFile.get(file).length, 0);
    summary.push({
      agent: prompt.agentId,
      category: prompt.category,
      files: prompt.files.length,
      errors: totalErrors,
      filename,
    });
    
    console.log(`✅ Generated: ${filename} (${prompt.files.length} files, ${totalErrors} errors)`);
  }
  
  // Generate deployment guide
  const deploymentGuide = `# Error Fixing - Agent Deployment Guide

## Overview
${prompts.length} agents ready to fix ${errorsByFile.size} files with type errors.

## Agent Summary

${summary.map(s => `### Agent ${s.agent}: ${s.category}
- **Files:** ${s.files}
- **Errors:** ${s.errors}
- **Prompt:** \`docs/error-fix-prompts/${s.filename}\`
`).join('\n')}

## Deployment Instructions

1. **Review the prompts** in \`docs/error-fix-prompts/\`

2. **Deploy agents in parallel:**
   - Open multiple Cursor chat windows
   - Copy the prompt from each agent file
   - Paste into each chat window
   - Let agents work in parallel

3. **Monitor progress:**
   \`\`\`bash
   # Check remaining errors
   pnpm type-check 2>&1 | grep -c 'error TS'
   
   # Check errors by file
   pnpm type-check 2>&1 | grep 'error TS' | cut -d: -f1 | sort | uniq -c | sort -rn
   \`\`\`

4. **Validation:**
   - After all agents complete, run: \`pnpm type-check\`
   - Run: \`pnpm test\` to ensure tests still pass
   - Run: \`pnpm lint\` to check for linting issues

## Expected Outcome
- All 208 type errors should be fixed
- Type check should pass (or only show expected missing module errors)
- Tests should still pass (24/24)
- Code should follow project structure

## Notes
- Agents should work independently on their assigned files
- If an agent encounters a dependency issue, they should note it in their response
- Some errors may require coordination (e.g., shared types)
- Missing module errors for future phases are expected and can be ignored

---
**Generated:** ${new Date().toISOString()}
**Total Files:** ${errorsByFile.size}
**Total Agents:** ${prompts.length}
`;

  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'docs', 'ERROR_FIX_DEPLOYMENT.md'),
    deploymentGuide
  );
  
  console.log(`\n✅ Generated deployment guide: docs/ERROR_FIX_DEPLOYMENT.md\n`);
  console.log(`📋 Total: ${prompts.length} agents, ${errorsByFile.size} files, ${Array.from(errorsByFile.values()).flat().length} errors\n`);
}

main();

