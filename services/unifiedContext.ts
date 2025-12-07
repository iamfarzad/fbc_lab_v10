import type { TranscriptItem, ResearchResult } from 'types';

type Location = { latitude: number; longitude: number };

type UnifiedState = {
    sessionId?: string;
    researchContext?: ResearchResult | null;
    location?: Location;
    conversationFlow?: any;
    intelligenceContext?: any;
    transcript: TranscriptItem[];
    language?: string; // Preferred language (e.g., 'en', 'nb', 'es')
};

type Listener = (state: UnifiedState) => void;

const STORAGE_KEY = 'fbc_unified_context_v1';

/**
 * UnifiedContext - Single Source of Truth (SSOT) for application state.
 * Persists to localStorage to survive page reloads.
 */
class UnifiedContext {
    private state: UnifiedState = { transcript: [] };
    private listeners = new Set<Listener>();
    private locationPromise: Promise<Location | undefined> | null = null;
    // private isInitialized = false; // Not used externally

    constructor() {
        // Hydrate from storage immediately if on client
        if (typeof window !== 'undefined') {
            this.hydrate();
        }
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.persist();
        for (const listener of this.listeners) listener(this.state);
    }

    private persist() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.warn('[UnifiedContext] Failed to persist state:', e);
        }
    }

    public hydrate() {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Restore dates in transcript if needed
                if (parsed.transcript) {
                    parsed.transcript = parsed.transcript.map((item: any) => ({
                        ...item,
                        timestamp: new Date(item.timestamp as string | number | Date)
                    }));
                }
                this.state = { ...this.state, ...parsed };
                // this.isInitialized = true; // Removed - not in type definition
                // Don't notify here to avoid render loops during init, 
                // but listeners will get state on subscribe
            }
        } catch (e) {
            console.warn('[UnifiedContext] Failed to hydrate state:', e);
        }
    }

    public clear() {
        this.state = { transcript: [] };
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
        this.notify();
    }

    getSnapshot(): UnifiedState {
        return { ...this.state, transcript: [...this.state.transcript] };
    }

    setSessionId(sessionId: string) {
        if (this.state.sessionId === sessionId) return;
        this.state.sessionId = sessionId;
        this.notify();
    }

    setResearchContext(research: ResearchResult | null) {
        this.state.researchContext = research;
        this.notify();
    }

    setConversationFlow(flow: any) {
        this.state.conversationFlow = flow;
        this.notify();
    }

    setIntelligenceContext(ctx: any) {
        this.state.intelligenceContext = ctx;
        this.notify();
    }

    setTranscript(transcript: TranscriptItem[]) {
        this.state.transcript = transcript;
        this.notify();
    }

    /**
     * Appends a single item to the transcript
     */
    addTranscriptItem(item: TranscriptItem) {
        this.state.transcript = [...this.state.transcript, item];
        this.notify();
    }

    setLocation(loc: Location) {
        this.state.location = loc;
        this.locationPromise = null; // allow future re-fetch if cleared
        this.notify();
    }

    async ensureLocation(): Promise<Location | undefined> {
        if (this.state.location) return this.state.location;
        if (this.locationPromise) return this.locationPromise;

        this.locationPromise = new Promise<Location | undefined>((resolve) => {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
                resolve(undefined);
                return;
            }

            const timeout = setTimeout(() => resolve(undefined), 1000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeout);
                    const loc = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    this.setLocation(loc);
                    resolve(loc);
                },
                () => {
                    // Silently handle geolocation errors (user denied, timeout, etc.)
                    // Don't log as error - this is expected behavior
                    clearTimeout(timeout);
                    resolve(undefined);
                },
                { timeout: 5000, maximumAge: 1800000 } // Increased timeout to 5s
            );
        }).finally(() => {
            this.locationPromise = null;
        });

        return this.locationPromise;
    }

    setLanguage(language: string) {
        this.state.language = language;
        this.notify();
    }

    /**
     * Ensure language is set, defaulting to browser language or 'en'
     */
    ensureLanguage(): string {
        if (this.state.language) return this.state.language;
        
        // Try to detect from browser
        if (typeof navigator !== 'undefined' && navigator.language) {
            const browserLang = navigator.language.split('-')[0] || 'en';
            this.setLanguage(browserLang);
            return browserLang;
        }
        
        // Default to English
        this.setLanguage('en');
        return 'en';
    }
}

export const unifiedContext = new UnifiedContext();
