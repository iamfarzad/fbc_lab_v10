/**
 * AI Insights Report Preview Component
 * 
 * Renders an inline preview of the AI Insights Report in the chat
 * Full embedded scrollable viewer with download/email actions
 */

import { useState, useRef, useEffect } from 'react'
import { Download, Mail, Calendar, Maximize2, X, FileText } from 'lucide-react'

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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Update iframe content when htmlContent changes
  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [htmlContent])

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
  
  // Expanded modal view
  if (isExpanded) {
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in-up"
        onClick={(e) => {
          // Close when clicking the backdrop (not the iframe container)
          if (e.target === e.currentTarget) {
            setIsExpanded(false)
          }
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
          className="w-[90vw] h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <iframe
            ref={iframeRef}
            title={reportName}
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
        
        {/* Actions bar - Match inline button styles */}
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-full shadow-xl border border-zinc-200 dark:border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDownload}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isDarkMode
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
            }`}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          {onEmail && (
            <button
              onClick={onEmail}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                isDarkMode
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white shadow-sm'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 shadow-sm'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email Report
            </button>
          )}
          <button
            onClick={handleBookCall}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Book Call
          </button>
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
        <button
          onClick={() => setIsExpanded(true)}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' 
              : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
          }`}
          title="Expand to full screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Preview iframe */}
      <div className="relative w-full h-[320px] overflow-hidden bg-white">
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
      
      {/* Actions */}
      <div className={`flex items-center gap-2 px-4 py-3 border-t ${
        isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50'
      }`}>
        <button
          onClick={handleDownload}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
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
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
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
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Book Call
        </button>
      </div>
    </div>
  )
}

export default DiscoveryReportPreview

