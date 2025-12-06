
import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { TranscriptItem, LiveConnectionState } from 'types';
import ChatMessage from './chat/ChatMessage';
import ChatInputDock from './chat/ChatInputDock';
import { Lightbox } from './chat/Attachments';
import { isTextMime } from './chat/UIHelpers';
import StatusBadges from './StatusBadges';
import EmptyState from './chat/EmptyState';
import { FloatingToolIndicator, ToolCall } from './chat/ToolCallIndicator';
import { ResponseTimeBadge } from './chat/MessageMetadata';

interface MultimodalChatProps {
  items: TranscriptItem[];
  connectionState: LiveConnectionState;
  onSendMessage: (text: string, file?: { mimeType: string, data: string }) => void;
  onSendVideoFrame: (base64: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  isWebcamActive: boolean;
  onWebcamChange: (active: boolean) => void;
  isScreenShareActive?: boolean | undefined;
  isScreenShareInitializing?: boolean;
  onScreenShareToggle?: () => void;
  isLocationShared?: boolean | undefined;
  localAiAvailable?: boolean | undefined;
  onLocalAction?: (text: string, action: 'rewrite' | 'proofread') => Promise<string>;
  onStopGeneration?: () => void;
  visible?: boolean | undefined;
  onToggleVisibility?: (visible: boolean) => void;
  isDarkMode?: boolean | undefined;
  onToggleTheme?: () => void;
  onGeneratePDF?: () => void;
  onEmailPDF?: () => void;
  userEmail?: string | undefined;
  userName?: string | undefined;
  activeTools?: ToolCall[];
  latency?: number | undefined;
}

const MultimodalChat: React.FC<MultimodalChatProps> = ({ 
    items, 
    connectionState,
    onSendMessage,
    onConnect,
    onDisconnect,
    isWebcamActive,
    onWebcamChange,
    isScreenShareActive,
    isScreenShareInitializing,
    onScreenShareToggle,
    isLocationShared,
    onStopGeneration,
    visible = true,
    onToggleVisibility,
    isDarkMode = false,
    onToggleTheme,
    onGeneratePDF,
    onEmailPDF,
    userEmail,
    activeTools = []
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ url: string, base64: string, mimeType: string, name: string, size: number, type: 'image' | 'file', textContent?: string } | null>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPDFMenu, setShowPDFMenu] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  
  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  
  // Mobile Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  
  // Initialize based on window width to prevent flash on mobile
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  const systemMessageSentRef = useRef(false);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useLayoutEffect(() => {
    if (visible) {
        scrollToBottom();
    }
  }, [items.length, items[items.length-1]?.text, isWebcamActive, selectedFile, visible]);

