
import type { Tool } from '@google/genai';

export enum LiveConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
  /**
   * Claim-level grounding supports from Gemini.
   * Each support links a text segment (by character indices) to one or more grounding chunks.
   */
  groundingSupports?: Array<{
    segment?: { startIndex?: number; endIndex?: number };
    groundingChunkIndices?: number[];
  }>;
  webSearchQueries?: string[];
  searchEntryPoint?: any;
}

export interface ChainOfThoughtStep {
  label: string;
  description?: string;
  status: 'complete' | 'active' | 'pending';
  timestamp?: number;
}

export interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isFinal: boolean;
  reasoning?: string; // For Chain of Thought UI
  chainOfThought?: { steps: ChainOfThoughtStep[] }; // Safe, high-level reasoning steps
  tools?: Array<{
    name: string;
    type?: string;
    state?: 'running' | 'complete' | 'error';
    input?: unknown;
    output?: unknown;
    error?: string;
    startedAt?: number;
    finishedAt?: number;
  }>; // Per-message tool timeline
  status?: 'streaming' | 'complete' | 'error'; // For Shimmer UI and error states
  processingTime?: number; // Response time in milliseconds
  error?: {
    type: 'network' | 'rate_limit' | 'auth' | 'quota' | 'timeout' | 'server' | 'unknown';
    message: string;
    details?: string;
    retryable?: boolean;
  };
  contextSources?: Array<{
    type: 'company' | 'person' | 'location' | 'conversation' | 'file' | 'webcam' | 'screen' | 'web';
    label: string;
    value?: string;
    url?: string;
  }>;
  attachment?: {
    type: 'image' | 'file' | 'research-card' | 'calendar_widget' | 'discovery_report'; // Added discovery_report for AI Discovery Report PDF
    url?: string; // base64 data url or blob url for UI, or booking URL for calendar_widget
    mimeType?: string;
    data?: string; // Raw base64 string for API or JSON string for research-card/calendar_widget/discovery_report
    name?: string;
    htmlContent?: string; // HTML content for discovery_report inline preview
  };
  groundingMetadata?: GroundingMetadata;
}

export type VisualShape = 'orb' | 'wave' | 'dna' | 'rect' | 'face' | 'planet' | 'heart' | 'grid' | 'atom' | 'hourglass' | 'shield' | 'star' | 'globe' | 'brain' | 'constellation' | 'weather' | 'chart' | 'map' | 'clock' | 'code' | 'text' | 'scanner' | 'vortex' | 'fireworks' | 'lightning' | 'flower' | 'discovery' | 'scoring' | 'workshop' | 'consulting' | 'closer' | 'summary' | 'proposal' | 'admin' | 'retargeting' | 'oscilloscope' | 'spectrum' | 'toolCall' | 'functionPulse' | 'dataFlow' | 'insightBurst' | 'solarSystem' | 'network' | 'molecule' | 'mathGraph';

export interface VisualState {
  isActive: boolean;
  audioLevel: number; // 0.0 to 1.0
  mode: 'listening' | 'thinking' | 'speaking' | 'idle';
  shape: VisualShape;
  textContent?: string; // Dynamic text to render
  weatherData?: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
    temperature?: string;
    temperatureValue?: number; // Numeric value for particle rendering (Celsius)
    location?: string;
  };
  chartData?: {
    trend: 'up' | 'down' | 'neutral';
    value?: string;
    numericValue?: number; // Numeric value for particle rendering
    label?: string;
  };
  stockData?: {
    symbol: string;
    price: number;
    change: number;
    changePercent?: number;
  };
  mapData?: {
    title: string;
    lat?: number;
    lng?: number;
    destination?: {
      title: string;
      lat: number;
      lng: number;
    }
  };
  // New context-driven data properties
  solarSystemData?: {
    focusPlanet?: string;
    showOrbits?: boolean;
    scale?: 'realistic' | 'educational';
  };
  networkData?: {
    nodes: string[];
    connections: Array<{from: string, to: string, strength: number}>;
    layout: 'force' | 'circular' | 'hierarchical';
  };
  moleculeData?: {
    formula?: string;
    structure?: 'ball-stick' | 'space-filling' | 'wireframe';
    animate?: boolean;
  };
  mathData?: {
    equation?: string;
    graph3d?: boolean;
    domain?: [number, number];
    range?: [number, number];
  };
  // Metadata visualizations
  citationCount?: number; // Number of citations/sources
  reasoningComplexity?: number; // 0.0 to 1.0 based on reasoning length/complexity
  researchActive?: boolean; // Whether research queries are active
  sourceCount?: number; // Number of verified sources

  // New visual enhancement properties
  // Trails & Effects
  trailsEnabled?: boolean;
  bloomEnabled?: boolean;
  bloomIntensity?: number; // 0.0-2.0
  bloomRadius?: number; // 4-16px

  // Audio visualization
  waveformEnabled?: boolean;
  waveformMode?: 'oscilloscope' | 'spectrum';

  // Gesture & Interaction
  gestureMode?: 'shapes' | 'effects' | 'themes';

  // Morphing
  morphingTo?: VisualShape | null;
  morphProgress?: number; // 0.0-1.0

  // Tool calling
  toolCallData?: {
    name: string;
    progress: number; // 0.0-1.0
    state: 'running' | 'complete' | 'error';
  };

  // Research activity
  researchData?: {
    activeQueries: number;
    intensity: number; // 0.0-1.0
    insightFound?: number; // timestamp
  };

  // Theme overrides
  theme?: string;
  particleColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface LiveServiceConfig {
  apiKey: string;
  modelId: string; // Added for Model Selector
  model?: string; // Optional alias
  voiceName?: string; // Voice selection
  tools?: Tool[]; // Added for Tool Calling
  systemInstruction?: string; // Allow overriding system instruction
  onStateChange: (state: string) => void;
  onTranscript: (text: string, isUser: boolean, isFinal: boolean, groundingMetadata?: GroundingMetadata, agentMetadata?: { agent?: string; stage?: string }) => void;
  onVolumeChange: (inputVol: number, outputVol: number) => void;
  onToolCall?: (functionCalls: any[]) => Promise<any[]>; // Added Handler
}

// --- RESEARCH & CONTEXT TYPES ---

export interface CompanyContext {
  name: string;
  domain: string;
  industry?: string;
  size?: string;
  summary?: string;
  website?: string;
  linkedin?: string;
  country?: string;
}

export interface PersonContext {
  fullName: string;
  role?: string;
  seniority?: string;
  profileUrl?: string;
  company?: string;
}

export interface StrategicContext {
  latest_news: string[];
  competitors: string[];
  pain_points: string[];
  market_trends?: string[];
}

export interface ResearchResult {
  company: CompanyContext;
  person: PersonContext;
  strategic?: StrategicContext; // New field for smart insights
  role: string;
  confidence: number;
  citations?: Array<{
    uri: string;
    title?: string;
    description?: string;
  }>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
}

export interface GeminiSession {
  sendRealtimeInput: (input: any) => Promise<void>;
  sendToolResponse: (response: any) => Promise<void>;
  close: () => Promise<void>;
}
