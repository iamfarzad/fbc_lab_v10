#!/usr/bin/env node

/**
 * Helper script to guide deployment verification
 * Use with Vercel MCP
 */

console.log(`
=== Deployment Verification Guide ===

This script helps you verify deployments using the Vercel MCP.

Prerequisites:
1. Vercel project is set up
2. Deployment has been made

Verification Steps (use Vercel MCP):

1. List projects
   - mcp_Vercel_list_projects({ teamId: "your-team-id" })
   - Find your project ID

2. Get project details
   - mcp_Vercel_get_project({ projectId: "prj_...", teamId: "team_..." })
   - Verify project config

3. List deployments
   - mcp_Vercel_list_deployments({ projectId: "prj_...", teamId: "team_..." })
   - Check latest deployment

4. Get deployment details
   - mcp_Vercel_get_deployment({ idOrUrl: "deployment-url", teamId: "team_..." })
   - Verify deployment status

5. Check build logs
   - mcp_Vercel_get_deployment_build_logs({ idOrUrl: "deployment-url", teamId: "team_..." })
   - Look for errors
   - Verify build succeeded

6. Test deployment URL
   - Use browser MCP to navigate to deployment URL
   - Test functionality
   - Check for errors

7. Verify environment variables
   - Check Vercel dashboard: Settings → Environment Variables
   - Verify all required vars are set
   - Check values are correct (not placeholders)

Common Issues to Check:
- Build failures
- Missing environment variables
- Type errors in build
- Import errors
- Missing dependencies
- Runtime errors

After verification:
- If issues found, fix and redeploy
- If successful, mark deployment as verified

See docs/TESTING_AND_CLEANUP_STRATEGY.md for full strategy.
`)

