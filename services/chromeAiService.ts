
import type { ResearchResult } from 'types';

const hasWindow = typeof window !== 'undefined';

// Interfaces for the experimental APIs
interface AIModelSession {
    prompt: (input: string) => Promise<string>;
    destroy?: () => void;
}

interface RewriterSession {
    rewrite: (text: string) => Promise<string>;
    destroy?: () => void;
}

interface SummarizerSession {
    summarize: (text: string) => Promise<string>;
    destroy?: () => void;
}

interface AIModelFactory {
    create(options?: Record<string, unknown>): Promise<AIModelSession>;
    capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
}

interface RewriterFactory {
    create(options?: Record<string, unknown>): Promise<RewriterSession>;
    capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
}

interface SummarizerFactory {
    create(options?: Record<string, unknown>): Promise<SummarizerSession>;
    capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
}

declare global {
    interface Window {
        ai?: {
            languageModel?: AIModelFactory; // The new standard
            prompt?: AIModelFactory;        // Deprecated fallback
            summarizer?: SummarizerFactory;
            writer?: AIModelFactory;
            rewriter?: RewriterFactory;
        };
        markdownit?: unknown;
    }
}

export interface ChromeAiCapabilities {
    hasModel: boolean;
    hasSummarizer: boolean;
    hasRewriter: boolean;
    status: 'ready' | 'downloading' | 'unsupported';
}

export class ChromeAiService {

    private getModelFactory() {
        if (!hasWindow || !window.ai) return null;
        return window.ai.languageModel || window.ai.prompt;
    }

    async getCapabilities(): Promise<ChromeAiCapabilities> {
        if (!hasWindow || !window.ai) {
            return { hasModel: false, hasSummarizer: false, hasRewriter: false, status: 'unsupported' };
        }

        try {
            // 1. Check Language Model (Chat/Prompt)
            const modelFactory = this.getModelFactory();
            let hasModel = false;
            let status: ChromeAiCapabilities['status'] = 'unsupported';

            if (modelFactory) {
                const caps = await modelFactory.capabilities();
                if (caps.available === 'readily') {
                    hasModel = true;
                    status = 'ready';
                } else if (caps.available === 'after-download') {
                    hasModel = true;
                    status = 'downloading';
                }
            }

            // 2. Check Summarizer
            let hasSummarizer = false;
            if (window.ai.summarizer) {
                const caps = await window.ai.summarizer.capabilities();
                hasSummarizer = caps.available !== 'no';
            }

            // 3. Check Rewriter
            let hasRewriter = false;
            if (window.ai.rewriter) {
                const caps = await window.ai.rewriter.capabilities();
                hasRewriter = caps.available !== 'no';
            }

            return { hasModel, hasSummarizer, hasRewriter, status };
        } catch (e) {
            console.warn("Chrome AI detection failed", e);
            return { hasModel: false, hasSummarizer: false, hasRewriter: false, status: 'unsupported' };
        }
    }

    private formatContext(context?: ResearchResult): string {
        if (!context) return "";
        return `\nContext: The user is writing to ${context.person.fullName}, who is the ${context.role} at ${context.company.name}.`;
    }

    async generateText(prompt: string, systemInstruction?: string): Promise<string> {
        const modelFactory = this.getModelFactory();
        if (!modelFactory) throw new Error("Language Model not supported");

        let session: AIModelSession | null = null;
        try {
            session = await modelFactory.create({
                systemPrompt: systemInstruction
            });

            const result = await session.prompt(prompt);
            return result;
        } catch (e) {
            console.error("Local generation failed", e);
            throw new Error("Failed to generate text locally.");
        } finally {
            session?.destroy?.();
        }
    }

    async rewrite(text: string, tone: 'more-formal' | 'more-casual' | 'shorter' = 'more-formal', context?: ResearchResult): Promise<string> {
        // Try native rewriter first
        if (window.ai?.rewriter) {
            let rewriter: RewriterSession | null = null;
            try {
                const caps = await window.ai.rewriter.capabilities();
                if (caps.available !== 'no') {
                    rewriter = await window.ai.rewriter.create({
                        tone: tone === 'shorter' ? undefined : tone,
                        length: tone === 'shorter' ? 'shorter' : undefined,
                        sharedContext: context ? `Writing to ${context.person.fullName} at ${context.company.name}` : undefined
                    });
                    const result = await rewriter.rewrite(text);
                    return result;
                }
            } catch (e) {
                console.warn('Native rewriter failed, falling back to prompt', e);
            } finally {
                rewriter?.destroy?.();
            }
        }

        // Fallback to prompt
        const contextStr = this.formatContext(context);
        const systemPrompt = context
            ? `You are rewriting a message to ${context.person.fullName} at ${context.company.name}. Preserve intent, adjust tone to ${tone}.`
            : `You are a helpful rewriting assistant. Adjust tone to ${tone}.`;

        return this.generateText(
            `Rewrite the following text to be ${tone}.${contextStr}\n\nText: "${text}"`,
            systemPrompt
        );
    }

    async summarize(text: string): Promise<string> {
        // Try native summarizer first
        if (window.ai?.summarizer) {
            let summarizer: SummarizerSession | null = null;
            try {
                const caps = await window.ai.summarizer.capabilities();
                if (caps.available !== 'no') {
                    summarizer = await window.ai.summarizer.create();
                    const result = await summarizer.summarize(text);
                    return result;
                }
            } catch (e) {
                console.warn('Native summarizer failed, falling back to prompt', e);
            } finally {
                summarizer?.destroy?.();
            }
        }

        // Fallback to prompt
        return this.generateText(`Summarize the following text concisely:\n\n${text}`);
    }

    async proofread(text: string): Promise<string> {
        const systemPrompt = "You are a professional copy editor. Fix grammar, spelling, and punctuation errors in the user's text. Do not change the meaning. Output ONLY the corrected text.";
        return this.generateText(text, systemPrompt);
    }
}
