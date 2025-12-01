import { LiveClientWS } from 'src/core/live/client';
import { createPcmBlob, base64ToBytes, decodeAudioData } from '../utils/audioUtils';
import { LiveServiceConfig, TranscriptItem, ResearchResult } from 'types';
import { AppConfig } from '../config';
import { unifiedContext } from './unifiedContext';

// Audio Constants
const INPUT_SAMPLE_RATE = AppConfig.api.audio.inputSampleRate;
const OUTPUT_SAMPLE_RATE = AppConfig.api.audio.outputSampleRate;
const BUFFER_SIZE = AppConfig.api.audio.bufferSize;

export class GeminiLiveService {
  private liveClient: LiveClientWS | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;

  // Analysers for real-time visuals
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private analysisFrameId: number | null = null;

  // Context State
  private researchContext: ResearchResult | null = null;
  private location: { latitude: number; longitude: number } | null = null;

  private nextStartTime = 0;
  private config: LiveServiceConfig & { wsUrl?: string };
  private isConnected = false;
  private sessionId: string = '';
  private sessionStartTimeout: NodeJS.Timeout | null = null;

  constructor(config: LiveServiceConfig & { wsUrl?: string }) {
    this.config = config;
    // Initialize with existing session ID if available, or create new
    const snapshot = unifiedContext.getSnapshot();
    this.sessionId = snapshot.sessionId || 'session-' + Date.now();
    unifiedContext.setSessionId(this.sessionId);
  }

