/**
 * Markdown Table Renderer
 * 
 * Renders markdown tables with proper styling.
 */

import React from 'react'

interface MarkdownTableProps {
  content: string
  className?: string
  isDarkMode?: boolean
}

interface ParsedTable {
  headers: string[]
  rows: string[][]
  alignments: ('left' | 'center' | 'right')[]
}

/**
 * Parse markdown table string into structured data
 */
function parseMarkdownTable(content: string): ParsedTable | null {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return null

  // Parse header
  const headerLine = lines[0]?.trim()
  if (!headerLine || !headerLine.startsWith('|') || !headerLine.endsWith('|')) return null
  
  const headers = headerLine
    .slice(1, -1)
    .split('|')
    .map(h => h.trim())

  // Parse alignment row
  const alignLine = lines[1]?.trim()
  if (!alignLine || !alignLine.match(/^\|[\s:-]+\|$/)) return null
  
  const alignments = alignLine
    .slice(1, -1)
    .split('|')
    .map(a => {
      const cell = a.trim()
      if (cell.startsWith(':') && cell.endsWith(':')) return 'center' as const
      if (cell.endsWith(':')) return 'right' as const
      return 'left' as const
    })

  // Parse data rows
  const rows = lines.slice(2).map(line => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return []
    return trimmed
      .slice(1, -1)
      .split('|')
      .map(c => c.trim())
  }).filter(row => row.length > 0)

  return { headers, rows, alignments }
}

const MarkdownTable: React.FC<MarkdownTableProps> = ({
  content,
  className = '',
  isDarkMode = false
}) => {
  const table = parseMarkdownTable(content)
  
  if (!table) {
    // If parsing fails, render as preformatted text
    return (
      <pre className={`text-sm text-gray-600 overflow-x-auto ${className}`}>
        {content}
      </pre>
    )
  }

  const getAlignment = (index: number): string => {
    const align = table.alignments[index] || 'left'
    return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  }

  return (
    <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50 backdrop-blur-sm' : 'border-zinc-200 bg-white/50 backdrop-blur-sm'} ${className}`}>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className={`${isDarkMode ? 'bg-white/5 border-zinc-700' : 'bg-gray-50/80 border-gray-200'} border-b`}>
            {table.headers.map((header, i) => (
              <th 
                key={i}
                className={`
                  px-4 py-3 font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-gray-700'}
                  ${getAlignment(i)}
                `}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr 
              key={rowIndex}
              className={`
                border-b ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}
                ${rowIndex % 2 === 1 ? (isDarkMode ? 'bg-white/5' : 'bg-gray-50/50') : ''}
                ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-50'}
                transition-colors
              `}
            >
              {row.map((cell, cellIndex) => (
                <td 
                  key={cellIndex}
                  className={`
                    px-4 py-2.5 ${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}
                    ${getAlignment(cellIndex)}
                  `}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Check if content is a markdown table
 */
export function isMarkdownTable(content: string): boolean {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return false
  
  const firstLine = lines[0]?.trim() ?? ''
  const secondLine = lines[1]?.trim() ?? ''
  
  return (
    firstLine.startsWith('|') && 
    firstLine.endsWith('|') &&
    secondLine.match(/^\|[\s:-]+\|$/) !== null
  )
}

/**
 * Extract and render all tables from content
 */
export function extractTables(content: string): {
  tables: string[]
  remaining: string
} {
  const tableRegex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+)/g
  const tables: string[] = []
  let remaining = content
  
  let match
  while ((match = tableRegex.exec(content)) !== null) {
    const tableContent = match[1]
    if (tableContent) {
      tables.push(tableContent)
      remaining = remaining.replace(tableContent, `\n[TABLE_${tables.length - 1}]\n`)
    }
  }
  
  return { tables, remaining }
}

/**
 * Compact table badge
 */
export const TableBadge: React.FC<{
  rows: number
  cols: number
  onClick?: () => void
  className?: string
}> = ({ rows, cols, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`
      inline-flex items-center gap-1 px-2 py-1 rounded-lg
      bg-gray-100 text-gray-600 hover:bg-gray-200
      text-xs transition-colors
      ${className}
    `}
  >
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" strokeWidth="1.5" />
      <line x1="3" y1="15" x2="21" y2="15" strokeWidth="1.5" />
      <line x1="9" y1="3" x2="9" y2="21" strokeWidth="1.5" />
      <line x1="15" y1="3" x2="15" y2="21" strokeWidth="1.5" />
    </svg>
    {rows} × {cols} table
  </button>
)

export default MarkdownTable

