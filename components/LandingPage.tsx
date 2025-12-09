
import React, { useEffect, useRef, useState } from 'react';
import { VisualShape } from 'types';
import { CONTACT_CONFIG } from 'src/config/constants';
import AntigravityCanvas from './AntigravityCanvas';
import { ServiceIcon } from './ServiceIcon';
import { useTheme } from '../context/ThemeContext';

interface LandingPageProps {
    onStartChat: (startVoice?: boolean) => void;
    onSectionChange?: (shape: VisualShape) => void;
    onAdminAccess?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartChat, onSectionChange, onAdminAccess }) => {
    const { isDarkMode, toggleTheme } = useTheme();
    const heroRef = useRef<HTMLDivElement>(null);
    const showcaseRef = useRef<HTMLElement>(null);
    const servicesRef = useRef<HTMLElement>(null);
    const workshopsRef = useRef<HTMLElement>(null);
    const aboutRef = useRef<HTMLElement>(null);
    const contactRef = useRef<HTMLElement>(null);

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Form State
    const [formState, setFormState] = useState({
        name: '',
        company: '',
        email: '',
        interest: ''
    });

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState({ ...formState, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Thank you for your request. I will be in touch shortly.");
    };

    useEffect(() => {
        if (!onSectionChange) return;

        const options = {
            root: null,
            threshold: 0.25, // Trigger when 25% of the section is visible
        };

        const callback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (entry.target === heroRef.current) onSectionChange('orb');
                    if (entry.target === showcaseRef.current) onSectionChange('constellation');
                    if (entry.target === servicesRef.current) onSectionChange('grid');
                    if (entry.target === workshopsRef.current) onSectionChange('brain');
                    if (entry.target === aboutRef.current) onSectionChange('dna');
                    if (entry.target === contactRef.current) onSectionChange('hourglass');
                }
            });
        };

        const observer = new IntersectionObserver(callback, options);

        if (heroRef.current) observer.observe(heroRef.current);
        if (showcaseRef.current) observer.observe(showcaseRef.current);
        if (servicesRef.current) observer.observe(servicesRef.current);
        if (workshopsRef.current) observer.observe(workshopsRef.current);
        if (aboutRef.current) observer.observe(aboutRef.current);
        if (contactRef.current) observer.observe(contactRef.current);

        return () => observer.disconnect();
    }, [onSectionChange]);

    const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
        setIsMobileMenuOpen(false);
    };

    const [hoveredCard, setHoveredCard] = useState<VisualShape | null>(null);

    // Helper for interactive cards
    const handleCardHover = (shape: VisualShape) => {
        setHoveredCard(shape);
        if (onSectionChange) onSectionChange(shape);
    };

    const handleCardLeave = () => {
        setHoveredCard(null);
        if (onSectionChange) onSectionChange('constellation');
    };

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isMobileMenuOpen]);

    return (
        <div className={`relative z-30 w-full h-[100dvh] overflow-y-auto custom-scrollbar scroll-smooth selection:bg-orange-100 transition-colors duration-500 ${isDarkMode ? 'dark bg-slate-900/40 text-white' : 'bg-transparent text-slate-900'}`}>

            {/* HEADER */}
            <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-50 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 animate-fade-in-up">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold font-mono text-sm shadow-lg ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>FB</div>
                    <span className={`font-semibold tracking-tight backdrop-blur-md px-3 py-1.5 rounded-lg border shadow-sm text-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/40 border-white/40 text-slate-900'}`}>F.B/c Consulting</span>
                </div>

                {/* Desktop Navigation */}
                <div className="pointer-events-auto hidden md:flex items-center gap-2 animate-fade-in-up">
                    <nav className={`flex items-center gap-1 backdrop-blur-md p-1 rounded-full border shadow-sm mr-2 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/40 border-white/40'}`}>
                        <button onClick={() => scrollToSection(servicesRef)} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}>Services</button>
                        <button onClick={() => scrollToSection(workshopsRef)} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}>Workshops</button>
                        <button onClick={() => scrollToSection(aboutRef)} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}>About</button>
                        <button onClick={() => scrollToSection(contactRef)} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}>Contact</button>
                    </nav>
                    <button onClick={toggleTheme} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all hover:-translate-y-0.5 shadow-md ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/40 text-slate-800 hover:bg-white/60'}`} title={isDarkMode ? "Light Mode" : "Dark Mode"}>
                        {isDarkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        )}
                    </button>
                    <button onClick={() => onStartChat()} className={`text-xs font-medium px-5 py-2.5 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${isDarkMode ? 'bg-white text-slate-900 hover:bg-gray-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Start Live Chat</button>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="pointer-events-auto md:hidden flex items-center gap-2 animate-fade-in-up">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg border shadow-sm backdrop-blur-md transition-colors ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/40 border-white/40 text-slate-900'}`}
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        )}
                    </button>
                </div>
            </header>

            {/* MOBILE MENU OVERLAY */}
            {isMobileMenuOpen && (
                <div className={`fixed inset-0 z-40 pt-24 px-6 flex flex-col pointer-events-auto md:hidden ${isDarkMode ? 'bg-slate-900/95 text-white' : 'bg-white/95 text-slate-900'} backdrop-blur-xl animate-fade-in-up`}>
                    <nav className="flex flex-col gap-4 text-xl font-medium">
                        <button onClick={() => scrollToSection(servicesRef)} className={`text-left py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>Services</button>
                        <button onClick={() => scrollToSection(workshopsRef)} className={`text-left py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>Workshops</button>
                        <button onClick={() => scrollToSection(aboutRef)} className={`text-left py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>About</button>
                        <button onClick={() => scrollToSection(contactRef)} className={`text-left py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>Contact</button>
                    </nav>

                    <div className="mt-auto pb-8 flex flex-col gap-6">
                        <div className={`flex items-center justify-between py-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <span className="text-sm font-mono uppercase tracking-wider opacity-60">Appearance</span>
                            <button
                                onClick={toggleTheme}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
                            >
                                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                                {isDarkMode ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                                )}
                            </button>
                        </div>
                        <button
                            onClick={() => { onStartChat(); setIsMobileMenuOpen(false); }}
                            className={`w-full py-4 rounded-xl font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
                        >
                            <span>START LIVE CHAT</span>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* HERO SECTION */}
            <section ref={heroRef} className="min-h-[100dvh] flex flex-col items-center justify-center p-6 md:p-12 relative">
                <div className="w-full max-w-5xl flex flex-col gap-12 animate-fade-in-up mt-16 md:mt-0">
                    {/* Hero Content */}
                    <div className="flex flex-col gap-6 text-center items-center">
                        <h2 className={`text-[10px] md:text-xs font-mono tracking-[0.3em] uppercase px-4 py-1.5 rounded-full backdrop-blur-sm shadow-sm border ${isDarkMode ? 'text-orange-400 border-orange-400/20 bg-orange-950/30' : 'text-orange-700/80 border-orange-700/20 bg-white/40'}`}>
                            AI Consultant & Workshop Facilitator
                        </h2>

                        <h1 className={`text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[0.95] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            F.B/c <br />
                            <span className={`text-transparent bg-clip-text ${isDarkMode ? 'bg-gradient-to-b from-slate-200 to-slate-500' : 'bg-gradient-to-b from-slate-800 to-slate-500'}`}>
                                Consulting
                            </span>
                        </h1>

                        <p className={`max-w-2xl text-lg md:text-xl font-light leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Helping organizations navigate the AI landscape through strategic consulting, hands-on workshops, and practical implementation guidance.
                        </p>
                    </div>

                    {/* Capabilities Tagline */}
                    <div className="flex justify-center">
                        <div className={`inline-flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] md:text-xs font-mono uppercase tracking-wider text-center px-6 py-3 border rounded-2xl backdrop-blur-sm shadow-sm ${isDarkMode ? 'text-slate-300 bg-white/5 border-white/10' : 'text-slate-400 bg-white/30 border-white/40'}`}>
                            <span>Multimodal AI Consultant</span>
                            <span className="opacity-50">•</span>
                            <span>Chat</span>
                            <span className="opacity-50">•</span>
                            <span>Voice</span>
                            <span className="opacity-50">•</span>
                            <span>Webcam</span>
                            <span className="opacity-50">•</span>
                            <span>Screen Share</span>
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-2">
                        <button
                            onClick={() => onStartChat()}
                            className={`group relative px-8 py-4 rounded-full font-medium text-sm tracking-wide hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl w-full md:w-auto min-w-[200px] flex items-center justify-center gap-2 overflow-hidden ${isDarkMode ? 'bg-white text-slate-900' : 'bg-[#1a1a1a] text-white'}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <span className="relative">START LIVE CHAT</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform relative" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>

                        <button
                            onClick={() => window.open(CONTACT_CONFIG.SCHEDULING.BOOKING_URL, '_blank')}
                            className={`px-8 py-4 backdrop-blur-md border rounded-full font-medium text-sm tracking-wide transition-all duration-300 w-full md:w-auto min-w-[200px] text-center cursor-pointer shadow-sm hover:shadow-md ${isDarkMode ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-white/40 text-slate-900 border-white/60 hover:bg-white/60'}`}
                        >
                            BOOK A CONSULTATION
                        </button>
                    </div>

                    {/* Divider */}
                    <div className={`w-full h-px my-4 ${isDarkMode ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-300/50 to-transparent'}`}></div>

                    {/* Stats / Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
                        <div className={`flex flex-col gap-2 p-4 rounded-2xl transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white/20'}`}>
                            <span className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-orange-400' : 'text-slate-400 group-hover:text-orange-600'}`}>Expertise</span>
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>AI Strategy / Implementation</span>
                        </div>
                        <div className={`flex flex-col gap-2 p-4 rounded-2xl transition-colors md:border-l md:pl-8 group ${isDarkMode ? 'hover:bg-white/5 md:border-white/10' : 'hover:bg-white/20 md:border-slate-200/50'}`}>
                            <span className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-orange-400' : 'text-slate-400 group-hover:text-orange-600'}`}>Delivery</span>
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Remote / On-Site</span>
                        </div>
                        <div className={`flex flex-col gap-2 p-4 rounded-2xl transition-colors md:border-l md:pl-8 group ${isDarkMode ? 'hover:bg-white/5 md:border-white/10' : 'hover:bg-white/20 md:border-slate-200/50'}`}>
                            <span className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-orange-400' : 'text-slate-400 group-hover:text-orange-600'}`}>Experience</span>
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>5+ Years in AI</span>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity animate-bounce cursor-pointer" onClick={() => scrollToSection(showcaseRef)}>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Scroll</span>
                    <svg className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
                </div>
            </section>

            {/* AI SHOWCASE SECTION */}
            <section ref={showcaseRef} className="w-full py-24 min-h-[80vh] flex items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none"></div>

                <div className="max-w-7xl mx-auto w-full px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">

                    {/* Left Content */}
                    <div className="flex flex-col gap-8 order-2 md:order-1">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                <span className={`text-[10px] font-mono tracking-[0.3em] uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Proprietary Technology</span>
                            </div>
                            <h2 className={`text-4xl md:text-6xl font-bold tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                MEET THE <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-500">F.B/c AGENT</span>
                            </h2>
                            <p className={`text-lg font-light leading-relaxed max-w-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                Experience F.B/c&apos;s custom-built autonomous research agent. Capable of deep &quot;System 2&quot; reasoning, real-time multimodal interaction, and live web research.
                            </p>
                            <p className={`text-xs font-medium italic ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                * Hover over the cards below to visualize capabilities
                            </p>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                className={`p-4 rounded-2xl backdrop-blur-md border shadow-sm transition-all cursor-pointer group hover:scale-[1.02] ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/40 border-white/40 hover:bg-white/60'}`}
                                onMouseEnter={() => handleCardHover('brain')}
                                onMouseLeave={handleCardLeave}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
                                </div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-white group-hover:text-orange-400' : 'text-slate-900 group-hover:text-orange-700'}`}>Deep Reasoning</h4>
                                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Complex problem solving & planning.</p>
                            </div>
                            <div
                                className={`p-4 rounded-2xl backdrop-blur-md border shadow-sm transition-all cursor-pointer group hover:scale-[1.02] ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/40 border-white/40 hover:bg-white/60'}`}
                                onMouseEnter={() => handleCardHover('face')}
                                onMouseLeave={handleCardLeave}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                </div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-white group-hover:text-orange-400' : 'text-slate-900 group-hover:text-orange-700'}`}>Multimodal Vision</h4>
                                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>See & analyze video in real-time.</p>
                            </div>
                            <div
                                className={`p-4 rounded-2xl backdrop-blur-md border shadow-sm transition-all cursor-pointer group hover:scale-[1.02] ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/40 border-white/40 hover:bg-white/60'}`}
                                onMouseEnter={() => handleCardHover('globe')}
                                onMouseLeave={handleCardLeave}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                </div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-white group-hover:text-orange-400' : 'text-slate-900 group-hover:text-orange-700'}`}>Live Research</h4>
                                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Autonomous web grounding.</p>
                            </div>
                            <div
                                className={`p-4 rounded-2xl backdrop-blur-md border shadow-sm transition-all cursor-pointer group hover:scale-[1.02] ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/40 border-white/40 hover:bg-white/60'}`}
                                onMouseEnter={() => handleCardHover('wave')}
                                onMouseLeave={handleCardLeave}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                </div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-white group-hover:text-orange-400' : 'text-slate-900 group-hover:text-orange-700'}`}>Voice Interaction</h4>
                                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Sub-100ms latency voice chat.</p>
                            </div>
                        </div>

                        <button onClick={() => onStartChat(true)} className={`mt-4 w-fit px-8 py-4 rounded-full font-medium text-sm transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 ${isDarkMode ? 'bg-white text-slate-900 hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                            <span>INTERACT WITH THE AGENT</span>
                            <svg className="w-4 h-4 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                        </button>
                    </div>

                    {/* Right Visual Area */}
                    <div className="hidden md:flex flex-col items-center justify-center h-full min-h-[400px] order-1 md:order-2">
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
                            {/* Particle Backgrounds - One for each card */}
                            {hoveredCard === 'brain' && (
                                <div className="absolute inset-0">
                                    <AntigravityCanvas
                                        visualState={{ shape: 'brain', mode: 'idle', isActive: true, audioLevel: 0.3 }}
                                    />
                                </div>
                            )}
                            {hoveredCard === 'face' && (
                                <div className="absolute inset-0">
                                    <AntigravityCanvas
                                        visualState={{ shape: 'face', mode: 'idle', isActive: true, audioLevel: 0.3 }}
                                    />
                                </div>
                            )}
                            {hoveredCard === 'globe' && (
                                <div className="absolute inset-0">
                                    <AntigravityCanvas
                                        visualState={{ shape: 'globe', mode: 'idle', isActive: true, audioLevel: 0.3 }}
                                    />
                                </div>
                            )}
                            {hoveredCard === 'wave' && (
                                <div className="absolute inset-0">
                                    <AntigravityCanvas
                                        visualState={{ shape: 'wave', mode: 'idle', isActive: true, audioLevel: 0.3 }}
                                    />
                                </div>
                            )}

                            {/* UI Overlay */}
                            <div className="relative z-10 w-full h-full flex items-center justify-center">
                                <div className={`absolute top-1/4 right-0 px-4 py-2 backdrop-blur-md rounded-lg border shadow-sm text-[10px] font-mono animate-float ${isDarkMode ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-white/60 border-white/40 text-slate-500'}`} style={{ animationDelay: '0s' }}>
                                    Network: Active
                                </div>
                                <div className={`absolute bottom-1/3 left-10 px-4 py-2 backdrop-blur-md rounded-lg border shadow-sm text-[10px] font-mono animate-float ${isDarkMode ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-white/60 border-white/40 text-slate-500'}`} style={{ animationDelay: '1.5s' }}>
                                    Latency: 42ms
                                </div>
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-dashed rounded-full opacity-20 animate-spin-slow pointer-events-none ${isDarkMode ? 'border-white' : 'border-slate-300'}`}></div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* SERVICES SECTION */}
            <section ref={servicesRef} id="services" className={`w-full py-24 px-6 md:px-12 backdrop-blur-md border-t ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/40 border-white/20'}`}>
                <div className="max-w-6xl mx-auto flex flex-col gap-16">

                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="flex flex-col gap-4 max-w-2xl">
                            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>SERVICES</h2>
                            <p className={`text-lg leading-relaxed font-light ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                Comprehensive AI consulting services designed to help your organization thrive in the age of artificial intelligence.
                            </p>
                        </div>
                        <button
                            onClick={() => scrollToSection(contactRef)}
                            className={`px-6 py-3 border rounded-full text-sm font-medium transition-all shadow-sm ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                            DISCUSS YOUR PROJECT
                        </button>
                    </div>

                    {/* Service Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Service 1 */}
                        <div className={`flex flex-col gap-6 p-8 border rounded-[32px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] transition-all duration-500 group hover:-translate-y-2 ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/60 border-white/60 hover:border-white/80'}`}>
                            <div className={`relative w-12 h-12 rounded-2xl mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm overflow-hidden ${isDarkMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-100'}`}>
                                <ServiceIcon iconType="book" color="orange" />
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-lg font-bold mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI STRATEGY DEVELOPMENT</h3>
                                <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Comprehensive AI roadmap development aligned with your business objectives and organizational capabilities.
                                </p>
                                <ul className="space-y-3">
                                    {['AI maturity assessment', 'Opportunity identification', 'Implementation roadmap', 'ROI analysis'].map((item, i) => (
                                        <li key={i} className={`flex items-start gap-3 text-[11px] font-mono uppercase tracking-wide group-hover:text-orange-500 transition-colors ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-400 shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Service 2 */}
                        <div className={`flex flex-col gap-6 p-8 border rounded-[32px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] transition-all duration-500 group hover:-translate-y-2 ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/60 border-white/60 hover:border-white/80'}`}>
                            <div className={`relative w-12 h-12 rounded-2xl mb-2 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-sm overflow-hidden ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                                <ServiceIcon iconType="people" color="blue" />
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-lg font-bold mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>TEAM TRAINING & WORKSHOPS</h3>
                                <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Hands-on workshops designed to upskill your team and build internal AI capabilities.
                                </p>
                                <ul className="space-y-3">
                                    {['AI fundamentals training', 'Tool-specific workshops', 'Best practices guidance', 'Custom curriculum development'].map((item, i) => (
                                        <li key={i} className={`flex items-start gap-3 text-[11px] font-mono uppercase tracking-wide group-hover:text-blue-500 transition-colors ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Service 3 */}
                        <div className={`flex flex-col gap-6 p-8 border rounded-[32px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] transition-all duration-500 group hover:-translate-y-2 ${isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/60 border-white/60 hover:border-white/80'}`}>
                            <div className={`relative w-12 h-12 rounded-2xl mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm overflow-hidden ${isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-100'}`}>
                                <ServiceIcon iconType="code" color="purple" />
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-lg font-bold mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>IMPLEMENTATION SUPPORT</h3>
                                <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    End-to-end guidance from concept to deployment, ensuring successful AI integration into your workflows.
                                </p>
                                <ul className="space-y-3">
                                    {['Technical architecture design', 'Integration support', 'Performance optimization', 'Change management'].map((item, i) => (
                                        <li key={i} className={`flex items-start gap-3 text-[11px] font-mono uppercase tracking-wide group-hover:text-purple-500 transition-colors ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-purple-400 shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* WORKSHOPS SECTION */}
            <section ref={workshopsRef} id="workshops" className={`w-full py-24 px-6 md:px-12 backdrop-blur-md border-t ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/30 border-white/20'}`}>
                <div className="max-w-6xl mx-auto flex flex-col gap-12">

                    {/* Header */}
                    <div className="flex flex-col gap-4 text-center md:text-left">
                        <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>WORKSHOPS</h2>
                        <p className={`text-lg font-light max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Interactive, hands-on workshops designed to equip your team with practical AI skills and knowledge for immediate application.
                        </p>
                    </div>

                    {/* Workshop Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Workshop 1 */}
                        <div className={`flex flex-col p-8 border rounded-[28px] transition-colors ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/50 border-white/50 hover:bg-white/70'}`}>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-slate-900/5 text-slate-600 border-slate-900/5'}`}>Half Day</span>
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>Executives & Managers</span>
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI FUNDAMENTALS FOR LEADERS</h3>
                            <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Essential AI knowledge for decision-makers, covering strategic implications and implementation considerations.</p>
                            <div className={`mt-auto pt-6 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/50'}`}>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-3">Key Topics</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {['AI landscape overview', 'Strategic planning', 'Risk assessment', 'ROI frameworks'].map((t, i) => (
                                        <span key={i} className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            <span className="w-1 h-1 rounded-full bg-orange-400"></span> {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Workshop 2 */}
                        <div className={`flex flex-col p-8 border rounded-[28px] transition-colors ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/50 border-white/50 hover:bg-white/70'}`}>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-slate-900/5 text-slate-600 border-slate-900/5'}`}>2 Days</span>
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>Technical Teams</span>
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>PRACTICAL AI IMPLEMENTATION</h3>
                            <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Hands-on workshop focusing on implementing AI solutions in real-world business scenarios.</p>
                            <div className={`mt-auto pt-6 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/50'}`}>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-3">Key Topics</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {['Tool selection', 'Integration patterns', 'Best practices', 'Performance optimization'].map((t, i) => (
                                        <span key={i} className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            <span className="w-1 h-1 rounded-full bg-blue-400"></span> {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Workshop 3 */}
                        <div className={`flex flex-col p-8 border rounded-[28px] transition-colors ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/50 border-white/50 hover:bg-white/70'}`}>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-slate-900/5 text-slate-600 border-slate-900/5'}`}>Full Day</span>
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>Compliance & Legal</span>
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI ETHICS & GOVERNANCE</h3>
                            <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Comprehensive guide to ethical AI implementation and governance frameworks.</p>
                            <div className={`mt-auto pt-6 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/50'}`}>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-3">Key Topics</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {['Ethical frameworks', 'Compliance requirements', 'Bias mitigation', 'Monitoring strategies'].map((t, i) => (
                                        <span key={i} className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            <span className="w-1 h-1 rounded-full bg-purple-400"></span> {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Workshop 4 */}
                        <div className={`flex flex-col p-8 border rounded-[28px] transition-colors ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/50 border-white/50 hover:bg-white/70'}`}>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-slate-900/5 text-slate-600 border-slate-900/5'}`}>Full Day</span>
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>Marketing & CS</span>
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI-POWERED CUSTOMER EXPERIENCE</h3>
                            <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Transform customer interactions with AI-driven personalization and automation strategies.</p>
                            <div className={`mt-auto pt-6 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/50'}`}>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-3">Key Topics</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {['Personalization engines', 'Chatbot implementation', 'Customer analytics', 'Experience design'].map((t, i) => (
                                        <span key={i} className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            <span className="w-1 h-1 rounded-full bg-amber-400"></span> {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Features Row */}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 mt-4 pt-10 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/40'}`}>
                        <div className="flex flex-col gap-2">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>CUSTOMIZED CONTENT</h4>
                            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Workshops tailored to your specific industry, team size, and current AI maturity level.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>INTERACTIVE LEARNING</h4>
                            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Hands-on exercises, group discussions, and real-world case studies for maximum engagement.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ONGOING SUPPORT</h4>
                            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Post-workshop resources and follow-up sessions to ensure successful implementation.</p>
                        </div>
                    </div>

                    {/* Section CTA */}
                    <div className="flex justify-center mt-6">
                        <button onClick={() => scrollToSection(contactRef)} className={`px-8 py-3 rounded-full font-medium text-sm transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${isDarkMode ? 'bg-white text-slate-900 hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>SCHEDULE A WORKSHOP</button>
                    </div>
                </div>
            </section>

            {/* ABOUT SECTION */}
            <section ref={aboutRef} id="about" className={`w-full py-24 px-6 md:px-12 relative backdrop-blur-xl border-t ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/20 border-white/20'}`}>
                <div className="max-w-6xl mx-auto flex flex-col gap-16">

                    {/* Header */}
                    <div className="flex flex-col gap-6 max-w-3xl">
                        <span className="text-[10px] font-mono tracking-[0.3em] text-slate-500 uppercase">Profile</span>
                        <h2 className={`text-3xl md:text-5xl font-bold tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ABOUT</h2>
                        <p className={`text-xl leading-relaxed font-light ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            With over 5 years of experience in AI implementation and strategy, I help organizations leverage artificial intelligence to drive innovation and efficiency.
                        </p>
                    </div>

                    {/* Content Grid */}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 pt-8 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/50'}`}>
                        <div className="flex flex-col gap-4">
                            <h4 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>STRATEGIC CONSULTING</h4>
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Comprehensive AI strategy development aligned with your business objectives and organizational capabilities.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h4 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>HANDS-ON WORKSHOPS</h4>
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Interactive training sessions designed to upskill your team and build internal AI capabilities.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h4 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>IMPLEMENTATION SUPPORT</h4>
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>End-to-end guidance from concept to deployment, ensuring successful AI integration into your workflows.</p>
                        </div>
                    </div>

                    {/* Large Call to Action */}
                    <div className="mt-12 p-8 md:p-16 rounded-[32px] bg-slate-900 text-white text-center flex flex-col items-center gap-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/40 to-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                        <h3 className="text-3xl md:text-5xl font-bold tracking-tight relative z-10">Let&apos;s Build Your AI Future Together</h3>
                        <p className="text-slate-300 max-w-2xl text-lg leading-relaxed relative z-10">
                            Whether you&apos;re just starting your AI journey or looking to optimize existing systems, I provide the expertise and guidance you need.
                        </p>
                        <div className="flex gap-4 relative z-10 pt-4">
                            <button onClick={() => onStartChat()} className="px-8 py-3 bg-white text-slate-900 rounded-full font-medium text-sm hover:scale-105 transition-transform shadow-lg">Start Conversation</button>
                            <button onClick={() => scrollToSection(contactRef)} className="px-8 py-3 bg-transparent border border-white/30 text-white rounded-full font-medium text-sm hover:bg-white/10 transition-colors">Schedule Call</button>
                        </div>
                    </div>

                </div>
            </section>

            {/* CONTACT SECTION */}
            <section ref={contactRef} id="contact" className={`w-full py-24 px-6 md:px-12 backdrop-blur-xl border-t ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/40 border-white/20'}`}>
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16">

                    {/* Left Column: Info */}
                    <div className="flex flex-col gap-12 lg:w-1/3">
                        <div className="flex flex-col gap-4">
                            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>CONTACT</h2>
                            <p className={`leading-relaxed font-light ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                Ready to transform your organization with AI? Let&apos;s start a conversation about your specific needs and how we can work together.
                            </p>
                        </div>

                        <div className="flex flex-col gap-8">
                            <div className="flex flex-col gap-4">
                                <h4 className={`text-xs font-bold uppercase tracking-widest border-b pb-2 ${isDarkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200/60'}`}>GET IN TOUCH</h4>
                                <div className="flex flex-col gap-3 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-mono uppercase">Email</span>
                                        <a href="mailto:contact@farzadbayat.com" className={`font-medium transition-colors ${isDarkMode ? 'text-white hover:text-orange-400' : 'text-slate-900 hover:text-orange-700'}`}>contact@farzadbayat.com</a>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-mono uppercase">Phone</span>
                                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>+47 94446446</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-mono uppercase">Location</span>
                                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Oslo, Norway & Remote</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <h4 className={`text-xs font-bold uppercase tracking-widest border-b pb-2 ${isDarkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200/60'}`}>AVAILABILITY</h4>
                                <div className="flex flex-col gap-3 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-mono uppercase">Consultation Slots</span>
                                        <span className={`font-medium flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <span className="w-2 h-2 rounded-full bg-orange-400"></span> Available within 2-3 business days
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-mono uppercase">Workshop Scheduling</span>
                                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Planning 2-4 weeks in advance</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div className={`lg:w-2/3 backdrop-blur-md border rounded-[32px] p-8 md:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 group ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-white/60'}`}>
                        <div className="flex flex-col gap-2 mb-8">
                            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>SCHEDULE A CONSULTATION</h3>
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Take the first step towards AI transformation. Book a free 30-minute consultation to discuss your goals and explore how we can work together.</p>
                        </div>

                        <form className="flex flex-col gap-6" onSubmit={handleFormSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">YOUR NAME</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formState.name}
                                        onChange={handleFormChange}
                                        placeholder="John Doe"
                                        className={`w-full border rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/60 border-white/60 text-slate-900'}`}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">COMPANY</label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={formState.company}
                                        onChange={handleFormChange}
                                        placeholder="Your Company"
                                        className={`w-full border rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/60 border-white/60 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">EMAIL</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formState.email}
                                    onChange={handleFormChange}
                                    placeholder="john@company.com"
                                    className={`w-full border rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/60 border-white/60 text-slate-900'}`}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">AREA OF INTEREST</label>
                                <div className="relative">
                                    <select
                                        name="interest"
                                        value={formState.interest}
                                        onChange={handleFormChange}
                                        className={`w-full border rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all appearance-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/60 border-white/60 text-slate-900'}`}
                                    >
                                        <option value="" disabled className={isDarkMode ? 'text-slate-900' : ''}>Choose your area of interest</option>
                                        <option value="strategy" className={isDarkMode ? 'text-slate-900' : ''}>AI Strategy & Consulting</option>
                                        <option value="workshops" className={isDarkMode ? 'text-slate-900' : ''}>Workshops & Training</option>
                                        <option value="implementation" className={isDarkMode ? 'text-slate-900' : ''}>Implementation Support</option>
                                        <option value="general" className={isDarkMode ? 'text-slate-900' : ''}>General Inquiry</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className={`mt-4 px-8 py-4 rounded-full font-medium text-sm tracking-wide transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-2 group/btn ${isDarkMode ? 'bg-white text-slate-900 hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                                <span>REQUEST CONSULTATION</span>
                                <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className={`w-full pt-16 pb-8 px-6 md:px-12 border-t backdrop-blur-md text-sm ${isDarkMode ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-white/40 border-white/20 text-slate-600'}`}>
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

                    {/* Brand Column (Span 2) */}
                    <div className="md:col-span-2 flex flex-col gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold font-mono text-sm shadow-lg mb-2 ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>FB</div>
                        <p className={`leading-relaxed max-w-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            AI Consultant & Workshop Facilitator helping organizations navigate the AI landscape through strategic consulting and hands-on implementation guidance.
                        </p>
                    </div>

                    {/* Services Column */}
                    <div className="flex flex-col gap-4">
                        <h4 className={`font-bold uppercase tracking-wider text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Services</h4>
                        <ul className={`flex flex-col gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            <li className="hover:text-orange-500 cursor-pointer transition-colors" onClick={() => scrollToSection(servicesRef)}>AI Strategy Consulting</li>
                            <li className="hover:text-orange-500 cursor-pointer transition-colors" onClick={() => scrollToSection(workshopsRef)}>Team Workshops</li>
                            <li className="hover:text-orange-500 cursor-pointer transition-colors" onClick={() => scrollToSection(servicesRef)}>Implementation Support</li>
                            <li className="hover:text-orange-500 cursor-pointer transition-colors" onClick={() => scrollToSection(servicesRef)}>Custom Solutions</li>
                        </ul>
                    </div>

                    {/* Contact Column */}
                    <div className="flex flex-col gap-4">
                        <h4 className={`font-bold uppercase tracking-wider text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Contact</h4>
                        <ul className={`flex flex-col gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            <li className="hover:text-orange-500 transition-colors">
                                <a href="mailto:contact@farzadbayat.com">contact@farzadbayat.com</a>
                            </li>
                            <li className="hover:text-orange-500 transition-colors">+47 94446446</li>
                            <li>Oslo, Norway & Remote</li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className={`max-w-6xl mx-auto pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs ${isDarkMode ? 'border-white/10 text-slate-500' : 'border-slate-200/50 text-slate-500'}`}>
                    <span>© 2024 F.B/c AI Consultant. All rights reserved.</span>
                    <div className="flex gap-6 items-center">
                        <a href="#" className={`hover:transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>Privacy Policy</a>
                        <a href="#" className={`hover:transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>Terms of Service</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection(contactRef); }} className={`hover:transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>Contact</a>
                        {onAdminAccess && (
                            <button
                                onClick={onAdminAccess}
                                className={`text-[10px] font-mono uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                                title="Admin Login"
                            >
                                Admin Access
                            </button>
                        )}
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default LandingPage;
