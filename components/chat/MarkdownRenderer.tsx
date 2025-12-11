
import React from 'react';
import CodeBlock from './CodeBlock';
import MarkdownTable, { isMarkdownTable } from './MarkdownTable';
import { CalendarWidget } from './CalendarWidget';

// Helper to detect cal.com URLs
const isCalComUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('cal.com') || urlObj.hostname.includes('calendly.com');
    } catch {
        return false;
    }
};

const formatInline = (text: string, isDarkMode: boolean = false, depth: number = 0): React.ReactNode[] => {
    // Prevent infinite recursion
    if (depth > 10) return [text];
    
    const codeParts = text.split(/(`.*?`)/g);
    return codeParts.flatMap<React.ReactNode>((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-black/5 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1,-1)}</code>;
        }
        
        // First, handle markdown links [text](url)
        const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
        const processedParts: React.ReactNode[] = linkParts.flatMap<React.ReactNode>((subPart, j) => {
            const linkMatch = subPart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                // Check if it's a cal.com URL
                const url = linkMatch[2];
                if (url && (isCalComUrl(url) || url.includes('calendly.com'))) {
                    return (
                        <CalendarWidget
                            key={`cal-link-${i}-${j}`}
                            title={linkMatch[1] || "Book a Call"}
                            description="Schedule a free consultation"
                            url={url}
                            isDarkMode={isDarkMode}
                        />
                    );
                }
                
                return (
                    <a 
                        key={`link-${i}-${j}`} 
                        href={linkMatch[2]} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-orange-600 hover:underline hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 font-medium"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }

            // Then check for plain cal.com URLs in remaining text
            const calComUrlRegex = /(https?:\/\/[^\s\)]+cal\.com[^\s\)]*|https?:\/\/[^\s\)]+calendly\.com[^\s\)]*)/gi;
            const calComMatches = subPart.match(calComUrlRegex);
            
            if (calComMatches && calComMatches.length > 0) {
                const segments: React.ReactNode[] = [];
                let lastIndex = 0;
                
                calComMatches.forEach((url, matchIndex) => {
                    const urlIndex = subPart.indexOf(url, lastIndex);
                    
                    // Add text before URL (process recursively for formatting)
                    if (urlIndex > lastIndex) {
                        const beforeText = subPart.substring(lastIndex, urlIndex);
                        if (beforeText) {
                            segments.push(...formatInline(beforeText, isDarkMode, depth + 1));
                        }
                    }
                    
                    // Add CalendarWidget for cal.com URL
                    segments.push(
                        <CalendarWidget
                            key={`cal-${i}-${j}-${matchIndex}`}
                            title="Book a Call"
                            description="Schedule a free consultation"
                            url={url.trim()}
                            isDarkMode={isDarkMode}
                        />
                    );
                    
                    lastIndex = urlIndex + url.length;
                });
                
                // Add remaining text after last URL
                if (lastIndex < subPart.length) {
                    const afterText = subPart.substring(lastIndex);
                    if (afterText) {
                        segments.push(...formatInline(afterText, isDarkMode, depth + 1));
                    }
                }
                
                return segments;
            }

            // Process bold and italic formatting
            const boldParts = subPart.split(/(\*\*.*?\*\*)/g);
            return boldParts.flatMap((boldPart, k) => {
                if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                    return <strong key={`bold-${i}-${j}-${k}`} className="font-bold opacity-100">{boldPart.slice(2, -2)}</strong>;
                }

                const italicParts = boldPart.split(/(\*.*?\*)/g);
                return italicParts.map((italicPart, l) => {
                    if (italicPart.startsWith('*') && italicPart.endsWith('*') && italicPart.length > 2) {
                        return <em key={`italic-${i}-${j}-${k}-${l}`} className="italic opacity-80">{italicPart.slice(1, -1)}</em>;
                    }
                    return italicPart;
                });
            });
        });
        
        return processedParts;
    });
};

// CodeBlock is now imported from './CodeBlock'

interface MarkdownRendererProps {
    content: string;
    isUser: boolean;
    isDarkMode?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser, isDarkMode = false }) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: React.ReactNode[] = [];
    let codeBlockBuffer: string[] | null = null;
    let codeLanguage = "";
    let tableBuffer: string[] = [];

    const flushList = () => {
        if (listBuffer.length > 0) {
            elements.push(
                <ul key={`list-${elements.length}`} className={`list-disc ml-5 mb-3 space-y-1.5 ${isUser ? 'marker:text-white/60' : 'marker:text-black/40'}`}>
                    {...listBuffer}
                </ul>
            );
            listBuffer = [];
        }
    };

    const flushCodeBlock = () => {
        if (codeBlockBuffer !== null) {
            elements.push(
                <CodeBlock key={`code-${elements.length}`} language={codeLanguage} code={codeBlockBuffer.join('\n')} />
            );
            codeBlockBuffer = null;
            codeLanguage = "";
        }
    };

    const flushTable = () => {
        if (tableBuffer.length >= 2) {
            const tableContent = tableBuffer.join('\n');
            if (isMarkdownTable(tableContent)) {
                elements.push(
                    <MarkdownTable key={`table-${elements.length}`} content={tableContent} className="my-4" />
                );
            } else {
                // Not a valid table, render as paragraphs
                tableBuffer.forEach((line, idx) => {
                    elements.push(<p key={`table-fallback-${elements.length}-${idx}`} className="mb-2.5 last:mb-0">{line}</p>);
                });
            }
        }
        tableBuffer = [];
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('```')) {
            flushTable();
            if (codeBlockBuffer !== null) {
                flushCodeBlock(); 
            } else {
                flushList();
                codeBlockBuffer = []; 
                codeLanguage = trimmed.slice(3).trim();
            }
            return;
        }
        
        if (codeBlockBuffer !== null) {
            codeBlockBuffer.push(line);
            return;
        }

        // Table detection: lines starting with |
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            flushList();
            tableBuffer.push(trimmed);
            return;
        } else if (tableBuffer.length > 0) {
            // Line doesn't start with |, flush accumulated table
            flushTable();
        }

        if (trimmed.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={i} className={`text-sm font-bold mt-5 mb-2 uppercase tracking-wider ${isUser ? 'text-white' : 'text-orange-700'}`}>{formatInline(trimmed.slice(4), isDarkMode)}</h3>);
        } else if (trimmed.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={i} className="text-base font-bold mt-6 mb-3 tracking-tight">{formatInline(trimmed.slice(3), isDarkMode)}</h2>);
        } 
        else if (trimmed.match(/^[*-]\s+(.*)/)) {
             const match = trimmed.match(/^[*-]\s+(.*)/);
             if (match && match[1]) {
                 listBuffer.push(<li key={`li-${i}`} className="pl-1 leading-relaxed">{formatInline(match[1], isDarkMode)}</li>);
             }
        }
        else if (trimmed.startsWith('> ')) {
            flushList();
            elements.push(<blockquote key={i} className="border-l-2 border-orange-500/30 pl-3 italic opacity-80 my-3">{formatInline(trimmed.slice(2), isDarkMode)}</blockquote>);
        }
        else if (trimmed.length > 0) {
            flushList();
            elements.push(<p key={i} className="mb-2.5 last:mb-0 min-h-[1em] leading-relaxed">{formatInline(line, isDarkMode)}</p>);
        }
    });
    
    flushList();
    flushCodeBlock();
    flushTable();

    return <div className="markdown-body">{elements}</div>;
};

export default MarkdownRenderer;
