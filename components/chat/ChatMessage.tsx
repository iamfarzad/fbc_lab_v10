
import React from 'react';
import { TranscriptItem } from 'types';
import MarkdownRenderer from './MarkdownRenderer';
import { CalendarWidget } from './CalendarWidget';
import { DiscoveryReportPreview } from './DiscoveryReportPreview';
import ContextSources from './ContextSources';
import ErrorMessage from './ErrorMessage';
import { User } from 'lucide-react';
import { CONTACT_CONFIG } from 'src/config/constants';

interface ChatMessageProps {
    item: TranscriptItem;
    onPreview: (attachment: any) => void;
    onDownloadReport?: () => void;
    onEmailReport?: () => void;
    onBookCall?: () => void;
    isDarkMode?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
    item, 
    onPreview, 
    onDownloadReport,
    onEmailReport,
    onBookCall,
    isDarkMode = false 
}) => {
    const isUser = item.role === 'user';

    // Handle System Messages
    if (item.text.startsWith('[System:') && !item.attachment) {
        return (
            <div className="flex justify-center w-full my-4 animate-fade-in-up">
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                    {item.text.replace('[System: ', '').replace(']', '')}
                </span>
            </div>
        );
    }

    // Helper: Avatar Component
    const Avatar = () => (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
            isUser 
                ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400' 
                : 'bg-black dark:bg-white border-transparent text-white dark:text-black'
        }`}>
            {isUser ? <User className="w-4 h-4" /> : <span className="text-[10px] font-bold tracking-tighter">FB</span>}
        </div>
    );

    return (
        <div className={`flex gap-4 w-full mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up group`}>
            
            {/* Avatar Column */}
            <div className="pt-1">
                <Avatar />
            </div>

            {/* Content Column */}
            <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                
                {/* Speaker Name */}
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 ml-1">
                    {isUser ? 'You' : 'F.B/c'}
                </span>

                {/* 1a. File/Image Attachments */}
                {item.attachment && (item.attachment.type === 'image' || item.attachment.type === 'file') && (
                    <div className="mb-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1">
                          <button 
                             onClick={() => onPreview(item.attachment)}
                             className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors w-full text-left"
                          >
                             <div className="p-2 bg-white dark:bg-black rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
                             </div>
                             <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.attachment.name}</span>
                          </button>
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

                {/* 1c. Discovery Report Attachment */}
                {item.attachment && item.attachment.type === 'discovery_report' && item.attachment.htmlContent && (
                    <DiscoveryReportPreview 
                        htmlContent={item.attachment.htmlContent}
                        {...(item.attachment.data ? { pdfDataUrl: item.attachment.data } : {})}
                        reportName={item.attachment.name || "AI Discovery Report"}
                        bookingUrl={item.attachment.url || CONTACT_CONFIG.SCHEDULING.BOOKING_URL}
                        {...(onDownloadReport ? { onDownload: onDownloadReport } : {})}
                        {...(onEmailReport ? { onEmail: onEmailReport } : {})}
                        {...(onBookCall ? { onBookCall: onBookCall } : {})}
                        isDarkMode={isDarkMode}
                    />
                )}

                {/* 2. Reasoning (Monochrome) */}
                {item.reasoning && (
                    <div className="w-full">
                         <details className="group/details mb-2">
                            <summary className="list-none cursor-pointer flex items-center gap-2 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors uppercase tracking-wider">
                                <span>Thinking Process</span>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                            </summary>
                            <div className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-mono pl-2 border-l border-zinc-200 dark:border-zinc-800">
                                {item.reasoning}
                            </div>
                        </details>
                    </div>
                )}

                {/* 3. Message Bubble */}
                {item.text ? (
                    <div className={`
                        relative px-5 py-3.5 text-[14px] leading-relaxed
                        ${isUser 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-sm' 
                            : 'bg-transparent text-zinc-800 dark:text-zinc-200 p-0'
                        }
                    `}>
                        {!isUser && (
                             <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                                <MarkdownRenderer content={item.text} isUser={isUser} />
                             </div>
                        )}
                        {isUser && <MarkdownRenderer content={item.text} isUser={isUser} />}

                    </div>
                ) : null}

                {/* 4. Grounding (Sources) - Footer List */}
                {item.groundingMetadata?.webSearchQueries?.length ? (
                    <div className="mt-1 w-full pl-1">
                        <div className="flex flex-col gap-1.5">
                             <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
                                {item.groundingMetadata.webSearchQueries.map((q, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                        <SearchIcon /> "{q}"
                                    </span>
                                ))}
                             </div>
                             
                             {/* Verified Sources List */}
                             {item.groundingMetadata.groundingChunks?.map((chunk: any, i: number) => {
                                 const url = chunk.web?.uri || chunk.maps?.uri;
                                 const title = chunk.web?.title || chunk.maps?.title || "Source";
                                 if (!url) return null;
                                 return (
                                     <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-zinc-400 hover:text-orange-500 truncate transition-colors">
                                         {i + 1}. {title} <span className="opacity-50 ml-1">({new URL(url).hostname})</span>
                                     </a>
                                 )
                             })}
                        </div>
                    </div>
                ) : null}

                {/* 5. Fix Double Rendering: ONLY show shimmer if streaming AND no text */}
                {item.status === 'streaming' && !item.text && (
                    <div className="flex items-center gap-2 pl-2">
                         <span className="text-[11px] text-zinc-400">Thinking...</span>
                    </div>
                )}

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

            </div>
        </div>
    );
};

// Tiny Helper Icon
const SearchIcon = () => (
    <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
)

export default ChatMessage;
