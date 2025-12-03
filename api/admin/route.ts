/**
 * Single Admin Route Handler - Consolidates 19 admin routes into 1 function
 *
 * This is the ONLY admin route file that Vercel counts as a Serverless Function.
 * All admin requests are routed here via ?path= query parameter.
 *
 * IMPORTANT: The old route handler files (api/admin/[any]/route.ts) still exist
 * because they're dynamically imported by the router. They are NOT deleted.
 * Vercel doesn't count them as separate functions due to redirects in vercel.json.
 *
 * See: api/admin/README.md for full documentation
 */

import { getAdminHandler } from 'src/core/admin/admin-router'

export async function GET(req: Request) {
  return getAdminHandler('GET')(req)
}

export async function POST(req: Request) {
  return getAdminHandler('POST')(req)
}

export async function DELETE(req: Request) {
  return getAdminHandler('DELETE')(req)
}

export async function PATCH(req: Request) {
  return getAdminHandler('PATCH')(req)
}

export const dynamic = 'force-dynamic'

