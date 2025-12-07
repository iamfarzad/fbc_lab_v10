/**
 * AI Insights Report Preview Component
 * 
 * Renders an inline preview of the AI Insights Report in the chat
 * Full embedded scrollable viewer with download/email actions
 */

import { useState, useRef, useEffect } from 'react'
import { Download, Mail, Calendar, Maximize2, X, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface DiscoveryReportPreviewProps {
  htmlContent: string
  pdfDataUrl?: string | undefined
  reportName?: string
  bookingUrl: string
  onDownload?: () => void
  onEmail?: () => void
  onBookCall?: () => void
  isDarkMode?: boolean
}

export function DiscoveryReportPreview({
  htmlContent,
  pdfDataUrl,
  reportName = 'AI Insights Report',
  bookingUrl,
  onDownload,
  onEmail,
  onBookCall,
  isDarkMode = false
}: DiscoveryReportPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isInlineCollapsed, setIsInlineCollapsed] = useState(false) // Default to open, user can minimize
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Premium Styles to inject
  const premiumStyles = `
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: ${isDarkMode ? '#e4e4e7' : '#27272a'};
      background-color: ${isDarkMode ? '#000000' : '#ffffff'};
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1, h2, h3 {
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 0.75em;
      color: ${isDarkMode ? '#ffffff' : '#18181b'};
    }
    h1 { font-size: 2.25em; border-bottom: 1px solid ${isDarkMode ? '#3f3f46' : '#e4e4e7'}; padding-bottom: 0.5em; margin-bottom: 1em; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    p, li { margin-bottom: 1em; font-size: 1.05em; }
    ul { padding-left: 1.5em; list-style-type: disc; }
    strong { font-weight: 600; color: ${isDarkMode ? '#f97316' : '#ea580c'}; } /* Orange accents */
    blockquote {
      border-left: 4px solid ${isDarkMode ? '#f97316' : '#f97316'};
      padding-left: 1em;
      margin-left: 0;
      font-style: italic;
      background: ${isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)'};
      padding: 1em;
      border-radius: 0 8px 8px 0;
    }
    a { color: #f97316; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `

  // Update iframe content when htmlContent changes
  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        // Inject styles + content
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>${premiumStyles}</style>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            </head>
            <body>${htmlContent}</body>
          </html>
        `)
        doc.close()
      }
    }
  }, [htmlContent, isDarkMode]) // Re-inject if mode changes

  // ESC key handler to close modal
  useEffect(() => {
    if (!isExpanded) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isExpanded])
  
  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (pdfDataUrl) {
      const link = document.createElement('a')
      link.href = pdfDataUrl
      link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  
  const handleBookCall = () => {
    if (onBookCall) {
      onBookCall()
    } else {
      window.open(bookingUrl, '_blank')
    }
  }
  
  // SHARED BUTTONS COMPONENT for consistency
  const ActionButtons = ({ isOverlay = false }) => (
    <div className={`flex items-center gap-2 ${isOverlay 
      ? 'px-4 py-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-full shadow-xl border border-zinc-200 dark:border-zinc-800' 
      : 'px-4 py-3 border-t ' + (isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50')
    }`}>
      <button
        onClick={handleDownload}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
          isDarkMode
            ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </button>
      {onEmail && (
        <button
          onClick={onEmail}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
            isDarkMode
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </button>
      )}
      <button
        onClick={handleBookCall}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-medium transition-colors"
      >
        <Calendar className="w-3.5 h-3.5" />
        Book Call
      </button>
    </div>
  )
  
  // Expanded modal view
  if (isExpanded) {
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in-up"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsExpanded(false)
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute top-4 right-4 p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all z-[101]"
          aria-label="Close report"
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* Full screen iframe */}
        <div 
          className="w-[90vw] h-[90vh] bg-white dark:bg-black rounded-xl overflow-hidden shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Iframe with styles injected */}
          <iframe
            ref={(node) => {
               // We need to re-inject if this ref mounts fresh
               if (node && htmlContent) {
                  const doc = node.contentDocument
                  if (doc && doc.body.innerHTML === "") { // Only if empty
                     doc.open()
                     doc.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <style>${premiumStyles}</style>
                          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                        </head>
                        <body>${htmlContent}</body>
                      </html>
                    `)
                     doc.close()
                  }
               }
            }}
            title={reportName}
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
        
        {/* Actions bar - Floating at bottom */}
        <div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          onClick={(e) => e.stopPropagation()}
        >
            <ActionButtons isOverlay={true} />
        </div>
      </div>
    )
  }
  
  // Inline preview (in chat)
  return (
    <div className={`w-full max-w-[500px] rounded-xl overflow-hidden border transition-all duration-300 ${
      isDarkMode 
        ? 'bg-zinc-900/50 border-zinc-800 backdrop-blur-md' 
        : 'bg-white/60 border-zinc-200 backdrop-blur-md'
    } shadow-lg hover:shadow-xl`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
            <FileText className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
              {reportName}
            </h4>
            <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Your personalized AI insights
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
            {/* Collapse / Minimize Button */}
            <button
                onClick={() => setIsInlineCollapsed(!isInlineCollapsed)}
                className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' 
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                }`}
                title={isInlineCollapsed ? "Expand preview" : "Minimize preview"}
            >
               {isInlineCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Scale Up Button */}
            <button
            onClick={() => setIsExpanded(true)}
            className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' 
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
            }`}
            title="Full screen view"
            >
            <Maximize2 className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      {/* Preview Content - Collapsible */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isInlineCollapsed ? 'max-h-0' : 'max-h-[320px]'}`}>
        <div className="relative w-full h-[320px] bg-white">
            <iframe
            ref={iframeRef}
            title={reportName}
            className="w-full h-full border-0 transform scale-[0.5] origin-top-left"
            style={{ 
                width: '200%', 
                height: '200%',
                pointerEvents: 'none'
            }}
            sandbox="allow-same-origin"
            />
            {/* Click overlay to expand */}
            <button
            onClick={() => setIsExpanded(true)}
            className="absolute inset-0 bg-transparent hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Click to expand report"
            />
            {/* Gradient fade at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
      </div>
      
      {/* Actions - Always visible? Or hide when collapsed? User said "Minimize it", usually implies hiding content. I'll keep buttons visible as they are high value. */}
      {/* Update: Let's keep them visible as they are the primary CTA */}
      <ActionButtons />
    </div>
  )
}

export default DiscoveryReportPreview

