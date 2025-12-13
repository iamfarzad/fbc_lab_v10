import React, { useEffect, useRef } from 'react';
import { Monitor, MonitorOff, Camera, X } from 'lucide-react';

interface ScreenSharePreviewProps {
    isScreenShareActive: boolean;
    isInitializing: boolean;
    stream: MediaStream | null;
    error: string | null;
    onToggle: () => void;
    onCapture?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

const ScreenSharePreview: React.FC<ScreenSharePreviewProps> = ({
    isScreenShareActive,
    isInitializing,
    stream,
    error,
    onToggle,
    onCapture,
    className,
    style
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const frameIndicatorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [stream]);

    // Pulse indicator when capturing
    useEffect(() => {
        if (isScreenShareActive && frameIndicatorRef.current) {
            const interval = setInterval(() => {
                frameIndicatorRef.current?.animate([
                    { opacity: 0.3, transform: 'scale(1)' },
                    { opacity: 1, transform: 'scale(1.5)' },
                    { opacity: 0.3, transform: 'scale(1)' }
                ], {
                    duration: 400,
                    easing: 'ease-out'
                });
            }, 4000); // Match capture interval
            return () => clearInterval(interval);
        }
    }, [isScreenShareActive]);

    if (!isScreenShareActive && !isInitializing) return null;

    return (
        <div 
            className={`relative w-full h-full bg-gray-900 overflow-hidden shadow-2xl animate-fade-in-up group ring-1 ring-white/10 transform transition-all ${className}`}
            style={style}
        >
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center gap-3 animate-fade-in-up">
                    <MonitorOff className="w-8 h-8 text-red-400" />
                    <p className="text-sm font-medium text-white/70">{error}</p>
                    <div className="flex gap-2 mt-2">
                        <button 
                            onClick={onToggle} 
                            className="px-4 py-1.5 bg-black text-white text-xs rounded-full hover:bg-zinc-800 transition-colors"
                        >
                            Retry
                        </button>
                        <button 
                            onClick={onToggle} 
                            className="px-4 py-1.5 bg-gray-700 text-white text-xs rounded-full hover:bg-gray-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            ) : isInitializing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white gap-3">
                    <div className="relative">
                        <Monitor className="w-10 h-10 text-white/70 animate-pulse" />
                        <div className="absolute -inset-2 bg-white/10 rounded-full animate-ping" />
                    </div>
                    <p className="text-sm text-white/60">Starting screen share...</p>
                </div>
            ) : (
                <>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-contain bg-black" 
                    />
                    
                    {/* Live indicator */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-full z-10 border border-white/10 shadow-lg">
                        <Monitor className="w-3 h-3 text-white" />
                        <span className="text-[8px] font-mono text-white tracking-widest uppercase">Screen</span>
                    </div>

                    {/* Capture indicator */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none">
                        <div 
                            ref={frameIndicatorRef} 
                            className="w-1.5 h-1.5 bg-white/70 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)] opacity-50" 
                        />
                    </div>

                    {/* Surface type indicator */}
                    {stream?.getVideoTracks()[0]?.getSettings().displaySurface && (
                        <div className="absolute bottom-2 left-2 text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded-full">
                            {stream.getVideoTracks()[0]?.getSettings().displaySurface}
                        </div>
                    )}

                    {/* Hover controls */}
                    <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                        {onCapture && (
                            <button 
                                onClick={onCapture} 
                                className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-lg text-white rounded-full hover:bg-white/20 transition-all border border-white/20 shadow-xl"
                                title="Capture frame"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={onToggle} 
                            className="w-10 h-10 flex items-center justify-center bg-red-500/90 backdrop-blur-lg text-white rounded-full hover:bg-red-600 transition-all border border-white/20 shadow-xl"
                            title="Stop sharing"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ScreenSharePreview;
