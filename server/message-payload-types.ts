/**
 * Type definitions for WebSocket message payloads in live-server.ts
 * Replaces 'any' types in handler functions for better type safety
 */

export interface ToolResultPayload {
  responses: Array<{
    id: string;
    name: string;
    response: unknown;
  }>;
}

export interface RealtimeInputPayload {
  chunks: Array<{
    mimeType: string;
    data: string;
  }>;
}

export interface ContextUpdatePayload {
  modality: string;
  analysis?: string;
  imageData?: string;
  capturedAt?: number;
  sessionId?: string;
  metadata?: {
    location?: { latitude: number; longitude: number; city?: string; country?: string };
    research?: any;
    intelligenceContext?: any;
    transcript?: Array<{ role: string; content: string; timestamp: string }>;
  };
}

export interface StartPayload {
  languageCode?: string;
  voiceName?: string;
  sessionId?: string;
  userContext?: {
    name?: string;
    email?: string;
  };
  locationData?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
}

export interface UserAudioPayload {
  audioData: string;
  mimeType: string;
}

