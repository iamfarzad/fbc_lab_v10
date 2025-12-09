import { GEMINI_MODELS } from "src/config/constants";

// Routing Logic Types
export interface ModelRoute {
    id: string;
    label: string;
    description: string;
    color: string; // Tailwind class for dot color
}

// Model Routing Logic
export const smartRouteModel = (text: string, hasAttachment: boolean): ModelRoute => {
    const t = text.toLowerCase();

    // 1. Navigation / Maps / Location -> Flash (Better Maps support)
    if (t.includes('where is') || t.includes('route') || t.includes('distance') || t.includes('map') || t.includes('navigate') || t.includes('location of') || t.includes('directions')) {
        return {
            id: GEMINI_MODELS.FLASH_2025_09, // gemini-2.5-flash
            label: 'LIVE NAVIGATION',
            description: 'Routing query detected. Using standard engine with Google Maps integration.',
            color: 'bg-orange-500'
        };
    }

    // 2. Complex Reasoning / Code / Math -> Pro (Reasoning Budget & Code Execution)
    if (t.includes('code') || t.includes('function') || t.includes('script') || t.includes('program') || t.includes('math') || t.includes('calculate') || t.includes('solve') || t.includes('analyze') || t.includes('why') || t.includes('strategy') || t.includes('plan')) {
        return {
            id: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
            label: 'DEEP REASONING',
            description: 'Complex query detected. Using high-intelligence reasoning engine.',
            color: 'bg-indigo-500'
        };
    }

    // 3. Multimodal (Images) -> Pro (Better Vision)
    if (hasAttachment) {
        return {
            id: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
            label: 'VISUAL ANALYSIS',
            description: 'Visual context detected. Using multimodal processing engine.',
            color: 'bg-purple-500'
        };
    }

    // 4. Length Heuristic
    if (text.length > 150) {
        return {
            id: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
            label: 'COMPLEX CONTEXT',
            description: 'Long context detected. Upgrading to larger context window.',
            color: 'bg-indigo-500'
        };
    }

    // 5. Default -> Flash (Speed)
    return {
        id: GEMINI_MODELS.DEFAULT_CHAT,
        label: 'STANDARD',
        description: 'Standard query. Using high-speed response engine.',
        color: 'bg-gray-400'
    };
};
