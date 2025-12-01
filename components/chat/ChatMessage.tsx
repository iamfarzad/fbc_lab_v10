
import React from 'react';
import { TranscriptItem } from 'types';
import MarkdownRenderer from './MarkdownRenderer';
import { WebPreviewCard } from './Attachments';
import { isTextMime, decodeBase64, Shimmer } from './UIHelpers';
import { CalendarWidget } from './CalendarWidget';

interface ChatMessageProps {
    item: TranscriptItem;
    onPreview: (attachment: any) => void;
    isDarkMode?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ item, onPreview, isDarkMode = false }) => {
    const isUser = item.role === 'user';

    // Handle System Messages (pure text pills)
    if (item.text.startsWith('[System:') && !item.attachment) {
        return (
            <div className="flex justify-center w-full my-4 animate-fade-in-up">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-medium text-black/50 dark:text-white/50 uppercase tracking-widest">
                        {item.text.replace('[System: ', '').replace(']', '')}
                    </span>
                </div>
            </div>
        );
    }

    // Handle "Verified Handshake" Research Card
    if (item.attachment?.type === 'research-card' && item.attachment.data) {
        let data: any = {};
        try {
            data = JSON.parse(item.attachment.data);
        } catch (e) { console.error("Failed to parse research card", e); }

        return (
            <div className="flex justify-center w-full my-6 animate-fade-in-up px-4">
                <div className="w-full max-w-md bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5">
                    {/* Card Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-orange-500/10 to-blue-500/10 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {data.person?.fullName?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{data.person?.fullName}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{data.role} @ {data.company?.name}</p>
                            </div>
                        </div>
                        <div className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50">
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                Verified
                            </span>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Strategic Context</h4>
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                {data.company?.summary || "No company summary available."}
                            </p>
                        </div>

                        {data.strategic && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Competitors</h4>
                                    <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                        {data.strategic.competitors?.slice(0,3).map((c: string, i: number) => (
                                            <li key={i} className="flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-red-400"></span>
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Key Focus</h4>
                                    <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                        {data.strategic.pain_points?.slice(0,3).map((p: string, i: number) => (
                                            <li key={i} className="flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Card Footer */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400">Confidence Score: {Math.round(data.confidence * 100)}%</span>
                        <span className="text-[10px] text-slate-400 font-mono">{data.company?.domain}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Handle Calendar Booking Widget
    if (item.attachment?.type === 'calendar_widget') {
        let widgetData: any = {};
        try {
            // Try to parse data if it's a string, otherwise use directly
            if (typeof item.attachment.data === 'string') {
                widgetData = JSON.parse(item.attachment.data);
            } else if (item.attachment.data) {
                widgetData = item.attachment.data;
            }
        } catch (e) {
            console.error("Failed to parse calendar widget data", e);
        }

        // Extract widget props from attachment data or use defaults
        const title = widgetData.title || 'Book a Free Consultation';
        const description = widgetData.description || 'Schedule a 30-minute strategy call';
        const url = widgetData.url || undefined; // CalendarWidget will use default from CONTACT_CONFIG

        return (
            <div className="flex justify-center w-full my-4">
                <CalendarWidget 
                    title={title}
                    description={description}
                    url={url}
                    isDarkMode={isDarkMode}
                />
            </div>
        );
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in-up group w-full`}>
            
            {/* Attachment Bubble */}
            {item.attachment && (item.attachment.type === 'image' || item.attachment.type === 'file') && (
                <div className={`mb-2 max-w-[85%] md:max-w-[60%] overflow-hidden rounded-2xl border border-white/50 dark:border-white/10 shadow-sm bg-white/80 dark:bg-black/40 backdrop-blur-md p-1 group/attach transition-transform active:scale-[0.98]`}>
                    {item.attachment.type === 'image' ? (
                        <div 
                            className="relative cursor-zoom-in"
                            onClick={() => onPreview(item.attachment)}
                        >
                            <img 
                                src={item.attachment.url} 
                                alt="Attachment" 
                                className="w-full h-auto max-h-60 object-cover rounded-xl" 
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/attach:bg-black/10 transition-colors rounded-xl" />
                        </div>
                    ) : isTextMime(item.attachment.mimeType || '') ? (
                        <div 
                            className="cursor-pointer p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-colors"
                            onClick={() => onPreview(item.attachment)}
                        >
                            <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span className="text-xs font-medium truncate max-w-[150px]">{item.attachment.name}</span>
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 p-2 rounded-lg line-clamp-3 w-48">
                                {item.attachment.data ? decodeBase64(item.attachment.data).slice(0, 200) : "Preview unavailable"}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                            <div className="p-2 bg-white dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                                    {item.attachment.name || 'Document'}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase">{item.attachment.mimeType?.split('/')[1]}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Thought Process */}
            {item.reasoning && (
                <div className="mb-3 max-w-[90%] md:max-w-[70%]">
                    <details className="group/details" open={item.status === 'streaming'}>
                        <summary className="list-none cursor-pointer select-none inline-flex items-center gap-2 text-xs font-medium text-orange-700/70 dark:text-orange-400/70 hover:text-orange-700 dark:hover:text-orange-400 transition-colors px-2 py-1 rounded-md hover:bg-orange-50/50 dark:hover:bg-orange-900/20">
                            <div className="relative flex items-center justify-center w-4 h-4">
                                <svg className="w-3 h-3 transition-transform group-open/details:rotate-90" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 14L10 7.5L5 1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <span>Thought Process</span>
                            {item.status === 'streaming' && (
                                <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"/>
                            )}
                        </summary>
                        <div className="mt-2 pl-3 border-l-2 border-orange-100 dark:border-orange-900/50 ml-2">
                            <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap bg-orange-50/30 dark:bg-orange-900/10 p-3 rounded-r-lg shadow-sm">
                                {item.reasoning}
                            </div>
                        </div>
                    </details>
                </div>
            )}
            
            {/* Message Bubble */}
            {item.status === 'streaming' && !item.text ? (
                <Shimmer />
            ) : item.text ? (
                <div className="group relative flex flex-col gap-1 max-w-[90%] md:max-w-[75%]">
                    <div className={`
                        relative px-5 py-4 text-[14px] leading-relaxed shadow-sm backdrop-blur-md transition-colors
                        ${isUser 
                            ? 'bg-[#1a1a1a] dark:bg-white/10 text-white rounded-[24px] rounded-tr-none shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
                            : 'bg-white/70 dark:bg-black/40 text-[#111] dark:text-gray-200 border border-white/60 dark:border-white/10 rounded-[24px] rounded-tl-none shadow-[0_4px_20px_rgba(255,255,255,0.5)] dark:shadow-none'
                        }
                    `}>
                        <MarkdownRenderer content={item.text} isUser={isUser} />
                        
                        {item.groundingMetadata && (
                            <div className={`mt-4 pt-4 border-t ${isUser ? 'border-white/10' : 'border-black/5 dark:border-white/10'} flex flex-col gap-3 animate-fade-in-up`}>
                                {item.groundingMetadata.webSearchQueries && item.groundingMetadata.webSearchQueries.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                            <span className={`text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-60 ${isUser ? 'text-white/60' : 'text-orange-800/60 dark:text-orange-400/60'}`}>
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                            Research Queries
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {item.groundingMetadata.webSearchQueries.map((query: string, idx: number) => (
                                                <span key={idx} className={`px-2 py-1 rounded text-[10px] font-medium ${isUser ? 'bg-white/10 text-white/80' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                                                    {query}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {item.groundingMetadata.groundingChunks && item.groundingMetadata.groundingChunks.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                            <span className={`text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-60 ${isUser ? 'text-white/60' : 'text-orange-800/60 dark:text-orange-400/60'}`}>
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                            Verified Sources
                                        </span>
                                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar mask-image-gradient-right">
                                            {item.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => {
                                                if (chunk.web?.uri) {
                                                    return (
                                                        <WebPreviewCard 
                                                            key={`web-${idx}`} 
                                                            title={chunk.web.title} 
                                                            url={chunk.web.uri} 
                                                            type="web"
                                                            className={isUser ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10'}
                                                        />
                                                    );
                                                }
                                                if (chunk.maps?.uri) {
                                                        return (
                                                        <WebPreviewCard 
                                                            key={`maps-${idx}`} 
                                                            title={chunk.maps.title} 
                                                            url={chunk.maps.uri} 
                                                            type="map"
                                                            className={isUser ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-orange-50/50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-500/20 text-orange-900 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30'}
                                                        />
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Copy Action */}
                    <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <button onClick={() => copyToClipboard(item.text)} className={`p-1.5 rounded-full transition-colors ${isUser ? 'hover:bg-white/20 text-white/40 hover:text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`} title="Copy">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>

                </div>
            ) : null}

        </div>
    );
};

export default ChatMessage;
