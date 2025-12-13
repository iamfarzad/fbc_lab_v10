
import React, { useState } from 'react';
import { TranscriptItem } from 'types';
import MarkdownRenderer from './MarkdownRenderer';
import { CalendarWidget } from './CalendarWidget';
import { DiscoveryReportPreview } from './DiscoveryReportPreview';
import ErrorMessage from './ErrorMessage';
import MessageDetailsDrawer from './MessageDetailsDrawer';
import { User } from 'lucide-react';
import { CONTACT_CONFIG } from 'src/config/constants';
import { ToolCall } from './ToolCallIndicator';
import { BG, BORDER, RADIUS, TEXT, TEXT_SIZE, TRANSITION } from './design-tokens';

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
    isThinking?: boolean;
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
    isResearching = false,
    isThinking = false
}) => {
    // Early return if message has no content at all
    const hasContent = item.text?.trim() || item.attachment || item.reasoning || item.error;
    const isStreaming = !item.isFinal && item.role === 'model' && item.status === 'streaming';
    
    // Don't render if no content and not actively streaming
    if (!hasContent && !isStreaming) {
        return null;
    }
    
    const isUser = item.role === 'user';
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsSection, setDetailsSection] = useState<'sources' | 'tools' | 'reasoning' | 'context' | undefined>(undefined);

    // Normalize the visual mode used for status + shimmer
    const hasActiveTools = activeTools.some(t => t.status === 'running');
    const isStreamingOrThinking = item.status === 'streaming' || (!item.isFinal && !item.text?.trim());
    const shouldShowResearch = isResearching;
    const shouldShowThinking = isThinking || hasActiveTools || isStreamingOrThinking;

    const hasDetails =
        !isUser &&
        (Boolean(item.reasoning && item.reasoning.trim()) ||
            (item.tools?.length ?? 0) > 0 ||
            (item.contextSources?.length ?? 0) > 0 ||
            (item.groundingMetadata?.webSearchQueries?.length ?? 0) > 0 ||
            (item.groundingMetadata?.groundingChunks?.length ?? 0) > 0);

    const openDetails = (section?: 'sources' | 'tools' | 'reasoning' | 'context') => {
        setDetailsSection(section);
        setIsDetailsOpen(true);
    };

    const sourceCount =
        (item.groundingMetadata?.groundingChunks?.filter((c: any) => (c?.web?.uri || c?.maps?.uri)).length ?? 0) +
        (item.groundingMetadata?.webSearchQueries?.length ?? 0);
    const toolCount = item.tools?.length ?? 0;
    const contextCount = item.contextSources?.length ?? 0;
    
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
                        {!isUser && (shouldShowResearch || shouldShowThinking) && (
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" />
                                <span>{hasActiveTools ? 'Using tools' : isResearching ? 'Researching' : 'Thinking'}</span>
                                <span className="relative h-[2px] w-12 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800/60">
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-current to-transparent animate-shimmer" />
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
                {/* Reasoning is shown in the per-message Details drawer */}

                {/* 3. Message Bubble - Skip if system message with attachment */}
                {item.text && !(item.text.startsWith('[System:') && item.attachment) ? (
                    <div className={`
                        relative px-5 py-3.5 text-[13px] sm:text-[14px] leading-relaxed
                        ${isUser 
                            ? (isDarkMode 
                                ? 'bg-zinc-900 text-zinc-100 rounded-2xl rounded-tr-sm' 
                                : 'bg-zinc-100 text-zinc-900 rounded-2xl rounded-tr-sm')
                            : 'bg-transparent text-zinc-800 dark:text-zinc-200 p-0'
                        }
                    `}>
                        {!isUser && (
                             <div className={`backdrop-blur-sm border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm transition-all duration-300 hover:shadow-md ${
                                isDarkMode 
                                  ? 'bg-black border-white/10 text-zinc-200' 
                                  : 'bg-white border-zinc-100 text-zinc-800'
                             }`}>
                                <MarkdownRenderer
                                    content={item.text}
                                    isUser={isUser}
                                    isDarkMode={isDarkMode}
                                    {...(item.groundingMetadata ? { groundingMetadata: item.groundingMetadata } : {})}
                                    onOpenDetails={openDetails}
                                />
                             </div>
                        )}
                        {isUser && <MarkdownRenderer content={item.text} isUser={isUser} isDarkMode={isDarkMode} />}

                    </div>
                ) : null}

                {/* Details chips (minimal, data-driven) */}
                {!isUser && hasDetails && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {sourceCount > 0 && (
                            <button
                                type="button"
                                onClick={() => openDetails('sources')}
                                className={`px-2.5 py-1 ${RADIUS.full} ${TEXT_SIZE.metadata} ${TRANSITION.colors} ${BG.hover} ${BORDER.subtle} border ${TEXT.muted} opacity-80 hover:opacity-100`}
                            >
                                Sources{sourceCount ? ` ${sourceCount}` : ''}
                            </button>
                        )}
                        {toolCount > 0 && (
                            <button
                                type="button"
                                onClick={() => openDetails('tools')}
                                className={`px-2.5 py-1 ${RADIUS.full} ${TEXT_SIZE.metadata} ${TRANSITION.colors} ${BG.hover} ${BORDER.subtle} border ${TEXT.muted} opacity-80 hover:opacity-100`}
                            >
                                Tools{toolCount ? ` ${toolCount}` : ''}
                            </button>
                        )}
                        {item.reasoning?.trim() && (
                            <button
                                type="button"
                                onClick={() => openDetails('reasoning')}
                                className={`px-2.5 py-1 ${RADIUS.full} ${TEXT_SIZE.metadata} ${TRANSITION.colors} ${BG.hover} ${BORDER.subtle} border ${TEXT.muted} opacity-80 hover:opacity-100`}
                            >
                                Reasoning
                            </button>
                        )}
                        {contextCount > 0 && (
                            <button
                                type="button"
                                onClick={() => openDetails('context')}
                                className={`px-2.5 py-1 ${RADIUS.full} ${TEXT_SIZE.metadata} ${TRANSITION.colors} ${BG.hover} ${BORDER.subtle} border ${TEXT.muted} opacity-80 hover:opacity-100`}
                            >
                                Context{contextCount ? ` ${contextCount}` : ''}
                            </button>
                        )}
                    </div>
                )}

                <MessageDetailsDrawer
                    isOpen={isDetailsOpen}
                    onClose={() => setIsDetailsOpen(false)}
                    item={item}
                    {...(detailsSection ? { initialSection: detailsSection } : {})}
                />

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

      </div>
    </div>
  )
}
export default ChatMessage;
