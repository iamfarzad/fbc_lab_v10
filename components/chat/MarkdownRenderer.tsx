
import React from 'react';
import CodeBlock from './CodeBlock';
import MarkdownTable, { isMarkdownTable } from './MarkdownTable';

const formatInline = (text: string): React.ReactNode[] => {
    const codeParts = text.split(/(`.*?`)/g);
    return codeParts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-black/5 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1,-1)}</code>;
        }
        
        const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
        return linkParts.map((subPart, j) => {
            const linkMatch = subPart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return (
                    <a 
                        key={`${i}-${j}`} 
                        href={linkMatch[2]} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-orange-600 hover:underline hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 font-medium"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }

            const boldParts = subPart.split(/(\*\*.*?\*\*)/g);
            return boldParts.map((boldPart, k) => {
                if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                    return <strong key={`${i}-${j}-${k}`} className="font-bold opacity-100">{boldPart.slice(2, -2)}</strong>;
                }

                const italicParts = boldPart.split(/(\*.*?\*)/g);
                return italicParts.map((italicPart, l) => {
                    if (italicPart.startsWith('*') && italicPart.endsWith('*') && italicPart.length > 2) {
                        return <em key={`${i}-${j}-${k}-${l}`} className="italic opacity-80">{italicPart.slice(1, -1)}</em>;
                    }
                    return italicPart;
                });
            });
        });
    });
};

// CodeBlock is now imported from './CodeBlock'

interface MarkdownRendererProps {
    content: string;
    isUser: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser }) => {
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
            elements.push(<h3 key={i} className={`text-sm font-bold mt-5 mb-2 uppercase tracking-wider ${isUser ? 'text-white' : 'text-orange-700'}`}>{formatInline(trimmed.slice(4))}</h3>);
        } else if (trimmed.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={i} className="text-base font-bold mt-6 mb-3 tracking-tight">{formatInline(trimmed.slice(3))}</h2>);
        } 
        else if (trimmed.match(/^[*-]\s+(.*)/)) {
             const match = trimmed.match(/^[*-]\s+(.*)/);
             if (match && match[1]) {
                 listBuffer.push(<li key={`li-${i}`} className="pl-1 leading-relaxed">{formatInline(match[1])}</li>);
             }
        }
        else if (trimmed.startsWith('> ')) {
            flushList();
            elements.push(<blockquote key={i} className="border-l-2 border-orange-500/30 pl-3 italic opacity-80 my-3">{formatInline(trimmed.slice(2))}</blockquote>);
        }
        else if (trimmed.length > 0) {
            flushList();
            elements.push(<p key={i} className="mb-2.5 last:mb-0 min-h-[1em] leading-relaxed">{formatInline(line)}</p>);
        }
    });
    
    flushList();
    flushCodeBlock();
    flushTable();

    return <div className="markdown-body">{elements}</div>;
};

export default MarkdownRenderer;
