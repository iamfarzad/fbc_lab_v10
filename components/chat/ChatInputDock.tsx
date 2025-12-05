
import React, { useRef, useState, useEffect } from 'react';
import { Tooltip, isTextMime } from './UIHelpers';
import { LiveConnectionState } from 'types';
import { StagingArea } from './Attachments';
import { Mic, Camera, CameraOff, Monitor, MonitorOff, Paperclip, X, ArrowUp, Sparkles } from 'lucide-react';

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
    isScreenShareActive?: boolean;
    isScreenShareInitializing?: boolean;
    onScreenShareToggle?: () => void;
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
    isScreenShareActive,
    isScreenShareInitializing,
    onScreenShareToggle,
    onSendMessage,
    connectionState,
    onConnect,
    onDisconnect,
    localAiAvailable,
    onLocalAction,
    suggestionsVisible,
    onStopGeneration,
    isGenerating = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const magicMenuRef = useRef<HTMLDivElement>(null);
    
    const [isExpanded, setIsExpanded] = useState(false); 
    const inputValueRef = useRef('');
    const [showMagicMenu, setShowMagicMenu] = useState(false);
    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    
    // Connection States
    const isConnected = connectionState === LiveConnectionState.CONNECTED;
    const isConnecting = connectionState === LiveConnectionState.CONNECTING;

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

    // Removed legacy dictation in favor of Voice Mode logic primarily, but keeping function if needed for text-only fallback?
    // For now, let's keep it but maybe hide the button if we want to declutter.
    // Actually, user said "duplicate controls". Let's removing the dedicated dictation button for now to simplify.
    // Or keeping it as a "Mic" inside the text area for text entry, while the main FAB is for "Live Mode".
    // Let's stick to the Plan: Unify.

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

    const handleVoiceToggle = () => {
        // Haptic feedback
        if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
        
        if (isConnected) {
            onDisconnect();
        } else {
            onConnect();
        }
    };

    return (
        <div className="relative w-full z-40 flex flex-col justify-end pointer-events-auto">
            
            {/* --- EXPANDED VIEW (Slide Up) --- */}
            {isExpanded && (
            <div 
                className="w-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ease-out overflow-visible opacity-100"
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

                    {/* Input Container */}
                    <div className="relative flex flex-col gap-2 bg-gray-50/80 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 p-2 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] ring-1 ring-black/5 dark:ring-white/5 transition-all focus-within:ring-black/10 dark:focus-within:ring-white/20 focus-within:bg-white dark:focus-within:bg-black/40 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                        
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain,text/csv,application/json" onChange={handleFileSelect} />

                        {/* Top Row: Textarea + Send/Close */}
                        <div className="relative flex items-start gap-2">
                            <textarea 
                                data-testid="chat-input-textarea"
                                ref={textareaRef}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="Message F.B/c..."
                                autoFocus
                                className="flex-1 max-h-32 min-h-[44px] py-3 px-4 bg-transparent text-[15px] text-gray-900 dark:text-gray-100 font-normal placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none resize-none custom-scrollbar leading-relaxed"
                                rows={1}
                            />

                            <div className="flex flex-col gap-1 pt-1.5 pr-1 shrink-0">
                                <button 
                                    onClick={() => setIsExpanded(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                                    title="Close Input"
                                >
                                    <X className="w-5 h-5" />
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
                                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors transform active:scale-95 shrink-0 ${
                                                inputValue.trim() || selectedFile 
                                                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                                                    : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/20 cursor-not-allowed'
                                            }`}
                                        >
                                            <ArrowUp className="w-5 h-5" strokeWidth={1.5} />
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        {/* Bottom Row: Tools */}
                        <div className="flex items-center gap-1 px-2 pb-1">
                            {/* File Upload */}
                            <Tooltip text="Upload File">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>
                            </Tooltip>

                            {/* Camera Toggle */}
                            <Tooltip text={isWebcamActive ? "Close Camera" : "Open Camera"}>
                                <button 
                                    onClick={() => onWebcamChange(!isWebcamActive)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isWebcamActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'}`}
                                >
                                    {isWebcamActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                                </button>
                            </Tooltip>
                            
                            {/* Screen Share Toggle */}
                            {onScreenShareToggle && (
                                <Tooltip text={isScreenShareActive ? "Stop Sharing" : "Share Screen"}>
                                    <button 
                                        onClick={onScreenShareToggle}
                                        disabled={isScreenShareInitializing}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                                            isScreenShareActive 
                                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' 
                                                : isScreenShareInitializing 
                                                    ? 'bg-purple-50 dark:bg-purple-900/10 text-purple-400 animate-pulse'
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                                        }`}
                                    >
                                        {isScreenShareActive ? <Monitor className="w-4 h-4" strokeWidth={1.5} /> : <MonitorOff className="w-4 h-4" strokeWidth={1.5} />}
                                    </button>
                                </Tooltip>
                            )}

                            <div className="flex-1" />

                            {/* Local AI / Magic Menu */}
                            {localAiAvailable && (
                                <div className="relative" ref={magicMenuRef}>
                                    <Tooltip text="Local AI Tools">
                                        <button 
                                            onClick={() => setShowMagicMenu(!showMagicMenu)}
                                            disabled={isProcessingLocal || !inputValue.trim()}
                                            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isProcessingLocal ? 'text-purple-400 animate-spin' : showMagicMenu ? 'bg-purple-50 text-purple-600' : 'text-gray-400 dark:text-gray-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400'}`}
                                        >
                                            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                                        </button>
                                    </Tooltip>

                                    {/* POPUP MAGIC MENU */}
                                    {showMagicMenu && (
                                        <div className="absolute bottom-full right-0 mb-3 w-48 bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-xl border border-white/40 dark:border-white/10 shadow-xl ring-1 ring-black/5 overflow-hidden animate-fade-in-up origin-bottom-right z-[100]">
                                            <div className="p-1.5 flex flex-col gap-0.5">
                                                <button 
                                                    onClick={() => void executeMagicAction('rewrite')}
                                                    className="flex items-center gap-3 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-white/10 hover:text-purple-700 dark:hover:text-purple-400 rounded-lg transition-colors"
                                                >
                                                    <div className="flex flex-col">
                                                        <span>Rewrite</span>
                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal">Improve tone & clarity</span>
                                                    </div>
                                                </button>
                                                <div className="h-px bg-gray-100 dark:bg-white/10 my-0.5"></div>
                                                <button 
                                                    onClick={() => void executeMagicAction('proofread')}
                                                    className="flex items-center gap-3 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-white/10 hover:text-purple-700 dark:hover:text-purple-400 rounded-lg transition-colors"
                                                >
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

            {/* --- COLLAPSED VIEW (Unified Floating Bar) --- */}
            {!isExpanded && (
            <div 
                data-testid="chat-input-dock-collapsed"
                className="absolute bottom-0 left-0 w-full p-4 pb-[env(safe-area-inset-bottom,24px)] md:pb-8 flex justify-center transition-all duration-500 delay-100 ease-out pointer-events-auto"
            >
                <div className="flex items-center gap-3 w-full max-w-[500px] mx-auto">
                    
                    {/* Main Input Pill (With Camera & Mic integrated) */}
                    <div className="flex-1 h-[60px] bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:ring-white/5 flex items-center p-1.5 gap-2 transition-transform hover:scale-[1.01]">
                        
                        {/* Camera Button */}
                        <Tooltip text={isWebcamActive ? "Close Camera" : "Open Camera"}>
                            <button 
                                onClick={() => onWebcamChange(!isWebcamActive)}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${isWebcamActive ? 'bg-blue-500 text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                            >
                                {isWebcamActive ? <Camera className="w-5 h-5" strokeWidth={1.5} /> : <CameraOff className="w-5 h-5" strokeWidth={1.5} />}
                            </button>
                        </Tooltip>

                        {/* Fake Input Area */}
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="flex-1 h-full flex items-center px-4 text-left group"
                        >
                            <span className="text-[15px] font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">Ask F.B/c...</span>
                        </button>

                         {/* Divider */}
                         <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>

                        {/* Main Voice Fab (Integrated) */}
                        <Tooltip text={isConnected ? "Disconnect Voice" : "Start Voice Session"}>
                            <button 
                                onClick={handleVoiceToggle}
                                className={`
                                    relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-500
                                    ${isConnected 
                                        ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                                        : isConnecting
                                            ? 'bg-orange-100 text-orange-400 animate-pulse'
                                            : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600'
                                    }
                                `}
                            >
                                {isConnected ? (
                                    <div className="flex gap-1 items-end justify-center h-4">
                                        <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite] h-3"></div>
                                        <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.1s] h-4"></div>
                                        <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.2s] h-3"></div>
                                    </div>
                                ) : (
                                    <Mic className="w-5 h-5" strokeWidth={1.5} />
                                )}
                                
                                {/* Connecting Spinner Ring */}
                                {isConnecting && (
                                    <div className="absolute inset-0 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                                )}
                            </button>
                        </Tooltip>
                    </div>

                 </div>
            </div>
            )}
        </div>
    );
};

export default ChatInputDock;
