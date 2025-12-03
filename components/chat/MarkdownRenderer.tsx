
import React, { useState } from 'react';

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
                        className="text-blue-600 hover:underline hover:text-blue-800 font-medium"
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

const CodeBlock: React.FC<{ language: string, code: string }> = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 rounded-lg overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-sm group">
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                    {language || 'CODE'}
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white transition-colors"
                >
                    {copied ? (
                         <>
                             <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                             <span className="text-orange-500">Copied</span>
                         </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <div className="p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre">
                    {code}
                </pre>
            </div>
        </div>
    );
}

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

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('```')) {
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

    return <div className="markdown-body">{elements}</div>;
};

export default MarkdownRenderer;
