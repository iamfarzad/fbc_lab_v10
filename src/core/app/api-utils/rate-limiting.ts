// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

/**
 * Admin rate limiting middleware
 * Returns an error response if rate limit exceeded, null if allowed
 * Works with standard Request objects
 */
export function adminRateLimit(
  request: Request | { headers: Headers | { [key: string]: string | string[] | undefined } }
): Response | null {
  let ip: string = 'unknown';
  
  if (request instanceof Request) {
    ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  } else if (request.headers instanceof Headers) {
    ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  } else {
    const forwardedFor = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
         (Array.isArray(realIp) ? realIp[0] : realIp) ||
         'unknown';
  }
  
  const key = `admin:${ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return null; // Allowed
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  record.count++;
  return null; // Allowed
}

