import { VisualShape, VisualState } from '../../types';

export const agentToShape: Record<string, VisualShape> = {
    'Discovery Agent': 'discovery',
    'Scoring Agent': 'scoring',
    'Workshop Sales Agent': 'workshop',
    'Consulting Sales Agent': 'consulting',
    'Closer Agent': 'closer',
    'Summary Agent': 'summary',
    'Proposal Agent': 'proposal',
    'Admin Agent': 'admin',
    'Retargeting Agent': 'retargeting'
};

export const stageToShape: Record<string, VisualShape> = {
    DISCOVERY: 'discovery',
    SCORING: 'scoring',
    WORKSHOP_PITCH: 'workshop',
    CONSULTING_PITCH: 'consulting',
    CLOSING: 'closer',
    SUMMARY: 'summary',
    PROPOSAL: 'proposal',
    ADMIN: 'admin',
    RETARGETING: 'retargeting',
    BOOKING_REQUESTED: 'consulting'
};

export function resolveAgentShape(agent?: string | null, stage?: string | null): VisualShape {
    if (agent) {
        if (agentToShape[agent]) return agentToShape[agent];
        const lower = agent.toLowerCase();
        if (lower.includes('discovery')) return 'discovery';
        if (lower.includes('score')) return 'scoring';
        if (lower.includes('workshop')) return 'workshop';
        if (lower.includes('consult')) return 'consulting';
        if (lower.includes('close')) return 'closer';
        if (lower.includes('summary')) return 'summary';
        if (lower.includes('proposal')) return 'proposal';
        if (lower.includes('admin')) return 'admin';
        if (lower.includes('retarget')) return 'retargeting';
    }
    if (stage && stageToShape[stage]) return stageToShape[stage];
    return 'orb';
}

// Helper for strict word matching
const hasWord = (text: string, word: string) => new RegExp(`\\b${word}\\b`, 'i').test(text);
const hasPhrase = (text: string, phrase: string) => text.toLowerCase().includes(phrase);

export interface IntentResult {
    shape: VisualShape | null;
    textContent?: string;
    weatherData?: VisualState['weatherData'];
    chartData?: VisualState['chartData'];
    mapData?: VisualState['mapData'];
}

export const extractWeatherData = (text: string): VisualState['weatherData'] | undefined => {
    const t = text.toLowerCase();

    // Extract temperature with improved regex - handles "0°C", "0°", "0 degrees", etc.
    const tempRegex = /(-?\d+)\s*(?:°|degrees?|deg)\s*[CF]?(?!\s*[NSEW])/i;
    const match = text.match(tempRegex);
    // Also try simpler pattern like "0°C" or "0°"
    const simpleMatch = !match ? text.match(/(-?\d+)\s*°\s*[CF]?/i) : null;
    const finalMatch = match || simpleMatch;
    const temperature = finalMatch ? finalMatch[0].replace(/\s+/g, '').toUpperCase() : undefined;

    let condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' = 'cloudy';

    if (hasWord(t, 'snow') || hasWord(t, 'flurries') || hasWord(t, 'blizzard') || hasWord(t, 'freezing')) condition = 'snowy';
    else if (hasWord(t, 'rain') || hasWord(t, 'rainy') || hasWord(t, 'drizzle') || hasWord(t, 'shower') || hasWord(t, 'wet')) condition = 'rainy';
    else if (hasWord(t, 'storm') || hasWord(t, 'stormy') || hasWord(t, 'thunder') || hasWord(t, 'lightning')) condition = 'stormy';
    else if (hasWord(t, 'sun') || hasWord(t, 'sunny') || hasWord(t, 'clear') || hasWord(t, 'bright')) condition = 'sunny';

    const hasContext =
        hasWord(t, 'weather') ||
        hasWord(t, 'temperature') ||
        hasWord(t, 'forecast') ||
        hasWord(t, 'climate') ||
        hasWord(t, 'celsius') ||
        hasWord(t, 'fahrenheit') ||
        hasWord(t, 'degrees') ||
        !!temperature;

    if (hasContext && (condition !== 'cloudy' || temperature)) {
        return { condition, ...(temperature ? { temperature } : {}) };
    }
    return undefined;
};

