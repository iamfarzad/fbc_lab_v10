// Removed Next.js dependency - this is a Vite project
// Minimal NextRequest type for compatibility
interface NextRequest extends Request {
  cookies?: {
    get: (name: string) => { value: string } | undefined
  }
  nextUrl?: URL
}

export const SESSION_HEADER = 'x-intelligence-session-id'
export const LEGACY_SESSION_HEADER = 'x-session-id'
export const SESSION_COOKIE = 'fbc_session_id'
export const SESSION_QUERY = 'sessionId'
const SESSION_STORAGE_KEY = SESSION_COOKIE

function generateRawSessionId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID()
  }
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint32Array(4)
    cryptoApi.getRandomValues(bytes)
    return Array.from(bytes).map((value) => value.toString(16).padStart(8, '0')).join('')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeSessionId(raw?: string | null): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) {
    return `sess_${generateRawSessionId()}`
  }
  return trimmed
}

function readCookieFromHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [name, value] = part.split('=').map((segment) => segment.trim())
    if (name === SESSION_COOKIE && typeof value === 'string' && value.length > 0) {
      return decodeURIComponent(value)
    }
  }
  return undefined
}

function readCookieFromRequest(req: NextRequest | Request): string | undefined {
  const maybeNext = req as NextRequest
  if (typeof maybeNext.cookies?.get === 'function') {
    const cookie = maybeNext.cookies.get(SESSION_COOKIE)
    if (cookie?.value) {
      return cookie.value
    }
  }
  return readCookieFromHeader(req.headers.get('cookie'))
}

export function getSessionIdFromRequest(req: NextRequest | Request): string {
  const queryValue = (() => {
    try {
      if ('nextUrl' in req && req.nextUrl) {
        return req.nextUrl.searchParams.get(SESSION_QUERY)
      }
      const url = new URL(req.url)
      return url.searchParams.get(SESSION_QUERY)
    } catch {
      return null
    }
  })()

  const headerValue = req.headers.get(SESSION_HEADER) || req.headers.get(LEGACY_SESSION_HEADER)
  const cookieValue = readCookieFromRequest(req)
  const candidate = queryValue || headerValue || cookieValue || ''
  return typeof candidate === 'string' ? candidate.trim() : ''
}

function persistClientSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  } catch {
    // Ignore storage failures (Safari private mode, etc.)
  }
  try {
    const maxAge = 60 * 60 * 24 * 30 // 30 days
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; path=/; max-age=${maxAge}; SameSite=Lax`
  } catch {
    // Ignore cookie failures
  }
}

function readClientStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function readClientCookie(): string | null {
  if (typeof document === 'undefined') return null
  return readCookieFromHeader(typeof document.cookie === 'string' ? document.cookie : null) ?? null
}

function readClientQuery(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get(SESSION_QUERY)
  } catch {
    return null
  }
}

export function getOrCreateClientSessionId(): string {
  if (typeof window === 'undefined') {
    return normalizeSessionId()
  }

  const fromQuery = readClientQuery()
  const fromStorage = readClientStorage()
  const fromCookie = readClientCookie()
  const resolved = fromQuery || fromStorage || fromCookie
  const sessionId = normalizeSessionId(resolved)
  persistClientSessionId(sessionId)
  return sessionId
}

export function withSessionHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {})
  const sessionId = getOrCreateClientSessionId()
  headers.set(SESSION_HEADER, sessionId)
  headers.set(LEGACY_SESSION_HEADER, sessionId)
  return {
    ...init,
    headers,
  }
}
