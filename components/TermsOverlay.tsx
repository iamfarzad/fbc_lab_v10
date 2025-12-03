
import React, { useState, useEffect } from 'react';
import { logger } from 'src/lib/logger-client'


interface TermsOverlayProps {
  onComplete: (name: string, email: string, companyUrl?: string, permissions?: {
    voice: boolean;
    webcam: boolean;
    location: boolean;
  }) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

const TermsOverlay: React.FC<TermsOverlayProps> = ({ onComplete, onCancel, isDarkMode }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [showCompanyInput, setShowCompanyInput] = useState(false);
  
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permission states
  const [permissions, setPermissions] = useState({
    voice: true,
    webcam: false,
    location: false
  });

  // Generic email providers to trigger progressive disclosure
  const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'];

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Effect to check for generic email domain
  useEffect(() => {
      if (isValidEmail(email)) {
          const parts = email.split('@');
          if (parts.length < 2) return;
          const domain = parts[1]?.toLowerCase();
          if (!domain) return;
          if (GENERIC_DOMAINS.includes(domain)) {
              setShowCompanyInput(true);
          } else {
              setShowCompanyInput(false);
          }
      }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug('[TermsOverlay] Submit attempt:', { agreed, name, email, isValid: isValidEmail(email) });
    
    if (!agreed || !name || !isValidEmail(email)) {
        console.warn('[TermsOverlay] Validation failed');
        return;
    }

    setIsSubmitting(true);
    
    // Simulate brief initialization delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));
    
    logger.debug('[TermsOverlay] Completing with:', { name, email, companyUrl, permissions });
    onComplete(name, email, companyUrl, permissions);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md animate-fade-in-up"
        style={{ backgroundColor: isDarkMode ? 'rgba(5, 5, 5, 0.7)' : 'rgba(248, 249, 250, 0.7)' }}
        onClick={onCancel}
      />

      {/* Modal Card - Glass Morphism */}
      <div className={`relative w-full max-w-md p-6 sm:p-8 rounded-xl backdrop-blur-xl animate-fade-in-up border my-auto transition-all duration-300 ${
        isDarkMode 
          ? 'bg-slate-900/60 border-white/10 text-white shadow-2xl' 
          : 'bg-white/40 border-white/40 text-slate-900 shadow-xl'
      }`}>
        
        {/* Header - Minimal */}
        <div className="flex flex-col gap-3 mb-6 text-center">
            <div className={`w-10 h-10 mx-auto flex items-center justify-center rounded-lg font-bold font-mono text-xs ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                FB
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Concierge Access</h2>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Share a few details so F.B/c can tailor the session to you.
            </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e); }} className="flex flex-col gap-4">
            <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                    <label className={`text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        className={`w-full px-4 py-2.5 text-sm rounded-lg outline-none border transition-all backdrop-blur-sm ${
                            isDarkMode 
                                ? 'bg-white/5 border-white/10 placeholder:text-slate-500 focus:border-white/30 focus:bg-white/10' 
                                : 'bg-white/60 border-white/40 placeholder:text-slate-400 focus:border-slate-900/30 focus:bg-white'
                        }`}
                        autoFocus
                    />
                </div>
                
                {/* Work Email */}
                <div className="space-y-1.5">
                    <label className={`text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Work Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className={`w-full px-4 py-2.5 text-sm rounded-lg outline-none border transition-all backdrop-blur-sm ${
                            isDarkMode 
                                ? 'bg-white/5 border-white/10 placeholder:text-slate-500 focus:border-white/30 focus:bg-white/10' 
                                : 'bg-white/60 border-white/40 placeholder:text-slate-400 focus:border-slate-900/30 focus:bg-white'
                        }`}
                    />
                </div>

                {/* Progressive Disclosure: Company Input */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showCompanyInput ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-1.5 pt-1">
                        <label className={`text-[10px] font-mono uppercase tracking-wider ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                            Company or LinkedIn URL
                        </label>
                        <input
                            type="text"
                            value={companyUrl}
                            onChange={(e) => setCompanyUrl(e.target.value)}
                            placeholder="e.g. tesla.com or linkedin.com/in/sarah"
                            className={`w-full px-4 py-2.5 text-sm rounded-lg outline-none border transition-all backdrop-blur-sm ${
                                isDarkMode 
                                    ? 'bg-orange-500/5 border-orange-500/20 placeholder:text-slate-500 focus:border-orange-500/40 focus:bg-orange-500/10' 
                                    : 'bg-orange-50/40 border-orange-200/40 placeholder:text-slate-400 focus:border-orange-500/50 focus:bg-white'
                            }`}
                        />
                    </div>
                </div>

                {/* Permission Toggles - Minimal */}
                <div className={`space-y-2 pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/40'}`}>
                    <div className={`text-[10px] font-mono uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Session Permissions
                    </div>
                    
                    {/* Voice Toggle */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/5">
                        <div className="flex items-center gap-3">
                            <svg className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                <line x1="12" y1="19" x2="12" y2="23"/>
                                <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                            <div>
                                <div className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Voice</div>
                                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Real-time audio</div>
                            </div>
                        </div>
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${permissions.voice ? (isDarkMode ? 'bg-orange-500' : 'bg-orange-500') : (isDarkMode ? 'bg-white/10' : 'bg-slate-300')}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${permissions.voice ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <input
                            type="checkbox"
                            checked={permissions.voice}
                            onChange={(e) => setPermissions(prev => ({ ...prev, voice: e.target.checked }))}
                            className="sr-only"
                        />
                    </label>

                    {/* Webcam Toggle */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/5">
                        <div className="flex items-center gap-3">
                            <svg className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                <circle cx="12" cy="13" r="4"/>
                            </svg>
                            <div>
                                <div className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Webcam</div>
                                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Visual context</div>
                            </div>
                        </div>
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${permissions.webcam ? (isDarkMode ? 'bg-orange-500' : 'bg-orange-500') : (isDarkMode ? 'bg-white/10' : 'bg-slate-300')}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${permissions.webcam ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <input
                            type="checkbox"
                            checked={permissions.webcam}
                            onChange={(e) => setPermissions(prev => ({ ...prev, webcam: e.target.checked }))}
                            className="sr-only"
                        />
                    </label>

                    {/* Location Toggle */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/5">
                        <div className="flex items-center gap-3">
                            <svg className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <div>
                                <div className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Location</div>
                                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Geographic data</div>
                            </div>
                        </div>
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${permissions.location ? (isDarkMode ? 'bg-orange-500' : 'bg-orange-500') : (isDarkMode ? 'bg-white/10' : 'bg-slate-300')}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${permissions.location ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <input
                            type="checkbox"
                            checked={permissions.location}
                            onChange={(e) => setPermissions(prev => ({ ...prev, location: e.target.checked }))}
                            className="sr-only"
                        />
                    </label>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-2.5 pt-2">
                    <input
                        type="checkbox"
                        id="terms-agree"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className={`mt-0.5 w-4 h-4 rounded border-2 cursor-pointer transition-all ${
                            isDarkMode 
                                ? 'border-white/20 bg-white/5 checked:bg-orange-500 checked:border-orange-500' 
                                : 'border-slate-300 bg-white checked:bg-orange-500 checked:border-orange-500'
                        }`}
                    />
                    <label htmlFor="terms-agree" className={`text-[10px] leading-relaxed cursor-pointer flex-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        I agree to the <a href="/terms" target="_blank" className={`underline hover:opacity-80 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Terms of Service</a> and <a href="/privacy" target="_blank" className={`underline hover:opacity-80 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Privacy Policy</a>
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={!agreed || !name || !isValidEmail(email) || isSubmitting}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                        !agreed || !name || !isValidEmail(email) || isSubmitting
                            ? (isDarkMode ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                            : (isDarkMode 
                                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20' 
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg')
                    }`}
                >
                    {isSubmitting ? 'Starting Session...' : 'Start Session'}
                </button>
            </div>
        </form>
    </div>
  );
};

export default TermsOverlay;
