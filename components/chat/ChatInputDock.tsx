
import React, { useRef, useState, useEffect } from 'react';
import { Tooltip, isTextMime } from './UIHelpers';
import { LiveConnectionState } from 'types';
import { StagingArea } from './Attachments';
import { Mic, Camera, CameraOff, Monitor, MonitorOff, Paperclip, X, ArrowUp, AudioLines } from 'lucide-react';

interface ChatInputDockProps {
    inputValue: string;
    setInputValue: (val: string) => void;
    selectedFile: any;
    setSelectedFile: (file: any) => void;
    isWebcamActive: boolean;
    onWebcamChange: (active: boolean) => void;
    isScreenShareActive?: boolean | undefined;
    isScreenShareInitializing?: boolean | undefined;
    onScreenShareToggle?: (() => void) | undefined;
    onSendMessage: (text: string, file?: { mimeType: string, data: string }) => void;
    connectionState: LiveConnectionState;
    onConnect: () => void;
    onDisconnect: () => void;
    onStopGeneration?: (() => void) | undefined;
    isGenerating?: boolean | undefined;
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
    onStopGeneration,
    isGenerating = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [isExpanded, setIsExpanded] = useState(false); 
    const [isListening, setIsListening] = useState(false);
    
    // Connection States
    const isConnected = connectionState === LiveConnectionState.CONNECTED;
    const isConnecting = connectionState === LiveConnectionState.CONNECTING;

    useEffect(() => {
        if (isExpanded && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isExpanded]);

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
        e.target.value = ''; 
    };

