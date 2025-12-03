
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
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.voice}
                                onChange={(e) => setPermissions(prev => ({ ...prev, voice: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full transition-all peer-checked:bg-white peer-focus:outline-none ${
                                isDarkMode 
                                    ? 'bg-white/10 peer-checked:bg-white' 
                                    : 'bg-slate-200 peer-checked:bg-slate-900'
                            }`}>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all peer-checked:translate-x-4 shadow-sm`}></div>
                            </div>
                        </div>
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
                                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Video sharing</div>
                            </div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.webcam}
                                onChange={(e) => setPermissions(prev => ({ ...prev, webcam: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full transition-all peer-checked:bg-white peer-focus:outline-none ${
                                isDarkMode 
                                    ? 'bg-white/10 peer-checked:bg-white' 
                                    : 'bg-slate-200 peer-checked:bg-slate-900'
                            }`}>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all peer-checked:translate-x-4 shadow-sm`}></div>
                            </div>
                        </div>
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
                                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Geographic context</div>
                            </div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.location}
                                onChange={(e) => setPermissions(prev => ({ ...prev, location: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full transition-all peer-checked:bg-white peer-focus:outline-none ${
                                isDarkMode 
                                    ? 'bg-white/10 peer-checked:bg-white' 
                                    : 'bg-slate-200 peer-checked:bg-slate-900'
                            }`}>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all peer-checked:translate-x-4 shadow-sm`}></div>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Terms Checkbox - Minimal */}
            <div className={`flex items-start gap-3 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/40'}`}>
                <div className="relative flex items-center mt-0.5 flex-shrink-0">
                    <input
                        type="checkbox"
                        id="terms"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className={`peer h-4 w-4 cursor-pointer appearance-none rounded border transition-all ${
                            isDarkMode
                                ? 'border-white/20 bg-white/5 checked:border-white checked:bg-white'
                                : 'border-slate-300 bg-white checked:border-slate-900 checked:bg-slate-900'
                        }`}
                    />
                    <svg className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 opacity-0 peer-checked:opacity-100 transition-opacity ${
                        isDarkMode ? 'text-slate-900' : 'text-white'
                    }`} viewBox="0 0 14 14" fill="none">
                        <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <label htmlFor="terms" className={`text-xs leading-relaxed cursor-pointer select-none flex-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    I agree to the <span className="underline decoration-dotted underline-offset-2 hover:opacity-70 transition-opacity">Terms & Conditions</span> and <span className="underline decoration-dotted underline-offset-2 hover:opacity-70 transition-opacity">Privacy Policy</span>.
                    <span className={`block mt-1.5 text-[10px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Your data will be processed according to GDPR regulations. Voice transcripts and visual captures are automatically deleted after 7 days.
                    </span>
                </label>
            </div>

            {/* Submit Button - Minimal */}
            <button
                type="submit"
                disabled={!agreed || !name || !email || isSubmitting}
                title={!agreed || !name || !email ? "Please fill all fields and agree to terms" : "Start Session"}
                className={`
                    w-full py-3 rounded-lg font-medium tracking-wide transition-all text-xs
                    flex items-center justify-center gap-2 mt-2
                    ${!agreed || !name || !email || isSubmitting
                        ? isDarkMode
                            ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/10'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : isDarkMode 
                            ? 'bg-white text-slate-900 hover:bg-slate-100 border border-white/20 shadow-lg hover:shadow-xl hover:-translate-y-0.5' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                    }
                `}
            >
                {isSubmitting ? (
                    <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                        <span>INITIALIZING...</span>
                    </>
                ) : (
                    <>
                        <span>INITIALIZE SESSION</span>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};

export default TermsOverlay;
