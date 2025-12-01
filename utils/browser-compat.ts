/**
 * Browser Compatibility Checker
 * Detects required browser features and provides graceful degradation
 */

export const browserSupport = {
  canvas: !!document.createElement('canvas').getContext,
  webSocket: 'WebSocket' in window,
  getUserMedia: !!(navigator.mediaDevices?.getUserMedia),
  audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
  resizeObserver: 'ResizeObserver' in window,
  requestAnimationFrame: 'requestAnimationFrame' in window,
  cancelAnimationFrame: 'cancelAnimationFrame' in window,
  fetch: 'fetch' in window,
  localStorage: 'localStorage' in window,
  classList: 'classList' in document.createElement('div'),
  intersectionObserver: 'IntersectionObserver' in window,
};

export interface BrowserSupportResult {
  supported: boolean;
  missing: string[];
  warnings: string[];
}

export function checkBrowserSupport(): BrowserSupportResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Critical features - app won't work without these
  if (!browserSupport.canvas) missing.push('Canvas API');
  if (!browserSupport.webSocket) missing.push('WebSocket');
  if (!browserSupport.requestAnimationFrame) missing.push('requestAnimationFrame');
  if (!browserSupport.cancelAnimationFrame) missing.push('cancelAnimationFrame');
  if (!browserSupport.fetch) missing.push('Fetch API');
  if (!browserSupport.localStorage) missing.push('localStorage');

  // Important features - some functionality will be limited
  if (!browserSupport.getUserMedia) {
    warnings.push('MediaDevices API - Webcam/Audio features unavailable');
  }
  if (!browserSupport.audioContext) {
    warnings.push('Web Audio API - Audio processing unavailable');
  }
  if (!browserSupport.resizeObserver) {
    warnings.push('ResizeObserver - Some responsive features may not work');
  }
  if (!browserSupport.classList) {
    warnings.push('classList - Some UI features may not work');
  }
  if (!browserSupport.intersectionObserver) {
    warnings.push('IntersectionObserver - Some scroll features may not work');
  }

  return {
    supported: missing.length === 0,
    missing,
    warnings,
  };
}

export function getBrowserInfo(): {
  name: string;
  version: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
} {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    version = match?.[1] ?? 'Unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    version = match?.[1] ?? 'Unknown';
  } else if (ua.includes('Firefox')) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    version = match?.[1] ?? 'Unknown';
  } else if (ua.includes('Edg')) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    version = match?.[1] ?? 'Unknown';
  }

  return { name: name ?? 'Unknown', version: version ?? 'Unknown', isMobile, isIOS, isAndroid };
}

/**
 * Polyfill ResizeObserver if not available
 */
export async function polyfillResizeObserver(): Promise<void> {
  if (browserSupport.resizeObserver) return;

  try {
    const { ResizeObserver } = await import('@juggle/resize-observer');
    if (!window.ResizeObserver) {
      (window as any).ResizeObserver = ResizeObserver;
    }
  } catch (error) {
    console.warn('Failed to load ResizeObserver polyfill:', error);
  }
}

