
import React, { useEffect, useRef, useState } from 'react';
import { FaceLandmarkStore, type Landmark3D } from 'utils/visuals/store';

interface WebcamPreviewProps {
    isWebcamActive: boolean;
    facingMode: 'user' | 'environment';
    onFacingModeToggle: () => void;
    onClose: () => void;
    onSendFrame: (base64: string) => void;
    onCameraStart?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

const WebcamPreview: React.FC<WebcamPreviewProps> = ({ 
    isWebcamActive, 
    facingMode, 
    onFacingModeToggle, 
    onClose, 
    onSendFrame,
    onCameraStart,
    className,
    style
}) => {
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIndicatorRef = useRef<HTMLDivElement>(null);
    
    const faceMeshRef = useRef<any>(null);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        if (!isWebcamActive) {
            FaceLandmarkStore.update([]); 
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }
    
        let stream: MediaStream | null = null;
        let intervalId: any;
        let isMounted = true;
    
        const startCamera = async () => {
            setCameraError(null);
            try {
                if (!faceMeshRef.current && window.FaceMesh) {
                    const faceMesh = new window.FaceMesh({
                        locateFile: (file: string) => {
                            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                        }
                    });
                    faceMesh.setOptions({
                        maxNumFaces: 1,
                        refineLandmarks: true,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });
                    faceMesh.onResults((results: any) => {
                         if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                             let ratio = 1.0;
                             // Calculate aspect ratio (Height / Width) to correct normalized coordinates
                             if (results.image && results.image.width > 0 && results.image.height > 0) {
                                 ratio = results.image.height / results.image.width;
                             } else if (videoRef.current && videoRef.current.videoWidth > 0) {
                                 ratio = videoRef.current.videoHeight / videoRef.current.videoWidth;
                             }
                             // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                             FaceLandmarkStore.update(results.multiFaceLandmarks[0] as Landmark3D[], ratio);
                         }
                    });
                    faceMeshRef.current = faceMesh;
                }
    
                // Request ONLY video - requesting audio would stop the existing voice chat audio stream
                // The voice chat service (geminiLiveService) manages its own audio stream separately
                const newStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: facingMode, 
                        width: { ideal: 1280 }, 
                        height: { ideal: 720 } 
                    }
                    // DO NOT request audio - it will stop the voice chat audio stream
                });
                
                if (!isMounted) {
                    newStream.getTracks().forEach(t => t.stop());
                    return;
                }
    
                stream = newStream;
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Removed redundant play() call - handled by onLoadedData to avoid race conditions
                }
    
                if (onCameraStart) onCameraStart();
                
                const processFrame = async () => {
                     if (!isMounted) return;
                     
                     if (videoRef.current && 
                         videoRef.current.srcObject && // Ensure stream exists
                         videoRef.current.readyState >= 2 && 
                         !videoRef.current.paused &&
                         !videoRef.current.ended &&
                         videoRef.current.videoWidth > 0 && 
                         videoRef.current.videoHeight > 0 &&
                         videoRef.current.currentTime > 0 // Ensure playback has started
                     ) {
                         if (faceMeshRef.current) {
                             try {
                                await faceMeshRef.current.send({image: videoRef.current});
                             } catch (err: any) {
                                 // Suppress "ROI width and height must be > 0" as it's often transient
                                 if (!err?.message?.includes('ROI')) {
                                     console.warn("MediaPipe Send Error:", err);
                                 }
                             }
                         }
                     }
                     requestRef.current = requestAnimationFrame(() => { void processFrame() });
                };
                void processFrame();
    
                if (isMounted) {
                    intervalId = setInterval(() => {
                        if (videoRef.current && canvasRef.current && videoRef.current.srcObject) {
                            if (videoRef.current.readyState >= 2 && 
                                videoRef.current.videoWidth > 0 && 
                                videoRef.current.videoHeight > 0 && 
                                !videoRef.current.paused) { 
                                
                                const context = canvasRef.current.getContext('2d', { alpha: false }); // Optimize for no alpha
                                if (context) {
                                    canvasRef.current.width = videoRef.current.videoWidth;
                                    canvasRef.current.height = videoRef.current.videoHeight;
                                    
                                    if (facingMode === 'user') {
                                        context.translate(canvasRef.current.width, 0);
                                        context.scale(-1, 1);
                                    }
                                    
                                    context.drawImage(videoRef.current, 0, 0);
                                    
                                    if (facingMode === 'user') {
                                        context.setTransform(1, 0, 0, 1, 0, 0);
                                    }
                                    
                                    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
                                    const base64 = dataUrl.split(',')[1];
                                    
                                    // Send frame to parent - will be sent to Live API if connected
                                    if (base64) {
                                        // Log every 10th frame to avoid spam (every ~5 seconds at 500ms interval)
                                        if (!(window as any).webcamFrameCount) (window as any).webcamFrameCount = 0;
                                        (window as any).webcamFrameCount++;
                                        if ((window as any).webcamFrameCount % 10 === 0) {
                                            console.log('📹 [WebcamPreview] Sending frame to onSendFrame callback', {
                                                frameNumber: (window as any).webcamFrameCount,
                                                size: base64.length,
                                                hasCallback: typeof onSendFrame === 'function'
                                            });
                                        }
                                        onSendFrame(base64);
                                    }
    
                                    if (frameIndicatorRef.current) {
                                        frameIndicatorRef.current.animate([
                                            { opacity: 0.3, transform: 'scale(1)' },
                                            { opacity: 1, transform: 'scale(1.5)' },
                                            { opacity: 0.3, transform: 'scale(1)' }
                                        ], {
                                            duration: 400,
                                            easing: 'ease-out'
                                        });
                                    }
                                }
                            }
                        }
                    }, 500); 
                }
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Camera access denied:", err);
                setCameraError("Could not access camera. Please check permissions.");
            }
        };
    
        void startCamera();
    
        return () => {
            isMounted = false;
            if (stream) stream.getTracks().forEach(t => t.stop());
            if (intervalId) clearInterval(intervalId as NodeJS.Timeout);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [isWebcamActive, facingMode, onSendFrame]); 

    if (!isWebcamActive) return null;

    return (
        <div 
            className={`relative w-full h-full bg-black overflow-hidden shadow-2xl animate-fade-in-up group ring-1 ring-white/10 transform transition-all ${className}`}
            style={style}
        >
             {cameraError ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-6 text-center gap-3 animate-fade-in-up">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500/80"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                     <p className="text-sm font-medium text-black/70">{cameraError}</p>
                     <div className="flex gap-2 mt-2">
                         <button onClick={() => onFacingModeToggle()} className="px-4 py-1.5 bg-black text-white text-xs rounded-full hover:bg-black/80 transition-colors">Retry</button>
                         <button onClick={onClose} className="px-4 py-1.5 bg-gray-200 text-black text-xs rounded-full hover:bg-gray-300 transition-colors">Close</button>
                     </div>
                 </div>
             ) : (
                 <>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        onLoadedData={() => {
                            // Ensure video dimensions are available before processing
                            if (videoRef.current && videoRef.current.videoWidth > 0) {
                                void videoRef.current.play().catch(() => {});
                            }
                        }}
                        className={`w-full h-full object-cover transition-transform duration-500 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full z-10 border border-white/10 shadow-lg">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-mono text-white/90 tracking-widest uppercase">Live</span>
                    </div>

                    <div className="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none">
                        <div ref={frameIndicatorRef} className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] opacity-50" />
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                        <button onClick={onFacingModeToggle} className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-lg text-white rounded-full hover:bg-white/20 transition-all border border-white/20 shadow-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M2.5 16l.7.7a10 10 0 0 0 18.8-4.3"/></svg>
                        </button>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-red-500/90 backdrop-blur-lg text-white rounded-full hover:bg-red-600 transition-all border border-white/20 shadow-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                 </>
             )}
         </div>
    );
}

export default WebcamPreview;
