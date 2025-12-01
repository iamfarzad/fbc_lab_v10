/**
 * Response utility for API routes
 * Provides helper methods that return response objects compatible with standard Request/Response API
 */
interface ResponseLike {
  status: (code: number) => ResponseLike;
  json: (data: unknown) => ResponseLike;
  cookies: {
    set: (name: string, value: string, options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      maxAge?: number;
      path?: string;
    }) => void;
  };
}

function createResponse(status: number, data: unknown, options?: { headers?: Record<string, string> }): ResponseLike {
  // Note: Headers and response body are computed but not used in this mock implementation
  // They will be used when this is replaced with actual Response implementation
  
  return {
    status: () => createResponse(status, data, options),
    json: () => createResponse(status, data, options),
    cookies: {
      set: () => {}, // Cookie handling will be done via Set-Cookie header in actual implementation
    },
  } as unknown as ResponseLike;
}

export const respond = {
  ok: (data: unknown, options?: { status?: number; headers?: Record<string, string> }): ResponseLike => {
    return createResponse(options?.status || 200, data, options);
  },

  badRequest: (message: string): ResponseLike => {
    return createResponse(400, { error: message });
  },

  unauthorized: (message: string): ResponseLike => {
    return createResponse(401, { error: message });
  },

  serverError: (message: string): ResponseLike => {
    return createResponse(500, { error: message });
  },
};

