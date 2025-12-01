/**
 * Type-safe guards for accessing unknown data
 */

export function getString(data: unknown, key: string): string | undefined {
    if (!data || typeof data !== 'object') return undefined
    const value = (data as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : undefined
}

export function getNumber(data: unknown, key: string): number | undefined {
    if (!data || typeof data !== 'object') return undefined
    const value = (data as Record<string, unknown>)[key]
    return typeof value === 'number' ? value : undefined
}

export function getRecord(data: unknown, key: string): Record<string, unknown> | undefined {
    if (!data || typeof data !== 'object') return undefined
    const value = (data as Record<string, unknown>)[key]
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

export function getArray(data: unknown, key: string): unknown[] | undefined {
    if (!data || typeof data !== 'object') return undefined
    const value = (data as Record<string, unknown>)[key]
    return Array.isArray(value) ? value : undefined
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}
