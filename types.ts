
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
  webSearchQueries?: string[];
  searchEntryPoint?: any;
}

export interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isFinal: boolean;
  reasoning?: string; // For Chain of Thought UI
  status?: 'streaming' | 'complete'; // For Shimmer UI
  attachment?: {
    type: 'image' | 'file' | 'research-card' | 'calendar_widget'; // Added research-card and calendar_widget
    url?: string; // base64 data url or blob url for UI, or booking URL for calendar_widget
    mimeType?: string;
    data?: string; // Raw base64 string for API or JSON string for research-card/calendar_widget
    name?: string;
  };
  groundingMetadata?: GroundingMetadata;
}

export type VisualShape = 'orb' | 'wave' | 'dna' | 'rect' | 'face' | 'planet' | 'heart' | 'grid' | 'atom' | 'hourglass' | 'shield' | 'star' | 'globe' | 'brain' | 'constellation' | 'weather' | 'chart' | 'map' | 'clock' | 'code' | 'text' | 'scanner' | 'vortex' | 'fireworks' | 'lightning' | 'flower' | 'discovery' | 'scoring' | 'workshop' | 'consulting' | 'closer' | 'summary' | 'proposal' | 'admin' | 'retargeting';

export interface VisualState {
  isActive: boolean;
  audioLevel: number; // 0.0 to 1.0
  mode: 'listening' | 'thinking' | 'speaking' | 'idle';
  shape: VisualShape;
  textContent?: string; // Dynamic text to render
  weatherData?: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
    temperature?: string;
  };
  chartData?: {
    trend: 'up' | 'down' | 'neutral';
    value?: string;
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
  // Metadata visualizations
  citationCount?: number; // Number of citations/sources
  reasoningComplexity?: number; // 0.0 to 1.0 based on reasoning length/complexity
  researchActive?: boolean; // Whether research queries are active
  sourceCount?: number; // Number of verified sources
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

