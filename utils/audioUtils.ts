
import type { Blob } from '@google/genai';

/**
 * Converts a Base64 string to a Uint8Array.
 * Optimized for binary data handling.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

/**
 * Decodes raw PCM data into an AudioBuffer for playback.
 * Handles 16-bit Int PCM conversion to 32-bit Float AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
      const index = i * numChannels + channel;
      const value = dataInt16[index];
      if (value !== undefined) {
        channelData[i] = value / 32768.0;
      }
    }
  }
  return buffer;
}

/**
 * Converts Float32 audio data (from microphone) to Int16 PCM Blob (for Gemini API).
 * Includes signal clamping to prevent distortion.
 */
export function createPcmBlob(data: Float32Array, sampleRate: number = 16000): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  
  for (let i = 0; i < l; i++) {
    const value = data[i];
    if (value !== undefined) {
      // Hard clamp to [-1, 1] to prevent wrapping artifacts
      const s = Math.max(-1, Math.min(1, value));
      // Convert to 16-bit integer range
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  }
  
  return {
    data: bytesToBase64(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}