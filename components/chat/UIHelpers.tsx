
import React from 'react';

export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-900/90 dark:bg-white/90 backdrop-blur-sm text-white dark:text-black text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 dark:border-black/10">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90 dark:border-t-white/90"></div>
      </div>
    </div>
  );
};

export const Shimmer: React.FC = () => (
  <div className="w-full max-w-[240px] p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-3 mt-2 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse">
    <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-ping"></div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-600 font-medium">Thinking...</span>
    </div>
    <div className="space-y-1.5">
        <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
        <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
    </div>
  </div>
);

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