    // --- Dictation Logic (Simple Shim) ---
    const toggleDictation = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser.');
            return;
        }

        if (isListening) {
             setIsListening(false);
        } else {
            setIsListening(true);
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            
            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result) => result.transcript)
                    .join('');
                setInputValue(inputValue ? inputValue + ' ' + transcript : transcript);
                adjustHeight();
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        }
    };

    const handleVoiceToggle = () => {
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
                    bg-white/95 dark:bg-zinc-950/95 md:bg-white/80 md:dark:bg-zinc-950/80
                    backdrop-blur-xl border-t border-white/20 dark:border-white/10
                    p-4 pb-[env(safe-area-inset-bottom,24px)] md:pb-6
                    md:rounded-b-[32px]
                    shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
                ">
                    <div className="relative w-full mb-4">
                        <StagingArea 
                            selectedFile={selectedFile}
                            onRemove={() => setSelectedFile(null)}
                        />
                    </div>

                    <div className="relative flex flex-col gap-2 bg-gray-50/80 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 p-2 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] ring-1 ring-black/5 dark:ring-white/5 transition-all focus-within:ring-black/10 dark:focus-within:ring-white/20 focus-within:bg-white dark:focus-within:bg-black/40">
                        
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain,text/csv,application/json" onChange={handleFileSelect} />

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
                                className="flex-1 max-h-48 min-h-[50px] py-3.5 px-4 bg-transparent text-[15px] text-gray-900 dark:text-gray-100 font-normal placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none resize-none custom-scrollbar leading-relaxed"
                                rows={1}
                            />
                            
                            <div className="flex flex-col gap-1 pt-2 pr-1 shrink-0">
                                <Tooltip text="Close Expanded View">
                                    <button 
                                        onClick={() => setIsExpanded(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </Tooltip>

                                <Tooltip text={isListening ? "Stop Dictation" : "Dictate to Text"}>
                                    <button
                                        onClick={toggleDictation}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                                            isListening 
                                                ? 'bg-red-500 text-white animate-pulse' 
                                                : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                                        }`}
                                    >
                                        <AudioLines className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 pb-1.5">
                            
                            <Tooltip text="Upload File">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>
                            </Tooltip>

                            <Tooltip text={isWebcamActive ? "Close Camera" : "Open Camera"}>
                                <button 
                                    onClick={() => onWebcamChange(!isWebcamActive)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isWebcamActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'}`}
                                >
                                    {isWebcamActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                                </button>
                            </Tooltip>
                            
                            {onScreenShareToggle && (
                                <Tooltip text={isScreenShareActive ? "Stop Sharing" : "Share Screen"}>
                                    <button 
                                        onClick={onScreenShareToggle}
                                        disabled={isScreenShareInitializing}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                                            isScreenShareActive 
                                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' 
                                                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        {isScreenShareActive ? <Monitor className="w-4 h-4" /> : <MonitorOff className="w-4 h-4" />}
                                    </button>
                                </Tooltip>
                            )}

                            {/* Voice Session Button (Expanded State) */}
                            <Tooltip text={isConnected ? "Disconnect Voice" : "Start Voice Session"}>
                                <button 
                                    onClick={handleVoiceToggle}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                                        isConnected 
                                            ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]' 
                                            : isConnecting
                                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500 animate-pulse'
                                                : 'text-zinc-500 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600'
                                    }`}
                                >
                                    {isConnected ? (
                                        <div className="flex gap-0.5 items-end justify-center h-4">
                                            <div className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite] h-2"></div>
                                            <div className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite_0.1s] h-3"></div>
                                            <div className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite_0.2s] h-2"></div>
                                        </div>
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>
                            </Tooltip>

                            <div className="flex-1" />

                            {isGenerating && onStopGeneration ? (
                                <Tooltip text="Stop Generating">
                                    <button 
                                        onClick={onStopGeneration}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black shadow-md hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <div className="w-3 h-3 bg-current rounded-sm" />
                                    </button>
                                </Tooltip>
                            ) : (
                                <Tooltip text="Send Message">
                                    <button 
                                        onClick={() => handleSendMessage()}
                                        disabled={!inputValue.trim() && !selectedFile}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full shadow-md transition-all transform active:scale-95 ${
                                            inputValue.trim() || selectedFile 
                                                ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200' 
                                                : 'bg-zinc-200 dark:bg-white/10 text-zinc-400 dark:text-white/20 cursor-not-allowed'
                                        }`}
                                    >
                                        <ArrowUp className="w-5 h-5" strokeWidth={2} />
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {!isExpanded && (
            <div 
                data-testid="chat-input-dock-collapsed"
                className="absolute bottom-0 left-0 w-full p-4 pb-[env(safe-area-inset-bottom,24px)] md:pb-8 flex justify-center pointer-events-auto animate-slide-up"
            >
                <div className="flex items-center gap-3 w-full max-w-[500px] mx-auto">
                    
                    <div className="flex-1 h-[60px] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:ring-white/5 flex items-center p-1.5 gap-2 transition-transform hover:scale-[1.01]">
                        
                        <Tooltip text={isWebcamActive ? "Close Camera" : "Open Camera"}>
                            <button 
                                onClick={() => onWebcamChange(!isWebcamActive)}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
                                    isWebcamActive ? 'bg-black/5 dark:bg-white/10 text-blue-500' : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'
                                }`}
                            >
                                {isWebcamActive ? <Camera className="w-5 h-5" strokeWidth={1.5} /> : <CameraOff className="w-5 h-5" strokeWidth={1.5} />}
                            </button>
                        </Tooltip>

                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="flex-1 h-full flex items-center px-4 text-left group"
                        >
                            <span className="text-[15px] font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">Ask F.B/c...</span>
                        </button>

                         <div className="w-px h-6 bg-zinc-200 dark:bg-white/10 mx-1"></div>

                        <Tooltip text={isConnected ? "Disconnect Voice" : "Start Voice Session"}>
                            <button 
                                onClick={handleVoiceToggle}
                                className={`
                                    relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-500
                                    ${isConnected 
                                        ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pop-in' 
                                        : isConnecting
                                            ? 'bg-orange-100 text-orange-400 animate-pulse'
                                            : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600'
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