  // Allow updating config (e.g. model change)
  public setConfig(newConfig: Partial<LiveServiceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Set research context for personalized responses
   */
  public setResearchContext(research: ResearchResult | null) {
    this.researchContext = research;
  }

  /**
   * Set user location for location-aware queries
   */
  public setLocation(location: { latitude: number; longitude: number }) {
    this.location = location;
  }

  public async connect() {
    // Prevent duplicate connections - if already connecting or connected, return
    if (this.isConnected || this.liveClient) {
      console.warn('[GeminiLiveService] Already connected or connecting, skipping duplicate connect()');
      return;
    }

    // If audio contexts exist from previous connection, clean them up first
    await this.cleanupAudio();

    this.config.onStateChange('CONNECTING');

    try {
      // Initialize Audio Contexts - always create new ones after cleanup
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });

      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });

      // CRITICAL: Resume contexts on user gesture (Connect click)
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

      // Setup Output Chain
      this.outputNode = this.outputAudioContext.createGain();
      this.outputAnalyser = this.outputAudioContext.createAnalyser();
      this.outputAnalyser.fftSize = 128;
      this.outputAnalyser.smoothingTimeConstant = 0.05;

      this.outputNode.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputAudioContext.destination);

      // MOBILE UNLOCK: Play silent buffer to unlock audio on iOS/Android
      const warmUpBuffer = this.outputAudioContext.createBuffer(1, 1, OUTPUT_SAMPLE_RATE);
      const warmUpSource = this.outputAudioContext.createBufferSource();
      warmUpSource.buffer = warmUpBuffer;
      warmUpSource.connect(this.outputAudioContext.destination);
      warmUpSource.start(0);

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create LiveClientWS instance
      this.liveClient = new LiveClientWS();

      // Setup event listeners for Fly.io server events
      this.liveClient.on('connected', (connectionId) => {
        console.log('[GeminiLiveService] Connected to Fly.io server:', connectionId);

        const snapshot = unifiedContext.getSnapshot();
        const rc = snapshot.researchContext;

        // Start the Live API session AFTER we receive connectionId
        try {
          this.liveClient?.start({
            languageCode: 'en-US',
            voiceName: this.config.voiceName || 'Kore',
            sessionId: this.sessionId,
            ...(rc?.person?.fullName ? {
              userContext: {
                name: rc.person.fullName
              }
            } : {})
          });
        } catch (err) {
          console.error('[GeminiLiveService] Error calling start():', err);
        }
      });

      this.liveClient.on('start_ack', (payload) => {
        console.log('[GeminiLiveService] Start acknowledged:', payload);
        // Set timeout: if session_started doesn't arrive within 15s (reduced from 35s), something's wrong
        this.sessionStartTimeout = setTimeout(() => {
          console.error('[GeminiLiveService] Timeout: session_started not received within 15s after start_ack');
          this.config.onStateChange('ERROR');
          this.disconnect();
        }, 15000);
      });

      this.liveClient.on('session_started', (payload) => {
        console.log('[GeminiLiveService] Session started:', payload);
        // Clear timeout since we got session_started
        if (this.sessionStartTimeout) {
          clearTimeout(this.sessionStartTimeout);
          this.sessionStartTimeout = null;
        }
        this.isConnected = true;
        this.config.onStateChange('CONNECTED');
      });

      this.liveClient.on('input_transcript', (text, isFinal) => {
        this.config.onTranscript(text, true, isFinal);
        if (isFinal) {
          unifiedContext.addTranscriptItem({
            id: crypto.randomUUID(),
            role: 'user',
            text,
            timestamp: new Date(),
            isFinal: true
          });
        }
      });

      this.liveClient.on('output_transcript', (text, isFinal) => {
        this.config.onTranscript(text, false, isFinal);
        if (isFinal) {
          unifiedContext.addTranscriptItem({
            id: crypto.randomUUID(),
            role: 'model',
            text,
            timestamp: new Date(),
            isFinal: true
          });
        }
      });

      this.liveClient.on('audio', async (audioData, mimeType) => {
        if (audioData && mimeType) {
          await this.playAudio(audioData, mimeType);
        }
      });

      // NEW: Listen for stage updates to trigger agent-specific animations
      this.liveClient.on('stage_update', (payload: any) => {
        console.log('[GeminiLiveService] Stage update from server:', payload);
        // Forward agent metadata to transcript handler for shape changes
        if (this.config.onTranscript && payload) {
          const agentMetadata = {
            agent: payload.agent,
            stage: payload.stage
          };
          // Trigger a synthetic transcript update with agent metadata
          // This will cause the handleTranscript callback to update visual state
          this.config.onTranscript('', false, true, undefined, agentMetadata);
        }
      });

      this.liveClient.on('tool_call', async (payload) => {
        console.log('[GeminiLiveService] Tool call from server:', payload);
        if (this.config.onToolCall) {
          const results = await this.config.onToolCall(payload.functionCalls || []);
          console.log('[GeminiLiveService] Tool results:', results);

          // CRITICAL: Send results back to server
          if (results && results.length > 0) {
            this.liveClient?.sendToolResponse(results);
          }
        }
      });

      this.liveClient.on('error', (error) => {
        console.error('[GeminiLiveService] Error:', error);
        this.config.onStateChange('ERROR');
      });

      this.liveClient.on('close', (reason) => {
        console.log('[GeminiLiveService] Connection closed:', reason);
        this.isConnected = false;
        this.config.onStateChange('DISCONNECTED');
      });

      // Connect to Fly.io WebSocket server
      this.liveClient.connect();

      // Setup Input Processing & Analysis
      this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
      this.inputAnalyser = this.inputAudioContext.createAnalyser();
      this.inputAnalyser.fftSize = 128; // Faster visual response
      this.inputAnalyser.smoothingTimeConstant = 0.1;

      this.processor = this.inputAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

      this.inputSource.connect(this.inputAnalyser); // For visuals
      this.inputAnalyser.connect(this.processor); // For processing
      this.processor.connect(this.inputAudioContext.destination);

      // CRITICAL: Only start sending audio AFTER session_started is received
      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.liveClient) {
          return;
        }
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData, INPUT_SAMPLE_RATE);

        if (pcmBlob.mimeType && pcmBlob.data) {
          this.liveClient.sendRealtimeInput([{
            mimeType: pcmBlob.mimeType,
            data: pcmBlob.data
          }]);
        }
      };

      // Start analysis loop for visuals
      this.startAnalysisLoop();

    } catch (err) {
      console.error("Connection failed", err);
      this.config.onStateChange('ERROR');
      this.disconnect();
    }
  }

  // Send Context from Standard Chat History + optional metadata
  public async sendContext(
    history: TranscriptItem[],
    opts?: {
      location?: { latitude: number; longitude: number };
      research?: ResearchResult | null;
      intelligenceContext?: any;
    }
  ): Promise<void> {
    if (!this.liveClient) {
      console.warn('[GeminiLiveService] Cannot send context: not connected');
      return;
    }

    // Filter and format transcript for server
    const contextMessages = history
      .filter(item => item.text && !item.text.startsWith('[System:'))
      .slice(-20) // Last 20 messages
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        content: item.text,
        timestamp: item.timestamp.toISOString(),
      }));

    // Send via intelligence modality context update
    const location = opts?.location || this.location;
    const research = opts?.research || this.researchContext;

    this.liveClient.sendContextUpdate({
      sessionId: this.sessionId,
      modality: 'intelligence',
      analysis: `Conversation history: ${contextMessages.length} messages`,
      capturedAt: Date.now(),
      metadata: {
        transcript: contextMessages,
        ...(location ? { location } : {}),
        ...(research ? { research } : {}),
        ...(opts?.intelligenceContext ? { intelligenceContext: opts.intelligenceContext } : {})
      }
    });
  }

  public sendText(text: string) {
    if (!this.liveClient || !this.isConnected) return;
    this.liveClient.sendText(text);
    // Add to unified context immediately
    unifiedContext.addTranscriptItem({
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
      isFinal: true
    });
  }

  public sendRealtimeMedia(media: { mimeType: string; data: string }) {
    if (!this.liveClient || !this.isConnected) return;
    this.liveClient.sendRealtimeInput([{
      mimeType: media.mimeType,
      data: media.data
    }]);
  }

  public setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    unifiedContext.setSessionId(sessionId);
  }

  public async sendVideo(frameData: Blob) {
    // Send video frame to Fly.io server
    if (!this.liveClient) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) {
        const base64data = result.split(',')[1];
        if (base64data) {
          this.liveClient?.sendContextUpdate({
            sessionId: this.sessionId,
            modality: 'webcam',
            analysis: 'Video frame from webcam',
            ...(base64data ? { imageData: base64data } : {}),
            capturedAt: Date.now()
          });
        }
      }
    };
    reader.readAsDataURL(frameData);
  }

  private async cleanupAudio() {
    if (this.inputAudioContext) {
      await this.inputAudioContext.close().catch(() => { });
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      await this.outputAudioContext.close().catch(() => { });
      this.outputAudioContext = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.outputNode && typeof this.outputNode.disconnect === 'function') {
      this.outputNode.disconnect();
      this.outputNode = null;
    }
    if (this.outputAnalyser && typeof this.outputAnalyser.disconnect === 'function') {
      this.outputAnalyser.disconnect();
      this.outputAnalyser = null;
    }
  }

  public async disconnect() {
    this.isConnected = false;
    this.stopAnalysisLoop();

    if (this.sessionStartTimeout) {
      clearTimeout(this.sessionStartTimeout);
      this.sessionStartTimeout = null;
    }

    await this.cleanupAudio();

    this.liveClient?.disconnect();
    this.liveClient = null;

    this.config.onStateChange('DISCONNECTED');
  }

  // Audio playback
  private async playAudio(audioData: string, _mimeType: string) {
    if (!this.outputAudioContext || !this.outputNode) return;

    try {
      // Decode base64 audio data
      const bytes = base64ToBytes(audioData);
      const audioBuffer = await decodeAudioData(bytes, this.outputAudioContext, OUTPUT_SAMPLE_RATE);

      // Schedule playback
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);

      const now = this.outputAudioContext.currentTime;
      const startTime = Math.max(now, this.nextStartTime);
      source.start(startTime);

      this.nextStartTime = startTime + audioBuffer.duration;
    } catch (err) {
      console.error('[GeminiLiveService] Audio playback error:', err);
    }
  }

  // Visual analysis
  private startAnalysisLoop() {
    const analyze = () => {
      if (!this.isConnected) return;

      // Input analysis
      let inputVolume = 0;
      if (this.inputAnalyser) {
        const dataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(dataArray);
        inputVolume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;
      }

      // Output analysis
      let outputVolume = 0;
      if (this.outputAnalyser) {
        const dataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(dataArray);
        outputVolume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;
      }

      this.config.onVolumeChange(inputVolume, outputVolume);
      this.analysisFrameId = requestAnimationFrame(analyze);
    };

    this.analysisFrameId = requestAnimationFrame(analyze);
  }

  private stopAnalysisLoop() {
    if (this.analysisFrameId !== null) {
      cancelAnimationFrame(this.analysisFrameId);
      this.analysisFrameId = null;
    }
  }

  // Getters for state
  public getInputVolume(): number[] {
    if (!this.inputAnalyser) return [];
    const dataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);
    this.inputAnalyser.getByteFrequencyData(dataArray);
    return Array.from(dataArray).map(v => v / 255);
  }

  public getOutputVolume(): number[] {
    if (!this.outputAnalyser) return [];
    const dataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
    this.outputAnalyser.getByteFrequencyData(dataArray);
    return Array.from(dataArray).map(v => v / 255);
  }
}
