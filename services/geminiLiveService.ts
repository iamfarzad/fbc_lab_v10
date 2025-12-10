import { LiveClientWS } from 'src/core/live/client';
import { createPcmBlob, base64ToBytes, decodeAudioData } from '../utils/audioUtils';
import { LiveServiceConfig, TranscriptItem, ResearchResult } from 'types';
import { AppConfig } from '../config';
import { unifiedContext } from './unifiedContext';
import { logger } from 'src/lib/logger'

// Audio Constants
const INPUT_SAMPLE_RATE = AppConfig.api.audio.inputSampleRate;
const OUTPUT_SAMPLE_RATE = AppConfig.api.audio.outputSampleRate;
// BUFFER_SIZE removed - was unused

// Rate Limiter Implementation
class RateLimiter {
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly WINDOW_MS = 60000;
  private readonly MAX_REQUESTS = 10;

  checkLimit(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest > this.WINDOW_MS) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    this.requestCount++;

    if (this.requestCount > this.MAX_REQUESTS) {
      return {
        allowed: false,
        reason: `Rate limit exceeded (${this.MAX_REQUESTS} requests per ${this.WINDOW_MS / 1000}s)`
      };
    }

    return { allowed: true };
  }
}

export class GeminiLiveService {
  private liveClient: LiveClientWS | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | AudioWorkletNode | null = null;
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
  private isSessionReady = false; // Track session ready state
  private sessionId: string = '';
  private sessionStartTimeout: NodeJS.Timeout | null = null;
  private rateLimiter = new RateLimiter(); // Initialize rate limiter
  private pendingMediaQueue: Array<{ mimeType: string; data: string }> = []; // Queue media until session ready
  private pendingContextQueue: Array<{
    sessionId?: string;
    modality: 'screen' | 'webcam' | 'intelligence';
    analysis: string;
    imageData?: string;
    capturedAt?: number;
    metadata?: Record<string, unknown>;
  }> = []; // Queue context updates until session ready

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
    // If connected, push the new context immediately
    if (this.isConnected && this.isSessionReady) {
      this.sendContext([], { research });
    }
  }

  /**
   * Set user location for location-aware queries
   */
  public setLocation(location: { latitude: number; longitude: number }) {
    this.location = location;
  }

  public async connect() {
    logger.debug('[GeminiLiveService] connect() called', {
      isConnected: this.isConnected,
      hasLiveClient: !!this.liveClient,
      hasInputAudioContext: !!this.inputAudioContext,
      hasOutputAudioContext: !!this.outputAudioContext
    });

    // Prevent duplicate connections - if already connecting or connected, return
    if (this.isConnected || this.liveClient) {
      console.warn('[GeminiLiveService] Already connected or connecting, skipping duplicate connect()');
      return;
    }

    // If audio contexts exist from previous connection, clean them up first
    await this.cleanupAudio();
    logger.debug('[GeminiLiveService] Audio cleanup complete');

    this.config.onStateChange('CONNECTING');
    logger.debug('[GeminiLiveService] State changed to CONNECTING');

    try {
      // Initialize Audio Contexts - always create new ones after cleanup
      logger.debug('[GeminiLiveService] Creating audio contexts...');
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });
      logger.debug('[GeminiLiveService] Input audio context created', {
        state: this.inputAudioContext.state,
        sampleRate: this.inputAudioContext.sampleRate
      });

      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
      logger.debug('[GeminiLiveService] Output audio context created', {
        state: this.outputAudioContext.state,
        sampleRate: this.outputAudioContext.sampleRate
      });

      // CRITICAL: Resume contexts on user gesture (Connect click)
      if (this.inputAudioContext.state === 'suspended') {
        logger.debug('[GeminiLiveService] Resuming suspended input audio context');
        await this.inputAudioContext.resume();
      }
      if (this.outputAudioContext.state === 'suspended') {
        logger.debug('[GeminiLiveService] Resuming suspended output audio context');
        await this.outputAudioContext.resume();
      }
      logger.debug('[GeminiLiveService] Audio contexts ready', {
        inputState: this.inputAudioContext.state,
        outputState: this.outputAudioContext.state
      });

      // Setup Output Chain
      this.outputNode = this.outputAudioContext.createGain();
      this.outputAnalyser = this.outputAudioContext.createAnalyser();
      this.outputAnalyser.fftSize = 256; // Increased for better frequency resolution
      this.outputAnalyser.smoothingTimeConstant = 0.3; // Smoother visual response
      this.outputAnalyser.minDecibels = -90;
      this.outputAnalyser.maxDecibels = -10;

      this.outputNode.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputAudioContext.destination);

      // MOBILE UNLOCK: Play silent buffer to unlock audio on iOS/Android
      const warmUpBuffer = this.outputAudioContext.createBuffer(1, 1, OUTPUT_SAMPLE_RATE);
      const warmUpSource = this.outputAudioContext.createBufferSource();
      warmUpSource.buffer = warmUpBuffer;
      warmUpSource.connect(this.outputAudioContext.destination);
      warmUpSource.start(0);

      // Get Microphone Stream
      logger.debug('[GeminiLiveService] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      logger.debug('[GeminiLiveService] Microphone stream obtained', {
        tracks: stream.getTracks().length,
        trackStates: stream.getTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState }))
      });

      // Create LiveClientWS instance
      logger.debug('[GeminiLiveService] Creating LiveClientWS instance...');
      this.liveClient = new LiveClientWS();
      logger.debug('[GeminiLiveService] LiveClientWS instance created');

      // Setup event listeners for Fly.io server events
      this.liveClient.on('connected', (connectionId) => {
        logger.debug('[GeminiLiveService] ✅ WebSocket CONNECTED to server', { 
          connectionId,
          timestamp: new Date().toISOString()
        });

        const snapshot = unifiedContext.getSnapshot();
        const rc = snapshot.researchContext;
        const ic = snapshot.intelligenceContext;

        // Start the Live API session AFTER we receive connectionId
        // Pass full user context including name, email, and location for personalization
        try {
          const userContext: { name?: string; email?: string } = {};
          if (rc?.person?.fullName) {
            userContext.name = rc.person.fullName;
          }
          // Email might be in intelligenceContext.email (from lead research) or passed directly
          if (ic?.email) {
            userContext.email = ic.email as string;
          }
          
          // Get location from unified context or instance variable
          const locationToSend = this.location || snapshot.location;
          const locationData = locationToSend ? {
            latitude: locationToSend.latitude,
            longitude: locationToSend.longitude,
            // City/country would need reverse geocoding - for now just coords
          } : undefined;
          
          this.liveClient?.start({
            languageCode: 'en-US',
            voiceName: this.config.voiceName || 'Kore',
            sessionId: this.sessionId,
            ...(Object.keys(userContext).length > 0 ? { userContext } : {}),
            ...(locationData ? { locationData } : {})
          });
          
          if (locationData) {
            logger.debug('[GeminiLiveService] Sent location with start:', locationData);
          }
        } catch (err) {
          console.error('[GeminiLiveService] Error calling start():', err);
        }
      });

      this.liveClient.on('start_ack', (payload) => {
        logger.debug('[GeminiLiveService] Start acknowledged:', payload);
        // Set timeout: if session_started doesn't arrive within 20s, emit warning but don't disconnect
        this.sessionStartTimeout = setTimeout(() => {
          console.warn('[GeminiLiveService] Warning: session_started not received within 20s after start_ack');
          // Don't disconnect - the session may still connect. Emit CONNECTING state to indicate ongoing attempt.
          if (!this.isSessionReady) {
            logger.warn('[GeminiLiveService] Session still not ready after timeout - keeping connection attempt alive');
          }
        }, 20000);
      });

      // Fallback: Listen for session_ready if session_started doesn't fire
      this.liveClient.on('setup_complete' as any, () => {
        logger.debug('[GeminiLiveService] Setup complete received');
        // If session_started wasn't received but setup_complete was, treat as connected
        if (!this.isSessionReady && this.isConnected === false) {
          logger.debug('[GeminiLiveService] Using setup_complete as fallback for session_started');
          if (this.sessionStartTimeout) {
            clearTimeout(this.sessionStartTimeout);
            this.sessionStartTimeout = null;
          }
          this.isConnected = true;
          this.isSessionReady = true;
          this.flushPendingMedia();
          this.config.onStateChange('CONNECTED');
        }
      });

      this.liveClient.on('session_started', (payload) => {
        logger.debug('[GeminiLiveService] ✅ SESSION STARTED', { 
          payload,
          timestamp: new Date().toISOString()
        });
        // Clear timeout since we got session_started
        if (this.sessionStartTimeout) {
          clearTimeout(this.sessionStartTimeout);
          this.sessionStartTimeout = null;
        }
        this.isConnected = true;
        this.isSessionReady = true; // Mark session as ready
        logger.debug('[GeminiLiveService] Session marked as ready', {
          isConnected: this.isConnected,
          isSessionReady: this.isSessionReady
        });
        
        // Small delay before flushing to ensure backend has session in activeSessions
        // This prevents race condition where frames arrive before backend is ready
        setTimeout(() => {
          // Flush any queued media and context updates that were sent before session was ready
          logger.debug('[GeminiLiveService] Flushing queued media and context...');
          this.flushPendingMedia();
          this.flushPendingContext();
        }, 200); // 200ms delay to ensure backend session is registered
        
        this.config.onStateChange('CONNECTED');
        logger.debug('[GeminiLiveService] ✅ State changed to CONNECTED');
      });

      this.liveClient.on('input_transcript', (text, isFinal) => {
        console.log('🔵 [GeminiLiveService] INPUT_TRANSCRIPT EVENT RECEIVED', { 
          text: text?.substring(0, 100), 
          isFinal, 
          hasCallback: !!this.config.onTranscript,
          fullLength: text?.length 
        });
        logger.debug('[GeminiLiveService] Received input_transcript', { text, isFinal, hasCallback: !!this.config.onTranscript });
        // onTranscript callback updates React state, which syncs to unifiedContext via useChatSession
        if (this.config.onTranscript) {
          console.log('🔵 [GeminiLiveService] Calling onTranscript callback for INPUT', { text: text?.substring(0, 50) });
          this.config.onTranscript(text, true, isFinal);
        } else {
          console.error('🔴 [GeminiLiveService] onTranscript callback NOT SET for input!');
          logger.warn('[GeminiLiveService] onTranscript callback not set!');
        }
        // Removed duplicate unifiedContext.addTranscriptItem() - handled by handleTranscriptUpdate
      });

      this.liveClient.on('output_transcript', (text, isFinal) => {
        console.log('🟢 [GeminiLiveService] OUTPUT_TRANSCRIPT EVENT RECEIVED', { 
          text: text?.substring(0, 100), 
          isFinal, 
          hasCallback: !!this.config.onTranscript,
          fullLength: text?.length 
        });
        logger.debug('[GeminiLiveService] Received output_transcript', { text, isFinal, hasCallback: !!this.config.onTranscript });
        // onTranscript callback updates React state, which syncs to unifiedContext via useChatSession
        if (this.config.onTranscript) {
          console.log('🟢 [GeminiLiveService] Calling onTranscript callback for OUTPUT', { text: text?.substring(0, 50) });
          this.config.onTranscript(text, false, isFinal);
        } else {
          console.error('🔴 [GeminiLiveService] onTranscript callback NOT SET for output!');
          logger.warn('[GeminiLiveService] onTranscript callback not set!');
        }
        // Removed duplicate unifiedContext.addTranscriptItem() - handled by handleTranscriptUpdate
      });

      this.liveClient.on('audio', (audioData, mimeType) => {
        if (audioData && mimeType) {
          this.playAudio(audioData, mimeType);
        }
      });

      // NEW: Listen for stage updates to trigger agent-specific animations
      this.liveClient.on('stage_update', (payload: any) => {
        logger.debug('[GeminiLiveService] Stage update from server:', payload as Record<string, unknown>);
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

      this.liveClient.on('tool_call', (payload) => {
        void (async () => {
          logger.debug('[GeminiLiveService] Tool call from server:', payload as Record<string, unknown>);
          if (this.config.onToolCall) {
            const results = await this.config.onToolCall((payload.functionCalls || []) as any[]);
            logger.debug('[GeminiLiveService] Tool results:', results);

            // CRITICAL: Send results back to server
            if (results && results.length > 0) {
              this.liveClient?.sendToolResponse(results);
            }
          }
        })();
      });

      this.liveClient.on('error', (error) => {
        // Rate limit errors are expected during high audio activity - log as debug, not error
        const errorStr = typeof error === 'string' ? error : String(error);
        if (errorStr.includes('Rate limit exceeded') || errorStr.includes('RATE_LIMIT_EXCEEDED')) {
          logger.debug('[GeminiLiveService] Rate limit warning (expected during high audio activity)', { error: errorStr });
          return; // Don't change state for rate limit errors - they're expected
        }
        console.error('[GeminiLiveService] Error:', error);
        this.config.onStateChange('ERROR');
      });

      this.liveClient.on('close', (reason) => {
        logger.debug('[GeminiLiveService] Connection closed:', { reason });
        this.isConnected = false;
        this.config.onStateChange('DISCONNECTED');
      });

      // Connect to Fly.io WebSocket server
      logger.debug('[GeminiLiveService] Connecting WebSocket...');
      this.liveClient.connect();
      logger.debug('[GeminiLiveService] WebSocket connect() called');

      // Setup Input Processing & Analysis (optional - connection can work without it)
      try {
        logger.debug('[GeminiLiveService] Setting up audio processing...', {
          hasInputAudioContext: !!this.inputAudioContext,
          hasStream: !!stream,
          streamTracks: stream?.getTracks().length
        });
        
        if (!this.inputAudioContext) {
          logger.error('[GeminiLiveService] Input audio context is null!');
          throw new Error('Audio context not initialized');
        }
        
        if (!stream) {
          logger.error('[GeminiLiveService] Stream is null!');
          throw new Error('Microphone stream not available');
        }
        
        logger.debug('[GeminiLiveService] Creating media stream source...');
        this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
        logger.debug('[GeminiLiveService] Media stream source created');
        this.inputAnalyser = this.inputAudioContext.createAnalyser();
        this.inputAnalyser.fftSize = 256; // Increased for better frequency resolution
        this.inputAnalyser.smoothingTimeConstant = 0.3; // Smoother visual response
        this.inputAnalyser.minDecibels = -90;
        this.inputAnalyser.maxDecibels = -10;

        // Load AudioWorklet module with fallback to ScriptProcessorNode
        let useWorklet = true;
        try {
          await this.inputAudioContext.audioWorklet.addModule('/audio-processor.js');
        } catch (e) {
          console.error('Failed to load audio worklet, falling back to ScriptProcessor', e);
          useWorklet = false;
        }

        if (useWorklet) {
          // Modern AudioWorklet path
          this.processor = new AudioWorkletNode(this.inputAudioContext, 'audio-recorder-worklet');
          
          // Connect audio graph: source -> analyser -> processor -> destination
          this.inputSource.connect(this.inputAnalyser); // For visuals (must be before processor)
          this.inputAnalyser.connect(this.processor); // For processing
          this.processor.connect(this.inputAudioContext.destination);
          
          // CRITICAL: Only start sending audio AFTER session_started is received
          (this.processor as AudioWorkletNode).port.onmessage = (event: MessageEvent) => {
            if (!this.isConnected || !this.liveClient) {
              return;
            }
          
          const inputData = event.data.audioData; // Float32Array from worklet
          if (!inputData) return;

          const pcmBlob = createPcmBlob(inputData, INPUT_SAMPLE_RATE);

          if (pcmBlob.mimeType && pcmBlob.data) {
            this.liveClient.sendRealtimeInput([{
              mimeType: pcmBlob.mimeType,
              data: pcmBlob.data
            }]);
          }
        };
      } else {
        // Fallback to deprecated but widely supported ScriptProcessorNode
        const BUFFER_SIZE = 4096;
        this.processor = this.inputAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
        
        // Connect audio graph for ScriptProcessor
        this.inputSource.connect(this.inputAnalyser);
        this.inputAnalyser.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
        
        (this.processor as ScriptProcessorNode).onaudioprocess = (event: AudioProcessingEvent) => {
          if (!this.isConnected || !this.liveClient) return;
          
          const inputData = event.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData, INPUT_SAMPLE_RATE);
          
          if (pcmBlob.mimeType && pcmBlob.data) {
            this.liveClient.sendRealtimeInput([{
              mimeType: pcmBlob.mimeType,
              data: pcmBlob.data
            }]);
          }
        };
        
        logger.debug('[GeminiLiveService] Using ScriptProcessorNode fallback for audio');
      }

      // Start analysis loop for visuals
      this.startAnalysisLoop();
    } catch (audioErr) {
        // Audio processing failed, but connection can still work for transcripts
        logger.warn('[GeminiLiveService] Audio processing setup failed, continuing without audio processing', {
          error: audioErr instanceof Error ? audioErr.message : String(audioErr)
        });
        // Don't throw - allow connection to proceed for text/transcript functionality
        // The WebSocket connection is already established, so transcripts can still flow
      }
    } catch (err) {
      console.error("Connection failed", err);
      this.config.onStateChange('ERROR');
      void this.disconnect();
    }
  }

  // Send Context from Standard Chat History + optional metadata
  public sendContext(
    history: TranscriptItem[],
    opts?: {
      location?: { latitude: number; longitude: number };
      research?: ResearchResult | null;
      intelligenceContext?: any;
    }
  ): void {
    if (!this.liveClient || !this.isConnected) {
      console.warn('[GeminiLiveService] Cannot send context: not connected');
      return;
    }

    if (!this.isSessionReady) {
        console.warn('[GeminiLiveService] Context update blocked: Session not ready');
        return;
    }

    // Rate Limit Check
    const limit = this.rateLimiter.checkLimit();
    if (!limit.allowed) {
        console.warn('[GeminiLiveService] Context update blocked:', limit.reason);
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
    if (!this.isSessionReady) {
        console.warn('[GeminiLiveService] Text blocked: Session not ready');
        return;
    }
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
    // CRITICAL FIX: Allow queuing even if not fully connected (client exists = connection in progress)
    // Only require liveClient to exist - if it exists, we can queue frames
    if (!this.liveClient) {
      logger.debug('[GeminiLiveService] Cannot send media - no client', {
        hasClient: false
      });
      return;
    }
    
    // Queue if session not ready (allows queuing during CONNECTING state)
    if (!this.isSessionReady) {
        // Queue media until session is ready (unified multimodal stream - frames will be sent together)
        this.pendingMediaQueue.push(media);
        logger.debug(`[GeminiLiveService] Queued media frame (${this.pendingMediaQueue.length} in queue)`, {
          mimeType: media.mimeType,
          dataSize: media.data.length,
          isConnected: this.isConnected,
          isSessionReady: this.isSessionReady
        });
        return;
    }
    
    // Only check isConnected when actually sending (not queuing)
    if (!this.isConnected) {
      logger.debug('[GeminiLiveService] Cannot send media - not connected', {
        isConnected: this.isConnected,
        isSessionReady: this.isSessionReady
      });
      return;
    }
    // Send immediately as part of unified multimodal stream
    // Per Gemini 3 best practices: treat inputs (text + images/audio/video) as a single stream
    logger.debug(`[GeminiLiveService] Sending real-time media (unified multimodal stream)`, {
      mimeType: media.mimeType,
      dataSize: media.data.length
    });
    this.liveClient.sendRealtimeInput([{
      mimeType: media.mimeType,
      data: media.data
    }]);
  }

  public sendContextUpdate(update: {
    sessionId?: string;
    modality: 'screen' | 'webcam' | 'intelligence';
    analysis: string;
    imageData?: string;
    capturedAt?: number;
    metadata?: Record<string, unknown>;
  }): void {
    // CRITICAL FIX: Allow queuing even if not fully connected (client exists = connection in progress)
    if (!this.liveClient) return;
    
    // Queue if session not ready (allows queuing during CONNECTING state)
    if (!this.isSessionReady) {
      // Queue context update until session is ready
      this.pendingContextQueue.push(update);
      logger.debug(`[GeminiLiveService] Queued context update (${this.pendingContextQueue.length} in queue)`, {
        modality: update.modality,
        isConnected: this.isConnected,
        isSessionReady: this.isSessionReady
      });
      return;
    }
    
    // Only check isConnected when actually sending (not queuing)
    if (!this.isConnected) {
      logger.debug('[GeminiLiveService] Cannot send context update - not connected');
      return;
    }
    this.liveClient.sendContextUpdate({
      sessionId: this.sessionId,
      ...update
    });
  }

  /**
   * Get connection ID from Live Client
   */
  public getConnectionId(): string | null {
    return this.liveClient?.getConnectionId() || null;
  }

  /**
   * Check if session is ready for sending data
   */
  public getIsSessionReady(): boolean {
    return this.isSessionReady;
  }

  /**
   * Wait for the session to be ready (with timeout)
   * @param timeoutMs Maximum time to wait (default 10 seconds)
   */
  public async waitForSessionReady(timeoutMs: number = 10000): Promise<boolean> {
    if (this.isSessionReady) return true;
    
    const startTime = Date.now();
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.isSessionReady) {
          resolve(true);
          return;
        }
        if (Date.now() - startTime > timeoutMs) {
          console.warn('[GeminiLiveService] Timeout waiting for session ready');
          resolve(false);
          return;
        }
        setTimeout(checkReady, 100);
      };
      checkReady();
    });
  }

  /**
   * Flush any media that was queued before session was ready
   * Sends ALL queued frames to ensure no frames are lost
   */
  private flushPendingMedia(): void {
    if (this.pendingMediaQueue.length === 0) {
      logger.debug('[GeminiLiveService] No queued media to flush');
      return;
    }
    
    logger.debug(`[GeminiLiveService] Flushing ${this.pendingMediaQueue.length} queued media items (unified multimodal stream)`);
    
    // Per Gemini 3 best practices: Send all queued frames as unified multimodal stream
    // Treat inputs (text + images/audio/video) as a single stream, not siloed analyses
    const framesToSend = [...this.pendingMediaQueue];
    this.pendingMediaQueue = [];
    
    if (framesToSend.length > 0 && this.liveClient) {
      // Send frames in batches to avoid overwhelming the connection
      // But ensure they're all sent as part of the unified stream
      const BATCH_SIZE = 10;
      let batchIndex = 0;
      
      const sendBatch = () => {
        if (batchIndex >= framesToSend.length) {
          logger.debug(`[GeminiLiveService] ✅ Flushed all ${framesToSend.length} queued frames (unified multimodal stream)`);
          return;
        }
        
        const batch = framesToSend.slice(batchIndex, batchIndex + BATCH_SIZE);
        // Send batch as unified multimodal input (per Gemini 3 best practices)
        this.liveClient!.sendRealtimeInput(
          batch.map(m => ({ mimeType: m.mimeType, data: m.data }))
        );
        logger.debug(`[GeminiLiveService] Sent unified multimodal batch ${Math.floor(batchIndex / BATCH_SIZE) + 1}/${Math.ceil(framesToSend.length / BATCH_SIZE)} (${batch.length} frames)`, {
          mimeTypes: batch.map(m => m.mimeType),
          totalFrames: framesToSend.length
        });
        
        batchIndex += BATCH_SIZE;
        
        // Small delay between batches to avoid flooding (but keep them as unified stream)
        if (batchIndex < framesToSend.length) {
          setTimeout(sendBatch, 50);
        } else {
          logger.debug(`[GeminiLiveService] ✅ Flushed all ${framesToSend.length} queued frames (unified multimodal stream)`);
        }
      };
      
      sendBatch();
    } else {
      logger.warn('[GeminiLiveService] Cannot flush media - no client or no frames', {
        hasClient: !!this.liveClient,
        frameCount: framesToSend.length
      });
    }
  }

  /**
   * Flush any context updates that were queued before session was ready
   * Sends ALL queued context updates to ensure no context is lost
   */
  private flushPendingContext(): void {
    if (this.pendingContextQueue.length === 0) return;
    
    logger.debug(`[GeminiLiveService] Flushing ${this.pendingContextQueue.length} queued context updates`);
    
    // Send ALL queued context updates
    const updatesToSend = [...this.pendingContextQueue];
    this.pendingContextQueue = [];
    
    if (updatesToSend.length > 0 && this.liveClient) {
      updatesToSend.forEach((update, index) => {
        this.liveClient!.sendContextUpdate({
          sessionId: this.sessionId,
          ...update
        });
        logger.debug(`[GeminiLiveService] Sent queued context update ${index + 1}/${updatesToSend.length} (modality: ${update.modality})`);
      });
      logger.debug(`[GeminiLiveService] Flushed all ${updatesToSend.length} queued context updates`);
    }
  }

  public setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    unifiedContext.setSessionId(sessionId);
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
      if ((this.processor as AudioWorkletNode).port) {
        (this.processor as AudioWorkletNode).port.onmessage = null;
      }
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
  private playAudio(audioData: string, _mimeType: string) {
    if (!this.outputAudioContext || !this.outputNode) return;

    try {
      // Decode base64 audio data
      const bytes = base64ToBytes(audioData);
      const audioBuffer = decodeAudioData(bytes, this.outputAudioContext, OUTPUT_SAMPLE_RATE);

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
      // Continue analysis even if not fully connected (for visual feedback during connection)
      // Only stop if explicitly disconnected
      if (this.isConnected === false && !this.inputAnalyser && !this.outputAnalyser) {
        return;
      }

      // Input analysis
      let inputVolume = 0;
      if (this.inputAnalyser) {
        const dataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(dataArray);
        // Calculate RMS (Root Mean Square) for more accurate volume representation
        const sumSquares = dataArray.reduce((sum, val) => sum + (val / 255) ** 2, 0);
        inputVolume = Math.sqrt(sumSquares / dataArray.length);
      }

      // Output analysis
      let outputVolume = 0;
      if (this.outputAnalyser) {
        const dataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(dataArray);
        // Calculate RMS for output as well
        const sumSquares = dataArray.reduce((sum, val) => sum + (val / 255) ** 2, 0);
        outputVolume = Math.sqrt(sumSquares / dataArray.length);
      }

      // Always call onVolumeChange to keep visual state updated
      if (this.config.onVolumeChange) {
        this.config.onVolumeChange(inputVolume, outputVolume);
      }
      
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
