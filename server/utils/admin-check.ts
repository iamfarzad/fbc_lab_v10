/**
 * Checks if a session ID belongs to an admin.
 * Replaces dependency on src/lib/admin.ts to avoid dragging in Next.js dependencies.
 */
export function ensureWsAdmin(sessionId?: string | null): boolean {
    return typeof sessionId === 'string' && sessionId.startsWith('admin-')
}
