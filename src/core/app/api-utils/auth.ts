import { verifyToken } from '../../security/auth.js'

/**
 * Admin authentication middleware
 * Returns an error response if authentication fails, null if successful
 * Works with standard Request objects
 */
export async function adminAuthMiddleware(
  request: Request | { headers: Headers | { [key: string]: string | string[] | undefined }; cookies?: { get?: (name: string) => { value: string } | undefined } }
): Promise<Response | null> {
  try {
    let token: string | undefined;
    
    if ('cookies' in request && request.cookies) {
      const cookie = request.cookies.get?.('adminToken');
      token = cookie?.value;
    } else if ('headers' in request) {
      if (request.headers instanceof Headers) {
        token = request.headers.get('authorization')?.replace('Bearer ', '');
      } else {
        const authHeader = request.headers['authorization'];
        token = (Array.isArray(authHeader) ? authHeader[0] : authHeader)?.replace('Bearer ', '');
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const decoded = await verifyToken(token);
    
    if (!decoded || decoded.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return null; // Authentication successful
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

