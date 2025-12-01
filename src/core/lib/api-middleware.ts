/**
 * Generate a unique request ID for tracking requests
 */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

