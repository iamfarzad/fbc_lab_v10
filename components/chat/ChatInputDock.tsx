
import React, { useRef, useState, useEffect } from 'react';
import { Tooltip, isTextMime } from './UIHelpers';
import { LiveConnectionState } from 'types';
import { StagingArea } from './Attachments';

const SUGGESTIONS = [
  "Research & compare iPhone 16 vs Pixel 9",
  "Plan a weekend trip to Kyoto",
  "Explain quantum entanglement",
  "Find top-rated ramen nearby"
];

interface ChatInputDockProps {
    inputValue: string;
    setInputValue: (val: string) => void;
    selectedFile: any;
    setSelectedFile: (file: any) => void;
    isWebcamActive: boolean;
    onWebcamChange: (active: boolean) => void;
    onSendMessage: (text: string, file?: { mimeType: string, data: string }) => void;
    connectionState: LiveConnectionState;
    onConnect: () => void;
    onDisconnect: () => void;
    localAiAvailable?: boolean;
    onLocalAction?: (text: string, action: 'rewrite' | 'proofread') => Promise<string>;
    suggestionsVisible: boolean;
    onStopGeneration?: () => void;
    isGenerating?: boolean;
}

const ChatInputDock: React.FC<ChatInputDockProps> = ({
    inputValue,
    setInputValue,
    selectedFile,
    setSelectedFile,
    isWebcamActive,
    onWebcamChange,
    onSendMessage,
    connectionState,
    // onConnect, // Not used
    // onDisconnect, // Not used
    localAiAvailable,
    onLocalAction,
    suggestionsVisible,
    onStopGeneration,
    isGenerating = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const magicMenuRef = useRef<HTMLDivElement>(null);
    
    const [isDictating, setIsDictating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); 
    const recognitionRef = useRef<any>(null);
    const inputValueRef = useRef('');
    const [showMagicMenu, setShowMagicMenu] = useState(false);
    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    
    const isConnected = connectionState === LiveConnectionState.CONNECTED;

    useEffect(() => {
        inputValueRef.current = inputValue;
    }, [inputValue]);

    useEffect(() => {
        if (isExpanded && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isExpanded]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (magicMenuRef.current && !magicMenuRef.current.contains(event.target as Node)) {
                setShowMagicMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        adjustHeight();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item && item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) processFile(file);
            }
        }
    };

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
                    setSelectedFile({ 
                        url: result, 
                        base64, 
                        mimeType: file.type,
                        name: file.name,
                        size: file.size, 
                        type: isImage ? 'image' : 'file',
                        textContent
                    });
                };
                textReader.readAsText(file);
            } else {
                setSelectedFile({ 
                    url: result, 
                    base64, 
                    mimeType: file.type,
                    name: file.name,
                    size: file.size, 
                    type: isImage ? 'image' : 'file'
                });
            }
        };
        reader.readAsDataURL(file);
        if (!isExpanded) setIsExpanded(true);
    };

    const handleSendMessage = () => {
        const hasContent = inputValue.trim().length > 0 || !!selectedFile;
        if (hasContent) {
            const filePayload = selectedFile ? { mimeType: selectedFile.mimeType, data: selectedFile.base64 } : undefined;
            onSendMessage(inputValue, filePayload);
            setInputValue('');
            setSelectedFile(null);
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = ''; // Allow re-selecting same file
    };

    const toggleDictation = () => {
        if (isDictating) {
            recognitionRef.current?.stop();
            setIsDictating(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        const startingValue = inputValueRef.current;

        recognition.onstart = () => setIsDictating(true);
        recognition.onend = () => setIsDictating(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsDictating(false);
        };

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            
            if (transcript) {
                const spacer = (startingValue && !startingValue.endsWith(' ') && !transcript.startsWith(' ')) ? ' ' : '';
                const newValue = startingValue + spacer + transcript;
                
                setInputValue(newValue);
                adjustHeight();
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const executeMagicAction = async (action: 'rewrite' | 'proofread') => {
        if (!onLocalAction || !inputValue.trim()) return;
        setShowMagicMenu(false);
        setIsProcessingLocal(true);
        const result = await onLocalAction(inputValue, action);
        if (result) {
            setInputValue(result);
            adjustHeight();
        }
        setIsProcessingLocal(false);
    };

    return (
        <div className="relative w-full z-40 flex flex-col justify-end pointer-events-auto">
            
            {/* --- EXPANDED VIEW (Slide Up) --- */}
            {isExpanded && (
            <div 
                className="w-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ease-out overflow-hidden opacity-100 max-h-[600px]"
            >
                <div className="
                    w-full
                    bg-white/95 dark:bg-black/95 md:bg-white/80 md:dark:bg-black/80
                    backdrop-blur-xl border-t border-white/20 dark:border-white/10
                    p-4 pb-[env(safe-area-inset-bottom,24px)] md:pb-6
                    md:rounded-b-[32px]
                    shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
                ">
                    {/* Staging Area */}
                    <div className="relative w-full mb-4">
                        <StagingArea 
                            selectedFile={selectedFile}
                            onRemove={() => setSelectedFile(null)}
                        />
                    </div>

                    {/* Suggestions Chips */}
                    {suggestionsVisible && (
                        <div className="flex gap-2 overflow-x-auto pb-3 px-1 no-scrollbar mask-image-gradient-right mb-1">
                            {SUGGESTIONS.map((s, i) => (
                                <button 
                                    key={i}
                                    onClick={() => { setInputValue(s); onSendMessage(s); }}
                                    className="whitespace-nowrap px-3 py-1.5 bg-white/70 dark:bg-white/10 backdrop-blur-md rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-white/20 hover:text-blue-600 dark:hover:text-white hover:shadow-sm transition-all border border-gray-200/50 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-95"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Dock - Glassmorphism Pill */}
                    <div className="relative flex flex-col gap-2 bg-gray-50/80 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 p-2 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] ring-1 ring-black/5 dark:ring-white/5 transition-all focus-within:ring-black/10 dark:focus-within:ring-white/20 focus-within:bg-white dark:focus-within:bg-black/40 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
                        
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain,text/csv,application/json" onChange={handleFileSelect} />

                        {/* Textarea on top */}
                        <div className="relative flex items-start gap-2">
                            <textarea 
                                ref={textareaRef}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder={isConnected ? "Message Gemini..." : "Ask or research..."}
                                autoFocus
                                className="flex-1 max-h-32 min-h-[40px] py-2.5 px-3 bg-transparent text-[15px] text-gray-900 dark:text-gray-100 font-normal placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none resize-none custom-scrollbar leading-relaxed"
                                rows={1}
                            />

                            <div className="flex flex-col gap-1 pt-1 shrink-0">
                                <button 
                                    onClick={() => setIsExpanded(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                                    title="Close Keyboard"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                </button>

                                {isGenerating && onStopGeneration ? (
                                    <Tooltip text="Stop Generating">
                                        <button 
                                            onClick={onStopGeneration}
                                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all transform active:scale-95 shrink-0 bg-black dark:bg-white text-white dark:text-black shadow-md hover:bg-gray-800 dark:hover:bg-gray-200"
                                        >
                                            <div className="w-2.5 h-2.5 bg-white dark:bg-black rounded-sm" />
                                        </button>
                                    </Tooltip>
                                ) : (
                                    <Tooltip text="Send Message">
                                        <button 
                                            onClick={() => handleSendMessage()}
                                            disabled={!inputValue.trim() && !selectedFile}
                                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all transform active:scale-95 shrink-0 ${
                                                inputValue.trim() || selectedFile 
                                                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-md hover:bg-gray-800 dark:hover:bg-gray-200' 
                                                    : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/20 cursor-not-allowed'
                                            }`}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        {/* Action buttons row below */}
                        <div className="flex items-center justify-center gap-1 px-1 pb-0.5">
                            <Tooltip text="Upload File">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </Tooltip>

                            <Tooltip text={isWebcamActive ? "Close Camera" : "Open Camera"}>
                                <button 
                                    onClick={() => onWebcamChange(!isWebcamActive)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isWebcamActive ? 'bg-red-50 text-red-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'}`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 17C14.21 17 16 15.21 16 13C16 10.79 14.21 9 12 9C9.79 9 8 10.79 8 13C8 15.21 9.79 17 12 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </Tooltip>
                            
                            <Tooltip text={isDictating ? "Stop Dictation" : "Dictate"}>
                                <button 
                                    onClick={toggleDictation}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDictating ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'}`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 1C10.3 1 9 2.3 9 4V12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12V4C15 2.3 13.7 1 12 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M19 10C19 14 16 17 12 17C8 17 5 14 5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 17V23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </Tooltip>
                            
                            {localAiAvailable && (
                                <div className="relative" ref={magicMenuRef}>
                                    <Tooltip text="Local AI Tools">
                                        <button 
                                            onClick={() => setShowMagicMenu(!showMagicMenu)}
                                            disabled={isProcessingLocal || !inputValue.trim()}
                                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isProcessingLocal ? 'text-purple-400 animate-spin' : showMagicMenu ? 'bg-purple-50 text-purple-600' : 'text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400'}`}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M15 9L9 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M9 9L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                    </Tooltip>

                                    {/* POPUP MAGIC MENU */}
                                    {showMagicMenu && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-xl border border-white/40 dark:border-white/10 shadow-xl ring-1 ring-black/5 overflow-hidden animate-fade-in-up origin-bottom z-[100]">
                                            <div className="p-1.5 flex flex-col gap-0.5">
                                                <button 
                                                    onClick={() => {
                                                      void executeMagicAction('rewrite')
                                                    }}
                                                    className="flex items-center gap-3 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-white/10 hover:text-purple-700 dark:hover:text-purple-400 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                    <div className="flex flex-col">
                                                        <span>Rewrite</span>
                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal">Improve tone & clarity</span>
                                                    </div>
                                                </button>
                                                <div className="h-px bg-gray-100 dark:bg-white/10 my-0.5"></div>
                                                <button 
                                                    onClick={() => {
                                                      void executeMagicAction('proofread')
                                                    }}
                                                    className="flex items-center gap-3 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-white/10 hover:text-purple-700 dark:hover:text-purple-400 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                                    <div className="flex flex-col">
                                                        <span>Proofread</span>
                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal">Fix grammar errors</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* --- COLLAPSED VIEW (Pill) --- */}
            {/* Kept absolute so it stays at the bottom when collapsed, but visibility toggles */}
            {!isExpanded && (
            <div 
                className="absolute bottom-0 left-0 w-full p-4 pb-[env(safe-area-inset-bottom,24px)] md:pb-6 flex justify-center transition-all duration-500 delay-100 cubic-bezier(0.16, 1, 0.3, 1) pointer-events-auto translate-y-0 opacity-100"
            >
                <div className="flex items-center gap-3 bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-white/60 dark:border-white/10 p-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] ring-1 ring-black/5 hover:scale-105 transition-all duration-300 pb-[env(safe-area-inset-bottom,2px)]">
                    <Tooltip text={isWebcamActive ? "Close Camera" : "Open Camera"}>
                        <button 
                            onClick={() => onWebcamChange(!isWebcamActive)}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isWebcamActive ? 'bg-red-50 text-red-500' : 'bg-gray-50 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20'}`}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 17C14.21 17 16 15.21 16 13C16 10.79 14.21 9 12 9C9.79 9 8 10.79 8 13C8 15.21 9.79 17 12 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </Tooltip>

                    <Tooltip text="Open Keyboard">
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 shadow-md"
                        >
                            {/* Keyboard Icon */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
                            </svg>
                        </button>
                    </Tooltip>
                 </div>
            </div>
            )}
      </div>
    );
};

export default ChatInputDock;
