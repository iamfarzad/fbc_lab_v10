
import React, { useState, useRef } from 'react';
import { getDomain, decodeBase64, formatBytes } from './UIHelpers';

// --- WebPreviewCard ---
export const WebPreviewCard: React.FC<{ title: string; url: string; type: 'web' | 'map'; className?: string }> = ({ title, url, type, className }) => {
    const domain = getDomain(url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`
                flex flex-col justify-between p-3 rounded-xl border transition-all duration-200 group/card 
                min-w-[140px] md:min-w-[160px] max-w-[200px] flex-1
                bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800
                hover:border-zinc-400 dark:hover:border-zinc-600
                ${className}
            `}
        >
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    {type === 'web' ? (
                        <img 
                            src={faviconUrl} 
                            alt="" 
                            className="w-4 h-4 rounded-sm opacity-80 filter grayscale group-hover/card:grayscale-0 transition-all" 
                            onError={(e) => {e.currentTarget.style.display = 'none'}}
                        />
                    ) : (
                        <svg className="w-4 h-4 text-zinc-500 group-hover/card:text-zinc-800 dark:group-hover/card:text-zinc-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    )}
                    <span className="text-[10px] font-mono opacity-50 truncate w-full">{domain || (type === 'map' ? 'Google Maps' : 'Web Source')}</span>
                </div>
                <span className="text-[11px] font-semibold leading-snug line-clamp-2 text-zinc-700 dark:text-zinc-300 group-hover/card:text-black dark:group-hover/card:text-white transition-colors">
                    {title}
                </span>
            </div>
        </a>
    );
};

// --- Lightbox ---
export const Lightbox: React.FC<{ attachment: any; onClose: () => void }> = ({ attachment, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    const isImage = attachment.type === 'image' || attachment.mimeType?.startsWith('image/');

    const handleWheel = (e: React.WheelEvent) => {
        if (!isImage) return;
        e.stopPropagation();
        const delta = -e.deltaY * 0.001;
        setScale(s => Math.min(Math.max(0.5, s + delta), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isImage || scale <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const textContent = !isImage ? (attachment.textContent || (attachment.data ? decodeBase64(attachment.data as string) : '')) : '';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in-up" onClick={onClose}>
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-[101]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div 
                className="relative w-full h-full flex items-center justify-center overflow-hidden p-4"
                onClick={e => e.stopPropagation()}
                onWheel={handleWheel}
            >
                {isImage ? (
                    <img 
                        ref={imageRef}
                        src={attachment.url} 
                        alt="Preview"
                        className="max-w-full max-h-full object-contain transition-transform duration-75 will-change-transform"
                        style={{ 
                            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        draggable={false}
                    />
                ) : (
                    <div className="max-w-3xl w-full max-h-[85vh] bg-[#1e1e1e] rounded-xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
                         <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span className="text-xs font-mono text-white/70">{attachment.name || 'Text Document'}</span>
                            </div>
                            <span className="text-[10px] font-mono text-white/30 uppercase">{attachment.mimeType}</span>
                         </div>
                         <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#1a1a1a]">
                             <pre className="text-xs md:text-sm font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
                                 {textContent}
                             </pre>
                         </div>
                    </div>
                )}
                
                {isImage && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white/50 text-[10px] pointer-events-none">
                        Scroll to Zoom • Drag to Pan
                    </div>
                )}
            </div>
        </div>
    );
};

// --- StagingArea ---
interface StagingAreaProps {
    selectedFile: any;
    onRemove: () => void;
}

export const StagingArea: React.FC<StagingAreaProps> = ({ selectedFile, onRemove }) => {
    if (!selectedFile) return null;
    
    return (
        <div className="w-full animate-fade-in-up">
             <div className="flex items-center gap-4 p-3 bg-white/50 dark:bg-black/40 backdrop-blur-sm rounded-xl border border-white/40 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/5 mx-auto max-w-full">
                 {/* Preview Icon/Image */}
                 <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                     {selectedFile.type === 'image' ? (
                         <img src={selectedFile.url} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                         <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                     )}
                 </div>
                 
                 {/* Metadata */}
                 <div className="flex-1 min-w-0">
                     <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate pr-2" title={selectedFile.name}>{selectedFile.name}</h4>
                     <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                         <span className="uppercase font-medium tracking-wider">{selectedFile.mimeType.split('/')[1]}</span>
                         <span className="w-0.5 h-0.5 rounded-full bg-gray-400"></span>
                         <span>{formatBytes(selectedFile.size as number)}</span>
                     </div>
                 </div>

                 {/* Remove Action */}
                 <button 
                    onClick={onRemove}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove file"
                 >
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
             </div>
        </div>
    );
}