export const extractChartData = (text: string): VisualState['chartData'] | undefined => {
    const t = text.toLowerCase();
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    if (hasWord(t, 'up') || hasWord(t, 'rose') || hasWord(t, 'increase') || hasWord(t, 'gain') || hasWord(t, 'bull') || hasWord(t, 'high') || /\+\d/.test(text)) trend = 'up';
    else if (hasWord(t, 'down') || hasWord(t, 'fell') || hasWord(t, 'drop') || hasWord(t, 'loss') || hasWord(t, 'bear') || hasWord(t, 'low') || /-\d/.test(text)) trend = 'down';

    const valueRegex = /(\$\d[\d,.]*|\d[\d,.]*%)/;
    const match = text.match(valueRegex);
    const value = match ? match[0] : undefined;

    if (trend !== 'neutral' || value) {
        return { trend, ...(value ? { value } : {}) };
    }
    return undefined;
};

export const extractMapCoords = (uri: string): { lat: number, lng: number } | undefined => {
    const atMatch = uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch && atMatch[1] && atMatch[2]) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    const llMatch = uri.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch && llMatch[1] && llMatch[2]) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

    return undefined;
};

export const detectVisualIntent = (text: string): IntentResult | null => {
    const t = text.toLowerCase();

    if (hasPhrase(t, 'what is your name') || hasPhrase(t, 'who are you') || hasPhrase(t, 'your identity') || hasPhrase(t, 'f.b/c')) {
        return { shape: 'text', textContent: "F.B/c" };
    }

    if (
        hasWord(t, 'analyze') || hasWord(t, 'scan') || hasWord(t, 'read') || hasPhrase(t, 'check this') || hasWord(t, 'review') ||
        hasPhrase(t, 'image displays') || hasPhrase(t, 'file contains') || hasPhrase(t, 'report details') || hasPhrase(t, 'summary of') || hasWord(t, 'report') || hasWord(t, 'summary') ||
        (hasWord(t, 'analyzed') && (hasWord(t, 'image') || hasWord(t, 'file') || hasWord(t, 'document') || hasWord(t, 'content')))
    ) {
        return { shape: 'scanner' };
    }

    if (
        hasWord(t, 'function') || hasWord(t, 'const') || hasWord(t, 'import') || hasWord(t, 'class') ||
        hasWord(t, 'python') || hasWord(t, 'javascript') || hasPhrase(t, 'code block') || hasWord(t, 'algorithm') ||
        hasWord(t, 'api') || text.includes('```')
    ) {
        return { shape: 'code' };
    }

    // Check for weather FIRST (before map/chart) to prioritize weather visualization
    const weatherData = extractWeatherData(text);
    if (weatherData) {
        return { shape: 'weather', weatherData };
    }

    // Also check for weather keywords even if extractWeatherData didn't find structured data
    if (
        (hasWord(t, 'weather') || hasWord(t, 'temperature') || hasWord(t, 'forecast') ||
            hasWord(t, 'celsius') || hasWord(t, 'fahrenheit') || hasWord(t, 'degrees') ||
            hasWord(t, 'cloudy') || hasWord(t, 'sunny') || hasWord(t, 'rainy') || hasWord(t, 'snowy') || hasWord(t, 'stormy')) &&
        (/\d+\s*°/.test(text) || hasWord(t, 'temperature') || hasWord(t, 'weather'))
    ) {
        // Try to extract basic weather info even if regex didn't match
        const tempMatch = text.match(/(-?\d+)\s*°?\s*[CF]?/i);
        const temp = tempMatch ? tempMatch[0].replace(/\s+/g, '') : undefined;
        let condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' = 'cloudy';
        if (hasWord(t, 'snow') || hasWord(t, 'flurries')) condition = 'snowy';
        else if (hasWord(t, 'rain') || hasWord(t, 'rainy') || hasWord(t, 'drizzle')) condition = 'rainy';
        else if (hasWord(t, 'storm') || hasWord(t, 'thunder')) condition = 'stormy';
        else if (hasWord(t, 'sun') || hasWord(t, 'sunny') || hasWord(t, 'clear')) condition = 'sunny';

        return {
            shape: 'weather',
            weatherData: { condition, ...(temp ? { temperature: temp } : {}) }
        };
    }

    if (
        hasPhrase(t, 'where is') || hasWord(t, 'location') || hasWord(t, 'map') || hasWord(t, 'direction') ||
        hasWord(t, 'navigate') || hasWord(t, 'gps') || hasWord(t, 'route')
    ) {
        return { shape: 'map' };
    }

    if (
        hasWord(t, 'stock') || hasWord(t, 'price') || hasWord(t, 'market') || hasWord(t, 'chart') ||
        hasWord(t, 'graph') || hasWord(t, 'bitcoin') || hasWord(t, 'crypto') || hasWord(t, 'currency') ||
        hasWord(t, 'trading') || hasWord(t, 'data') || hasWord(t, 'trend') || hasWord(t, 'finance')
    ) {
        const data = extractChartData(text);
        if (data) {
            return { shape: 'chart', chartData: data };
        }
        return { shape: 'chart' };
    }

    if (hasWord(t, 'planet') || hasWord(t, 'space') || hasWord(t, 'orbit') || hasWord(t, 'cosmos') || hasWord(t, 'solar') || hasWord(t, 'galaxy') || hasWord(t, 'universe') || hasWord(t, 'moon')) {
        return { shape: 'planet' };
    }

    if (hasWord(t, 'time') || hasWord(t, 'clock') || hasPhrase(t, 'what hour')) {
        return { shape: 'clock' };
    }

    if (hasWord(t, 'search') || hasWord(t, 'google') || hasWord(t, 'web') || hasWord(t, 'internet') || hasWord(t, 'online') || hasWord(t, 'find') || hasWord(t, 'browser')) { return { shape: 'globe' }; }
    if (hasWord(t, 'reason') || hasWord(t, 'think') || hasWord(t, 'logic') || hasWord(t, 'plan') || hasWord(t, 'solve') || hasWord(t, 'compare') || hasWord(t, 'study') || hasWord(t, 'neural') || hasWord(t, 'ai') || hasWord(t, 'brainstorm')) { return { shape: 'brain' }; }
    if (hasWord(t, 'face') || hasWord(t, 'eye') || hasWord(t, 'vision') || hasWord(t, 'sight') || hasPhrase(t, 'look like') || hasWord(t, 'avatar') || hasWord(t, 'self') || hasWord(t, 'mirror')) { return { shape: 'face' }; }
    if (hasWord(t, 'love') || hasWord(t, 'heart') || hasWord(t, 'feel') || hasWord(t, 'care') || hasWord(t, 'happy') || hasWord(t, 'sad')) { return { shape: 'heart' }; }
    if (hasWord(t, 'matrix') || hasWord(t, 'grid') || hasWord(t, 'system') || hasWord(t, 'computer') || hasWord(t, 'digital')) { return { shape: 'grid' }; }
    if (hasWord(t, 'dna') || hasWord(t, 'life') || hasWord(t, 'bio') || hasWord(t, 'gene') || hasWord(t, 'cell') || hasWord(t, 'health')) { return { shape: 'dna' }; }
    if (hasWord(t, 'atom') || hasWord(t, 'physics') || hasWord(t, 'energy') || hasWord(t, 'nuclear') || hasWord(t, 'science') || hasWord(t, 'quantum')) { return { shape: 'atom' }; }
    if (hasWord(t, 'history') || hasWord(t, 'wait') || hasWord(t, 'ancient') || hasWord(t, 'future')) { return { shape: 'hourglass' }; }

    if (hasWord(t, 'why') || hasWord(t, 'mystery') || hasWord(t, 'philosophy') || hasWord(t, 'confuse') || hasWord(t, 'connect')) { return { shape: 'constellation' }; }

    if (hasWord(t, 'secure') || hasWord(t, 'safe') || hasWord(t, 'protect') || hasWord(t, 'shield') || hasWord(t, 'private') || hasWord(t, 'lock')) { return { shape: 'shield' }; }
    if (hasWord(t, 'idea') || hasWord(t, 'star') || hasWord(t, 'magic') || hasWord(t, 'success') || hasWord(t, 'win') || hasWord(t, 'spark')) { return { shape: 'star' }; }

    // Missing Geometric Shapes
    if (hasWord(t, 'rectangle') || hasWord(t, 'rect') || hasWord(t, 'box') || hasWord(t, 'square') || hasWord(t, 'frame') || hasWord(t, 'shape')) { return { shape: 'rect' }; }
    if (hasWord(t, 'wave') || hasWord(t, 'ocean') || hasWord(t, 'water') || hasWord(t, 'flow') || hasWord(t, 'current') || hasWord(t, 'tide') || hasWord(t, 'ripple')) { return { shape: 'wave' }; }
    if (hasWord(t, 'vortex') || hasWord(t, 'spiral') || hasWord(t, 'whirlpool') || hasWord(t, 'tornado') || hasWord(t, 'swirl') || hasWord(t, 'twist') || hasWord(t, 'cyclone')) { return { shape: 'vortex' }; }
    if (hasWord(t, 'firework') || hasWord(t, 'celebration') || hasWord(t, 'party') || hasWord(t, 'explosion') || hasWord(t, 'festival') || hasWord(t, 'firecracker') || hasWord(t, 'sparkler')) { return { shape: 'fireworks' }; }
    if (hasWord(t, 'lightning') || hasWord(t, 'thunder') || hasWord(t, 'bolt') || hasWord(t, 'electric') || hasWord(t, 'flash') || hasWord(t, 'zap') || hasWord(t, 'strike')) { return { shape: 'lightning' }; }
    if (hasWord(t, 'flower') || hasWord(t, 'bloom') || hasWord(t, 'petal') || hasWord(t, 'garden') || hasWord(t, 'rose') || hasWord(t, 'nature') || hasWord(t, 'blossom')) { return { shape: 'flower' }; }

    // Agent Shapes
    if (hasWord(t, 'discover') || hasWord(t, 'explore') || hasWord(t, 'research') || hasWord(t, 'investigate')) { return { shape: 'discovery' }; }
    if (hasWord(t, 'score') || hasWord(t, 'rating') || hasWord(t, 'evaluate') || hasWord(t, 'assess') || hasWord(t, 'grade') || hasWord(t, 'points')) { return { shape: 'scoring' }; }
    if (hasWord(t, 'workshop') || hasWord(t, 'training') || hasWord(t, 'session') || hasWord(t, 'course') || hasWord(t, 'learn') || hasWord(t, 'teach')) { return { shape: 'workshop' }; }
    if (hasWord(t, 'consult') || hasWord(t, 'advice') || hasWord(t, 'guidance') || hasWord(t, 'expert') || hasWord(t, 'advisor') || hasWord(t, 'counsel')) { return { shape: 'consulting' }; }
    if (hasWord(t, 'close') || hasWord(t, 'deal') || hasWord(t, 'urgent') || hasWord(t, 'finalize') || hasWord(t, 'complete') || hasWord(t, 'seal')) { return { shape: 'closer' }; }
    if (hasWord(t, 'summarize') || hasWord(t, 'recap') || hasWord(t, 'overview') || hasWord(t, 'brief') || hasWord(t, 'synopsis')) { return { shape: 'summary' }; }
    if (hasWord(t, 'proposal') || hasWord(t, 'offer') || hasWord(t, 'quote') || hasWord(t, 'bid') || hasWord(t, 'suggest') || hasWord(t, 'recommend')) { return { shape: 'proposal' }; }
    if (hasWord(t, 'admin') || hasWord(t, 'manage') || hasWord(t, 'control') || hasWord(t, 'settings') || hasWord(t, 'configure') || hasWord(t, 'system')) { return { shape: 'admin' }; }
    if (hasWord(t, 'retarget') || hasWord(t, 'remarket') || hasWord(t, 'reengage') || hasPhrase(t, 'follow-up') || hasWord(t, 'reconnect') || hasWord(t, 'nurture')) { return { shape: 'retargeting' }; }

    const highlightRegex = /(\*\*|["'])([A-Za-z0-9\s]{2,15})\1/;
    const match = text.match(highlightRegex);

    if (match && match[2]) {
        const keyword = match[2].trim();
        const ignore = ['this', 'that', 'here', 'note', 'user', 'model', 'system', 'text', 'code', 'image', 'data', 'file', 'report'];

        if (!ignore.includes(keyword.toLowerCase()) && keyword.split(' ').length <= 2) {
            return { shape: 'text', textContent: keyword.toUpperCase() };
        }
    }

    return null;
};
