/**
 * Code Block with Syntax Highlighting
 * 
 * Renders code with syntax highlighting, line numbers,
 * and copy functionality.
 */

import React, { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

// Simple syntax highlighting themes
const THEMES = {
  light: {
    background: 'bg-gray-50',
    text: 'text-gray-800',
    keyword: 'text-purple-600',
    string: 'text-green-600',
    comment: 'text-gray-500',
    number: 'text-blue-600',
    function: 'text-amber-600',
    operator: 'text-pink-600',
    property: 'text-cyan-600',
    lineNumber: 'text-gray-400',
  },
  dark: {
    background: 'bg-gray-900',
    text: 'text-gray-200',
    keyword: 'text-purple-400',
    string: 'text-green-400',
    comment: 'text-gray-500',
    number: 'text-blue-400',
    function: 'text-yellow-400',
    operator: 'text-pink-400',
    property: 'text-cyan-400',
    lineNumber: 'text-gray-600',
  }
}

// Simple tokenizer patterns
const PATTERNS = {
  keyword: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|void|null|undefined|true|false)\b/g,
  string: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
  comment: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
  number: /\b\d+\.?\d*\b/g,
  function: /\b([a-zA-Z_]\w*)\s*\(/g,
  operator: /[+\-*/%=<>!&|^~?:]+/g,
  property: /\.([a-zA-Z_]\w*)/g,
}

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  showCopy?: boolean
  theme?: 'light' | 'dark' | 'auto'
  maxHeight?: string
  className?: string
}

/**
 * Simple syntax highlighter
 * Note: For production, consider using Shiki or Prism
 */
function highlightCode(code: string, theme: typeof THEMES.light): React.ReactNode[] {
  // Split into lines first
  const lines = code.split('\n')
  
  return lines.map((line, lineIndex) => {
    // Tokenize each line
    const tokens: Array<{ text: string; type: string; start: number }> = []
    
    // Find all matches
    Object.entries(PATTERNS).forEach(([type, pattern]) => {
      let match
      const regex = new RegExp(pattern.source, pattern.flags)
      while ((match = regex.exec(line)) !== null) {
        tokens.push({
          text: match[0],
          type,
          start: match.index
        })
      }
    })
    
    // Sort by position
    tokens.sort((a, b) => a.start - b.start)
    
    // Build highlighted line
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    
    tokens.forEach((token, i) => {
      // Skip overlapping tokens
      if (token.start < lastIndex) return
      
      // Add plain text before token
      if (token.start > lastIndex) {
        elements.push(
          <span key={`plain-${lineIndex}-${i}`}>
            {line.slice(lastIndex, token.start)}
          </span>
        )
      }
      
      // Add highlighted token
      const colorClass = theme[token.type as keyof typeof theme] || theme.text
      elements.push(
        <span key={`token-${lineIndex}-${i}`} className={colorClass}>
          {token.text}
        </span>
      )
      
      lastIndex = token.start + token.text.length
    })
    
    // Add remaining plain text
    if (lastIndex < line.length) {
      elements.push(
        <span key={`end-${lineIndex}`}>{line.slice(lastIndex)}</span>
      )
    }
    
    // Empty line handling
    if (elements.length === 0) {
      elements.push(<span key={`empty-${lineIndex}`}>&nbsp;</span>)
    }
    
    return (
      <div key={lineIndex} className="whitespace-pre">
        {elements}
      </div>
    )
  })
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'plaintext',
  showLineNumbers = true,
  showCopy = true,
  theme = 'auto',
  maxHeight = '400px',
  className = ''
}) => {
  const [copied, setCopied] = useState(false)
  
  // Determine theme based on system preference
  const isDark = theme === 'dark' || 
    (theme === 'auto' && typeof window !== 'undefined' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  const colors = isDark ? THEMES.dark : THEMES.light
  const lines = code.split('\n')
  
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])
  
  return (
    <div className={`relative rounded-lg overflow-hidden ${colors.background} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-mono text-gray-500">{language}</span>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Code Content */}
      <div 
        className="overflow-auto p-4 font-mono text-sm"
        style={{ maxHeight }}
      >
        <div className="flex">
          {/* Line Numbers */}
          {showLineNumbers && (
            <div className={`select-none pr-4 text-right ${colors.lineNumber}`}>
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}
          
          {/* Code */}
          <div className={`flex-1 ${colors.text}`}>
            {highlightCode(code, colors)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline code span
 */
export const InlineCode: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => (
  <code 
    className={`
      px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 
      font-mono text-sm
      dark:bg-gray-800 dark:text-gray-200
      ${className}
    `}
  >
    {children}
  </code>
)

export default CodeBlock

