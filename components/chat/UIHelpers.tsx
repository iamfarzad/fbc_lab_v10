
import React from 'react';

export const Tooltip: React.FC<{ text: string; children: React.ReactNode; delay?: number }> = ({ text, children, delay = 200 }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="group relative flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-900/90 dark:bg-white/90 backdrop-blur-sm text-white dark:text-black text-[11px] font-medium rounded-lg transition-all duration-200 transform pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10 dark:border-black/10 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90 dark:border-t-white/90"></div>
      </div>
    </div>
  );
};

export const Shimmer: React.FC<{ mode?: 'idle' | 'listening' | 'thinking' | 'speaking'; hasActiveTools?: boolean }> = ({ mode = 'thinking', hasActiveTools = false }) => {
  // Determine label based on mode and tool activity
  let label = 'Thinking...';
  if (hasActiveTools) {
    label = 'Analyzing...';
  } else if (mode === 'speaking') {
    label = 'Talking...';
  } else if (mode === 'listening') {
    label = 'Listening...';
  } else if (mode === 'thinking') {
    label = 'Typing...';
  }

  return (
    <div className="w-full max-w-[240px] p-4 rounded-2xl bg-zinc-50 dark:bg-black flex flex-col gap-3 mt-2 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse">
      <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-ping"></div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-600 font-medium">{label}</span>
      </div>
      <div className="space-y-1.5">
          <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
          <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
      </div>
    </div>
  );
};

// --- Utility Functions ---

export const isTextMime = (mime: string) => {
    return mime.startsWith('text/') || 
           mime.includes('json') || 
           mime.includes('javascript') || 
           mime.includes('xml') || 
           mime.includes('csv') ||
           mime.includes('html');
};

export const decodeBase64 = (b64: string) => {
    try { return atob(b64); } catch { return "Unable to preview content"; }
};

export const getDomain = (url: string) => {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
