export function isAdmin(sessionId: string | undefined | null): boolean {
    if (!sessionId) return false;
    // Simple check for now, can be expanded
    return sessionId.startsWith('admin_') || sessionId.includes('admin');
}
