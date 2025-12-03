
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-up"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-sm p-4 sm:p-5 rounded-2xl shadow-2xl animate-fade-in-up ring-1 ring-white/10 my-auto ${isDarkMode ? 'bg-[#0a0a0a] text-white border border-white/10' : 'bg-white text-slate-900 border border-white/60'}`}>
        
        {/* Header */}
        <div className="flex flex-col gap-1.5 mb-4 text-center">
            <div className={`w-9 h-9 mx-auto flex items-center justify-center rounded-lg font-bold font-mono text-xs shadow-md mb-1 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                FB
            </div>
            <h2 className="text-lg font-bold tracking-tight">Concierge Access</h2>
            <p className={`text-[11px] leading-snug ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Share a few details so F.B/c can tailor the session to you and prepare the right sources.
            </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e); }} className="flex flex-col gap-2.5">
            <div className="space-y-2.5">
                <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-wider opacity-70 ml-1">Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        className={`w-full px-3 py-2 text-sm rounded-lg outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-orange-500/50 focus:bg-white/10' : 'bg-gray-50 border-gray-200 focus:border-orange-500/50 focus:bg-white'}`}
                        autoFocus
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-wider opacity-70 ml-1">Work Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className={`w-full px-3 py-2 text-sm rounded-lg outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-orange-500/50 focus:bg-white/10' : 'bg-gray-50 border-gray-200 focus:border-orange-500/50 focus:bg-white'}`}
                    />
                </div>

                {/* Progressive Disclosure: Company Input */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showCompanyInput ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase tracking-wider opacity-70 ml-1 text-orange-500">Company or LinkedIn URL</label>
                        <input
                            type="text"
                            value={companyUrl}
                            onChange={(e) => setCompanyUrl(e.target.value)}
                            placeholder="e.g. tesla.com or linkedin.com/in/sarah"
                            className={`w-full px-3 py-2 text-sm rounded-lg outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-orange-500/30 focus:border-orange-500 focus:bg-white/10' : 'bg-orange-50/30 border-orange-200 focus:border-orange-500 focus:bg-white'}`}
                        />
                    </div>
                </div>

                {/* Permission Toggles */}
                <div className="space-y-1.5 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="text-[9px] font-mono uppercase tracking-wider opacity-70 ml-1 mb-1.5">Session Permissions</div>
                    
                    {/* Voice Toggle */}
                    <div className="flex items-center justify-between p-1.5 rounded-md bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-medium">Voice</div>
                                <div className="text-[9px] opacity-70 truncate">Real-time audio</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                            <input
                                type="checkbox"
                                checked={permissions.voice}
                                onChange={(e) => setPermissions(prev => ({ ...prev, voice: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                    </div>

                    {/* Webcam Toggle */}
                    <div className="flex items-center justify-between p-1.5 rounded-md bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-medium">Webcam</div>
                                <div className="text-[9px] opacity-70 truncate">Video sharing</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                            <input
                                type="checkbox"
                                checked={permissions.webcam}
                                onChange={(e) => setPermissions(prev => ({ ...prev, webcam: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                    </div>

                    {/* Location Toggle */}
                    <div className="flex items-center justify-between p-1.5 rounded-md bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-medium">Location</div>
                                <div className="text-[9px] opacity-70 truncate">Geographic context</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                            <input
                                type="checkbox"
                                checked={permissions.location}
                                onChange={(e) => setPermissions(prev => ({ ...prev, location: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <div className="relative flex items-center mt-0.5">
                    <input
                        type="checkbox"
                        id="terms"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="peer h-3.5 w-3.5 cursor-pointer appearance-none rounded border border-orange-500/30 bg-orange-500/10 transition-all checked:border-orange-500 checked:bg-orange-500 hover:border-orange-500/50"
                    />
                    <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                        <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <label htmlFor="terms" className={`text-[10px] leading-relaxed cursor-pointer select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    I agree to the <span className="underline decoration-dotted underline-offset-2">Terms & Conditions</span> and <span className="underline decoration-dotted underline-offset-2">Privacy Policy</span>. 
                    <span className="block mt-0.5 text-[9px] opacity-70 leading-snug">
                        Your data will be processed according to GDPR regulations. Voice transcripts and visual captures are automatically deleted after 7 days.
                    </span>
                </label>
            </div>

            <button
                type="submit"
                disabled={!agreed || !name || !email || isSubmitting}
                title={!agreed || !name || !email ? "Please fill all fields and agree to terms" : "Start Session"}
                className={`
                    w-full py-2 rounded-lg font-bold tracking-wide transition-all shadow-lg text-xs
                    flex items-center justify-center gap-1.5
                    ${!agreed || !name || !email || isSubmitting
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-white/5 dark:text-gray-600'
                        : isDarkMode 
                            ? 'bg-white text-black hover:bg-gray-200' 
                            : 'bg-black text-white hover:bg-gray-800'
                    }
                `}
            >
                {isSubmitting ? (
                    <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                        <span>INITIALIZING...</span>
                    </>
                ) : (
                    <>
                        <span>INITIALIZE SESSION</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};

export default TermsOverlay;
