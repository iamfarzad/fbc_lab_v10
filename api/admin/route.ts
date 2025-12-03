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

