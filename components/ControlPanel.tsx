
import React from 'react';
import { LiveConnectionState } from 'types';

interface ControlPanelProps {
  connectionState: LiveConnectionState;
  audioLevel: number;
  onConnect: () => void;
  onDisconnect: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ connectionState, audioLevel, onConnect, onDisconnect }) => {
  const isConnected = connectionState === LiveConnectionState.CONNECTED;
  const isConnecting = connectionState === LiveConnectionState.CONNECTING;
  const isError = connectionState === LiveConnectionState.ERROR;

  const handleAction = () => {
      // Haptic feedback
      if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(10);
      }
      
      if (isConnected) {
          onDisconnect();
      } else {
          onConnect();
      }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-5">
      
      <div className="relative flex items-center justify-center group">
        {/* Reactive Audio Ring - Refined Opacity and Scale */}
        {isConnected && (
          <>
            <div 
              className="absolute inset-0 rounded-full border border-black/5 transition-all duration-75 will-change-transform"
              style={{ 
                transform: `scale(${1.1 + audioLevel * 1.2})`,
                opacity: 0.1 + audioLevel * 0.5,
                borderWidth: '1px'
              }}
            />
             <div 
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/5 to-transparent blur-2xl transition-all duration-75 will-change-transform"
              style={{ 
                transform: `scale(${1.4 + audioLevel * 1.5})`,
                opacity: audioLevel * 0.6
              }}
            />
          </>
        )}

        {/* Main Button Container */}
        <div className={`relative z-10 flex gap-4 items-center bg-white/40 backdrop-blur-xl p-1.5 rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.05)] transition-all duration-500 hover:scale-105 ${isConnected ? 'border-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'border-white/60'}`}>
          <button
            onClick={handleAction}
            disabled={isConnecting}
            className={`
              relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-700 ease-out
              ${isConnected 
                ? 'bg-white text-orange-600 border border-orange-100 shadow-sm' 
                : isError
                  ? 'bg-red-50 text-red-500 border border-red-100'
                  : 'bg-[#1a1a1a] text-white border border-transparent shadow-lg'
              }
              disabled:opacity-70 disabled:cursor-not-allowed
              group overflow-hidden
            `}
          >
            {/* Subtle sheen effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Active Pulse Ring */}
            {isConnected && (
                 <span className="absolute inset-0 rounded-full border border-orange-500/30 animate-ping opacity-75"></span>
            )}

            {isConnecting ? (
              <div className="w-full h-full flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              </div>
            ) : isConnected ? (
               <div className="flex gap-1 h-3 items-center justify-center">
                    <div className="w-0.5 h-3 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                    <div className="w-0.5 h-5 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                    <div className="w-0.5 h-3 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
               </div>
            ) : (
               /* Minimal Microphone Icon - Updated */
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            )}
          </button>
        </div>
      </div>

      {/* Status Text */}
      <div className="flex flex-col items-center gap-1.5">
        <div className={`text-[10px] font-mono tracking-[0.3em] uppercase font-medium transition-all duration-500 ${isConnected ? 'text-orange-700/60' : 'text-black/30'}`}>
            {isConnecting ? 'Establishing Uplink...' : isConnected ? 'Live Connection' : isError ? 'Connection Failed' : 'Initialize'}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
