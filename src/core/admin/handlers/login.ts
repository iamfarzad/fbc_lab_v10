/**
 * Admin Login Route Handler
 * 
 * NOTE: This file is still used but NOT counted as a separate Serverless Function.
 * It's dynamically imported by api/admin/route.ts via the admin router.
 * 
 * Do NOT delete this file - it's required for dynamic imports.
 * See: api/admin/README.md for architecture details
 */

// import { respond } from '../../lib/api/response' // Not used in this route
import { createToken } from '../../security/auth.js'
import { logger } from '../../../lib/logger.js'

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as { password?: string }

    if (!password) {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    if (password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ownerEmail = 'farzad@farzadbayat.com'
    const token = await createToken({
      userId: ownerEmail,
      email: ownerEmail,
      role: 'admin'
    })

    const response = new Response(JSON.stringify({ success: true, user: { email: ownerEmail, role: 'admin' } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `adminToken=${token}; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`
      },
    })

    return response
  } catch (error) {
    logger.error('Admin login error', error instanceof Error ? error : undefined)
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