  useEffect(() => {
      const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
      checkDesktop();
      window.addEventListener('resize', checkDesktop);
      return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setShowPDFMenu(false);
      }
    };
    if (showPDFMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPDFMenu]);

  // --- Drag & Drop Logic ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
          processFile(file);
      }
  }, []);

  const processFile = (file: File) => {
        const isImage = file.type.startsWith('image/');
        const isText = isTextMime(file.type);
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            const base64 = result.split(',')[1];
            
            let textContent = undefined;
            if (isText) {
                const textReader = new FileReader();
                textReader.onload = (te) => {
                    textContent = te.target?.result as string;
                    if (base64) {
                        setSelectedFile({ 
                            url: result, 
                            base64, 
                            mimeType: file.type,
                            name: file.name,
                            size: file.size, 
                            type: isImage ? 'image' : 'file',
                            textContent
                        });
                    }
                };
                textReader.readAsText(file);
            } else {
                if (base64) {
                    setSelectedFile({ 
                        url: result, 
                        base64, 
                        mimeType: file.type,
                        name: file.name,
                        size: file.size,
                        type: isImage ? 'image' : 'file'
                    });
                }
            }
        };
        reader.readAsDataURL(file);
  };

  // --- Sidebar Resize Logic ---
  const startResizing = useCallback(() => {
      setIsResizingSidebar(true);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
      setIsResizingSidebar(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
      if (isResizingSidebar) {
           const newWidth = window.innerWidth - e.clientX;
           if (newWidth > 300 && newWidth < 800) {
              setSidebarWidth(newWidth);
           }
      }
  }, [isResizingSidebar]);

  useEffect(() => {
      if (isResizingSidebar) {
           window.addEventListener('mousemove', resize);
           window.addEventListener('mouseup', stopResizing);
      } else {
           window.removeEventListener('mousemove', resize);
           window.removeEventListener('mouseup', stopResizing);
      }
      return () => {
           window.removeEventListener('mousemove', resize);
           window.removeEventListener('mouseup', stopResizing);
      };
  }, [isResizingSidebar, resize, stopResizing]);
  
  // --- Mobile Swipe Logic ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (!isDesktop && e.touches[0]) {
          setTouchStart(e.touches[0].clientY);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDesktop && touchStart !== null && e.touches[0]) {
          const currentY = e.touches[0].clientY;
          const diff = currentY - touchStart;
          if (diff > 0) setDragOffset(diff); // Only drag down
      }
  };

  const handleTouchEnd = () => {
      if (!isDesktop) {
          if (dragOffset > 150 && onToggleVisibility) {
              onToggleVisibility(false);
          }
          setDragOffset(0);
          setTouchStart(null);
      }
  };

  useEffect(() => {
      if (isWebcamActive && connectionState === LiveConnectionState.CONNECTED && !systemMessageSentRef.current) {
          onSendMessage("[System: Webcam video stream started. User is now sharing their camera feed.]");
          systemMessageSentRef.current = true;
      }
      if (!isWebcamActive) {
          systemMessageSentRef.current = false;
      }
  }, [isWebcamActive, connectionState, onSendMessage]);


  return (
    <div 
        className={`
            fixed top-0 right-0 h-[100dvh] pointer-events-none flex flex-col z-[60] 
            will-change-transform
            ${visible 
                ? 'translate-x-0 translate-y-0' 
                : isDesktop 
                    ? 'translate-x-full' // Slide right on desktop
                    : 'translate-y-[110%]' // Slide down on mobile
            }
        `}
        style={{ 
            width: isDesktop ? `${sidebarWidth}px` : '100%',
            transform: !isDesktop && visible && dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
            transition: isResizingSidebar ? 'none' : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), width 0.3s ease-out'
        }}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
          <div className="absolute inset-0 z-[100] bg-white/80 dark:bg-black/80 backdrop-blur-xl m-4 rounded-3xl border-2 border-dashed border-blue-400 flex flex-col items-center justify-center pointer-events-none animate-fade-in-up">
               <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-500 mb-4">
                   <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
               </div>
               <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Drop to Analyze</h3>
               <p className="text-blue-600/60 dark:text-blue-200/60 mt-2">Images, PDFs, and text files supported</p>
          </div>
      )}

      {/* Resize Handle (Desktop Only) */}
      <div 
          onMouseDown={startResizing}
          className="hidden md:flex items-center justify-center absolute top-0 left-6 -ml-3 w-6 h-full cursor-ew-resize z-50 pointer-events-auto group/handle touch-none"
          title="Drag to resize chat"
      >
          <div className="w-1 h-full rounded-full transition-all duration-300 bg-transparent group-hover/handle:bg-blue-400/20 group-active/handle:bg-blue-500/40 backdrop-blur-[2px]" />
      </div>

      <div 
        className={`
            relative flex flex-col w-full h-full md:h-[calc(100%-3rem)] md:m-6 md:rounded-[32px] overflow-hidden 
            bg-white/95 dark:bg-black/95 md:bg-white/40 md:dark:bg-black/40
            backdrop-blur-xl border-none md:border md:border-white/40 dark:md:border-white/10 
            md:shadow-2xl pointer-events-auto transition-colors duration-500
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
          {/* MOBILE DRAG HANDLE */}
          <div 
             className="w-full flex justify-center pt-3 pb-2 md:hidden cursor-grab active:cursor-grabbing shrink-0 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-md"
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
          >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>

          {/* CHAT HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 shrink-0 z-10 bg-white/40 dark:bg-black/40 backdrop-blur-md gap-4">
              <div className="flex items-center gap-3 min-w-0">
                 {/* Connection Dot & Title */}
                 <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${connectionState === LiveConnectionState.CONNECTED ? 'bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <span className="text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-100 font-mono">
                        F.B/c
                    </span>
                 </div>

                 <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1"></div>

                 <StatusBadges 
                    isLocationShared={isLocationShared}
                    isProcessing={items.some(i => !i.isFinal)}
                    className=""
                 />
              </div>
              
              <div className="flex items-center gap-1">
                  {onToggleTheme && (
                    <button 
                        onClick={onToggleTheme}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDarkMode ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5'}`}
                        title="Toggle Theme"
                    >
                        {isDarkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        )}
                    </button>
                  )}

                  {(onGeneratePDF || onEmailPDF) && (
                    <div className="relative" ref={pdfMenuRef}>
                      <button 
                          onClick={() => setShowPDFMenu(!showPDFMenu)}
                          disabled={items.length === 0}
                          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${items.length === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 cursor-pointer'} ${isDarkMode ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5'}`}
                          title="Export Report"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </button>
                      
                      {/* PDF Export Dropdown Menu */}
                      {showPDFMenu && items.length > 0 && (
                        <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg border backdrop-blur-lg z-50 overflow-hidden ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/10'}`}>
                          {onGeneratePDF && (
                            <button
                              onClick={() => {
                                onGeneratePDF();
                                setShowPDFMenu(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDarkMode ? 'text-white/80 hover:bg-white/10' : 'text-black/80 hover:bg-black/5'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Download PDF
                            </button>
                          )}
                          {onEmailPDF && (
                            <button
                              onClick={() => {
                                onEmailPDF();
                                setShowPDFMenu(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDarkMode ? 'text-white/80 hover:bg-white/10' : 'text-black/80 hover:bg-black/5'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                              Email PDF{userEmail ? ` to ${userEmail.split('@')[0]}...` : ''}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {onToggleVisibility && (
                    <button 
                        onClick={() => onToggleVisibility(false)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDarkMode ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5'}`}
                        title="Close Chat"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  )}
              </div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 custom-scrollbar mask-image-gradient">
            {items.length === 0 ? (
              <EmptyState 
                onSuggest={(text) => onSendMessage(text)}
              />
            ) : (
              items.map((item, index) => (
                <div key={item.id + index}>
                  <ChatMessage 
                    item={item} 
                    onPreview={setPreviewItem}
                    isDarkMode={isDarkMode}
                  />
                  {index === items.length - 1 && item.role === 'model' && item.isFinal && item.processingTime && (
                    <ResponseTimeBadge 
                      ms={item.processingTime}
                      className="mt-1 ml-5"
                    />
                  )}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          
          <FloatingToolIndicator tools={activeTools} />

          {/* INPUT DOCK */}
          <ChatInputDock 
            inputValue={inputValue}
            setInputValue={setInputValue}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            isWebcamActive={isWebcamActive}
            onWebcamChange={onWebcamChange}
            isScreenShareActive={isScreenShareActive}
            isScreenShareInitializing={isScreenShareInitializing}
            onScreenShareToggle={onScreenShareToggle}
            onSendMessage={onSendMessage}
            connectionState={connectionState}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onStopGeneration={onStopGeneration}
            isGenerating={items.some(i => !i.isFinal)}
          />
      </div>

      {previewItem && (
          <Lightbox attachment={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
};

export default MultimodalChat;