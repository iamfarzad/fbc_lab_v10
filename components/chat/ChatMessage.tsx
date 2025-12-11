
import React, { useMemo, useState } from 'react';
import { TranscriptItem } from 'types';
import MarkdownRenderer from './MarkdownRenderer';
import { CalendarWidget } from './CalendarWidget';
import { DiscoveryReportPreview } from './DiscoveryReportPreview';
import ContextSources from './ContextSources';
import ErrorMessage from './ErrorMessage';
import { WebPreviewCard } from './Attachments';
import { User, ChevronDown, Sparkles } from 'lucide-react';
import { CONTACT_CONFIG } from 'src/config/constants';
import { ToolCall } from './ToolCallIndicator';

interface ChatMessageProps {
    item: TranscriptItem;
    onPreview: (attachment: any) => void;
    onDownloadReport?: (() => void) | undefined;
    onEmailReport?: (() => void) | undefined;
    onBookCall?: (() => void) | undefined;
    isDarkMode?: boolean;
    agentMode?: 'idle' | 'listening' | 'thinking' | 'speaking';
    activeTools?: ToolCall[];
    isResearching?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
    item, 
    onPreview, 
    onDownloadReport,
    onEmailReport,
    onBookCall,
    isDarkMode = false,
    agentMode = 'idle',
    activeTools = [],
    isResearching = false
}) => {
    // Early return if message has no content at all
    const hasContent = item.text?.trim() || item.attachment || item.reasoning || item.error;
    const isStreaming = !item.isFinal && item.role === 'model' && item.status === 'streaming';
    
    // Don't render if no content and not actively streaming
    if (!hasContent && !isStreaming) {
        return null;
    }
    
    const isUser = item.role === 'user';
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [isMetadataOpen, setIsMetadataOpen] = useState(false);
    const reasoningSteps = useMemo(() => {
        if (!item.reasoning) return [];
        const steps = item.reasoning
            .split(/\n+/)
            .map(step => step.trim())
            .filter(Boolean);
        return Array.from(new Set(steps));
    }, [item.reasoning]);
    
    // Normalize the visual mode used for status + shimmer
    const hasActiveTools = activeTools.some(t => t.status === 'running');
    const isStreamingOrThinking = item.status === 'streaming' || (!item.isFinal && !item.text?.trim());
    const shouldShowResearch = isResearching || hasActiveTools || isStreamingOrThinking;
    const groundingChunks = item.groundingMetadata?.groundingChunks ?? [];
    
    // Handle System Messages - hide text if attachment exists (attachment is the real content)
    if (item.text.startsWith('[System:') && !item.attachment) {
        return (
            <div className="flex justify-center w-full my-4 animate-fade-in-up">
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                    {item.text.replace('[System: ', '').replace(']', '')}
                </span>
            </div>
        );
    }
    // If system message has attachment, hide the system text (attachment is the content)
    if (item.text.startsWith('[System:') && item.attachment) {
        // Don't return early - continue to render attachment
        // Just skip the system text display
    }

    // Helper: Avatar Component
    const Avatar = () => (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm transition-all duration-300 ${
            isUser 
                ? 'bg-zinc-100 dark:bg-black/80 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300' 
                : 'bg-gradient-to-br from-black to-zinc-800 dark:from-zinc-900 dark:to-black border-transparent text-white dark:text-white shadow-md'
        }`}>
            {isUser ? <User className="w-4 h-4" /> : <span className="font-matrix text-[10px] font-bold tracking-tighter">FB</span>}
        </div>
    );

    return (
        <div className={`flex gap-4 w-full mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up group`} data-agent-mode={agentMode}>
            
            {/* Avatar Column */}
            <div className="pt-1">
                <Avatar />
            </div>

            {/* Content Column */}
            <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                
                {/* Speaker Name with Unified Status Indicator */}
                <div className="flex flex-col gap-2 ml-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium text-zinc-400 dark:text-zinc-500 ${isUser ? '' : 'font-matrix'}`}>
                            {isUser ? 'You' : 'F.B/c'}
                        </span>
                        {!isUser && shouldShowResearch && (
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.45)]" />
                                <span>{hasActiveTools ? 'Analyzing' : isResearching ? 'Research' : 'Thinking'}</span>
                                <span className="relative h-[2px] w-12 overflow-hidden rounded-full bg-blue-200/70 dark:bg-blue-800/60">
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/80 to-transparent animate-shimmer" />
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 1a. File/Image Attachments */}
                {item.attachment && (item.attachment.type === 'image' || item.attachment.type === 'file') && (
                    <div className={`mb-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black p-1 ${item.attachment.type === 'image' ? 'max-w-[85%] md:max-w-[60%]' : ''}`}>
                        {item.attachment.type === 'image' ? (
                            <div 
                                className="relative cursor-zoom-in group/img"
                                onClick={() => onPreview(item.attachment)}
                            >
                                <img 
                                    src={item.attachment.url || (item.attachment.data ? `data:${item.attachment.mimeType || 'image/jpeg'};base64,${item.attachment.data}` : '')}
                                    alt="Attachment" 
                                    className="w-full h-auto max-h-60 object-cover rounded-xl" 
                                    onError={(e) => {
                                        // Fallback to button if image fails to load
                                        const target = e.currentTarget;
                                        const parent = target.parentElement;
                                        if (parent) {
                                            parent.innerHTML = `
                                                <button class="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors w-full text-left">
                                                    <div class="p-2 bg-white dark:bg-black rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-500">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
                                                    </div>
                                                    <span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">${item.attachment?.name || 'Image'}</span>
                                                </button>
                                            `;
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors rounded-xl" />
                            </div>
                        ) : (
                            <button 
                                onClick={() => onPreview(item.attachment)}
                                className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors w-full text-left"
                            >
                                <div className="p-2 bg-white dark:bg-black rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
                                </div>
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.attachment.name}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* 1b. Calendar Widget Attachment */}
                {item.attachment && item.attachment.type === 'calendar_widget' && (
                    <CalendarWidget 
                        title={item.attachment.name || "Schedule a Call"}
                        description="Book a free consultation to discuss your AI strategy."
                        {...(item.attachment.url ? { url: item.attachment.url } : {})}
                    />
                )}

                {/* 1c. AI Insights Report Attachment */}
                {item.attachment && item.attachment.type === 'discovery_report' && item.attachment.htmlContent && (
                    <DiscoveryReportPreview 
                        htmlContent={item.attachment.htmlContent}
                        {...(item.attachment.data ? { pdfDataUrl: item.attachment.data } : {})}
                        reportName={item.attachment.name || "AI Insights Report"}
                        bookingUrl={item.attachment.url || CONTACT_CONFIG.SCHEDULING.BOOKING_URL}
                        {...(onDownloadReport ? { onDownload: onDownloadReport } : {})}
                        {...(onEmailReport ? { onEmail: onEmailReport } : {})}
                        {...(onBookCall ? { onBookCall: onBookCall } : {})}
                        isDarkMode={isDarkMode}
                    />
                )}

                {/* 2. Reasoning (Animated Accordion) */}
                {item.reasoning && (
                    <div className="w-full mb-3">
                        <button 
                            onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                            className="flex items-center gap-2 group/btn select-none"
                        >
                            <div className={`p-1 rounded-md transition-colors ${isThinkingOpen ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'text-zinc-400 group-hover/btn:text-zinc-600 dark:group-hover/btn:text-zinc-300'}`}>
                                <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wide">
                                {isThinkingOpen ? 'Reasoning Process' : 'Show Reasoning'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-300 ${isThinkingOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <div 
                            className={`grid transition-[grid-template-rows] duration-300 ease-out ${isThinkingOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        >
                            <div className="overflow-hidden">
                                <div className="mt-3 rounded-xl border border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/80 via-white/80 to-orange-100/40 dark:from-orange-950/40 dark:via-black/30 dark:to-orange-900/10 shadow-sm relative p-3 sm:p-4">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400/50 to-transparent"></div>
                                    <div className="flex flex-col gap-3">
                                        {reasoningSteps.length > 0 ? reasoningSteps.map((step, idx) => (
                                            <div key={`reason-${item.id}-${step}`} className="flex items-start gap-3">
                                                <div className="flex flex-col items-center pt-1">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.45)]" />
                                                    {idx < reasoningSteps.length - 1 && (
                                                        <span className="flex-1 w-[1px] bg-gradient-to-b from-orange-400/40 via-orange-300/30 to-transparent" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] sm:text-[11px] font-semibold text-orange-700 dark:text-orange-300 mb-1 tracking-wide uppercase">
                                                        Step {idx + 1}
                                                    </div>
                                                    <div className="text-[11px] sm:text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-200 whitespace-pre-line">
                                                        {step}
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-[11px] sm:text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-200 font-mono">
                                                {item.reasoning}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Message Bubble - Skip if system message with attachment */}
                {item.text && !(item.text.startsWith('[System:') && item.attachment) ? (
                    <div className={`
                        relative px-5 py-3.5 text-[13px] sm:text-[14px] leading-relaxed
                        ${isUser 
                            ? 'bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-sm' 
                            : 'bg-transparent text-zinc-800 dark:text-zinc-200 p-0'
                        }
                    `}>
                        {!isUser && (
                             <div className="bg-white dark:bg-black backdrop-blur-sm border border-zinc-100 dark:border-white/10 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm transition-all duration-300 hover:shadow-md">
                                <MarkdownRenderer content={item.text} isUser={isUser} isDarkMode={isDarkMode} />
                             </div>
                        )}
                        {isUser && <MarkdownRenderer content={item.text} isUser={isUser} isDarkMode={isDarkMode} />}

                    </div>
                ) : null}

                {/* 4. Grounding (Sources) - Enhanced Visibility with Research Header */}
                {((item.groundingMetadata?.webSearchQueries?.length ?? 0) > 0 || groundingChunks.length > 0) ? (
                    <div className="mt-4 w-full p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">Research Sources</span>
                        </div>
                        
                        {/* Search Queries */}
                        {item.groundingMetadata?.webSearchQueries && item.groundingMetadata.webSearchQueries.length > 0 && (
                            <div className="mb-3">
                                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-2">Searched:</div>
                                <div className="flex flex-wrap gap-2">
                                    {item.groundingMetadata.webSearchQueries.map((q, i) => (
                                        <span key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-[10px] text-blue-700 dark:text-blue-300">
                                            <SearchIcon /> "{q}"
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Source Cards Grid */}
                        {groundingChunks.length > 0 && (
                            <div>
                                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-2">Sources:</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {groundingChunks
                                        .filter((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
                                        .map((chunk: any, i: number) => {
                                            const url = chunk.web?.uri || chunk.maps?.uri;
                                            const title = chunk.web?.title || chunk.maps?.title || "Source";
                                            if (!url) return null;
                                            return (
                                                <WebPreviewCard
                                                    key={i}
                                                    title={title}
                                                    url={url}
                                                    type={chunk.maps ? 'map' : 'web'}
                                                />
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}


                {/* 6. Error State */}
                {item.status === 'error' && item.error && (
                    <ErrorMessage 
                        error={{
                            type: item.error.type,
                            message: item.error.message,
                            ...(item.error.details ? { details: item.error.details } : {}),
                            ...(item.error.retryable !== undefined ? { retryable: item.error.retryable } : {})
                        }}
                        compact
                        className="mt-2"
                    />
                )}

                {/* 7. Context Sources (compact badges for AI messages) */}
                {!isUser && item.contextSources && item.contextSources.length > 0 && (
                    <ContextSources 
                        sources={item.contextSources}
                        compact
                        className="mt-2"
                    />
                )}

              {/* Metadata Dropdown - Timestamp, Token Count, Sources */}
        {!isUser && item.isFinal && item.status !== 'error' && (
            <div className="mt-1.5 pl-1">
                <button
                    onClick={() => setIsMetadataOpen(!isMetadataOpen)}
                    className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors group/metadata"
                >
                    <span className="opacity-60">
                        {(() => {
                            const now = new Date();
                            const diff = now.getTime() - new Date(item.timestamp).getTime();
                            if (diff < 60000) return 'just now';
                            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                            return new Date(item.timestamp).toLocaleDateString();
                        })()}
                    </span>
                    {item.processingTime && (
                        <>
                            <span>•</span>
                            <span className="opacity-60">{item.processingTime < 1000 ? `${item.processingTime}ms` : `${(item.processingTime / 1000).toFixed(1)}s`}</span>
                        </>
                    )}
                    {item.text.length > 0 && (
                        <>
                            <span>•</span>
                            <span className="opacity-60">{Math.ceil(item.text.length / 4)} tokens</span>
                        </>
                    )}
                {((groundingChunks.length > 0) || (item.contextSources?.length ?? 0) > 0) && (
                        <>
                            <span>•</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isMetadataOpen ? 'rotate-180' : ''}`} />
                        </>
                    )}
                </button>

                {/* Dropdown Content */}
                {((groundingChunks.length > 0) || (item.contextSources?.length ?? 0) > 0 || item.processingTime || item.timestamp) && (
                    <div 
                        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isMetadataOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    >
                        <div className="overflow-hidden">
                            <div className="mt-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 space-y-3">
                                {/* Full Metadata */}
                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Metadata</div>
                                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300 font-mono space-y-1">
                                        <div className="flex justify-between gap-4">
                                            <span className="opacity-70">Timestamp:</span>
                                            <span>{new Date(item.timestamp).toLocaleString()}</span>
                                        </div>
                                        {item.processingTime && (
                                            <div className="flex justify-between gap-4">
                                                <span className="opacity-70">Processing:</span>
                                                <span>{item.processingTime < 1000 ? `${item.processingTime}ms` : `${(item.processingTime / 1000).toFixed(2)}s`}</span>
                                            </div>
                                        )}
                                        {item.text.length > 0 && (
                                            <div className="flex justify-between gap-4">
                                                <span className="opacity-70">Tokens:</span>
                                                <span>{Math.ceil(item.text.length / 4)} (estimated)</span>
                                            </div>
                                        )}
                                        {item.role && (
                                            <div className="flex justify-between gap-4">
                                                <span className="opacity-70">Role:</span>
                                                <span className="uppercase">{item.role}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Sources from Grounding */}
                                {groundingChunks.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                        <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Sources</div>
                                        <div className="space-y-1.5">
                                            {groundingChunks
                                                .filter((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
                                                .map((chunk: any, i: number) => {
                                                    const url = chunk.web?.uri || chunk.maps?.uri;
                                                    const title = chunk.web?.title || chunk.maps?.title || "Source";
                                                    if (!url) return null;
                                                    return (
                                                        <a
                                                            key={i}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate"
                                                        >
                                                            {title}
                                                        </a>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* Context Sources */}
                                {item.contextSources && item.contextSources.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                        <div className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Context</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {item.contextSources.map((source, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                                                >
                                                    {source.type === 'company' && '🏢'}
                                                    {source.type === 'person' && '👤'}
                                                    {source.type === 'location' && '📍'}
                                                    {source.type === 'file' && '📄'}
                                                    {source.type === 'webcam' && '📹'}
                                                    {source.type === 'screen' && '🖥️'}
                                                    {source.type === 'web' && '🌐'}
                                                    {source.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  )
}
// Tiny Helper Icon
const SearchIcon = () => (
    <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
)

export default ChatMessage;
