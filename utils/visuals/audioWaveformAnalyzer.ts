/**
 * Audio Waveform Analyzer - Real-time audio visualization
 */

export class AudioWaveformAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private frequencyArray: Uint8Array<ArrayBuffer> | null = null;
  private bufferLength = 0;
  private frequencyBufferLength = 0;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();

      // Configure for time domain (oscilloscope)
      this.analyser.fftSize = 2048;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      // Configure for frequency domain (spectrum)
      this.analyser.fftSize = 256;
      this.frequencyBufferLength = this.analyser.frequencyBinCount;
      this.frequencyArray = new Uint8Array(this.frequencyBufferLength);

      // Reset to time domain as default
      this.analyser.fftSize = 2048;
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }

  connectAudioStream(stream: MediaStream): boolean {
    if (!this.audioContext || !this.analyser) {
      console.warn('Audio context not initialized');
      return false;
    }

    try {
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      return true;
    } catch (error) {
      console.error('Failed to connect audio stream:', error);
      return false;
    }
  }

  disconnectAudioStream() {
    if (this.source) {
      try {
        this.source.disconnect();
        this.source = null;
      } catch (error) {
        console.warn('Error disconnecting audio stream:', error);
      }
    }
  }

  getWaveformData(): number[] {
    if (!this.analyser || !this.dataArray) {
      return new Array(256).fill(0);
    }

    // Ensure we're in time domain mode
    if (this.analyser.fftSize !== 2048) {
      this.analyser.fftSize = 2048;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
    }

    this.analyser.getByteTimeDomainData(this.dataArray);

    // Convert to normalized values (-1 to 1)
    return Array.from(this.dataArray).map(val => (val - 128) / 128);
  }

  getFrequencyData(): number[] {
    if (!this.analyser || !this.frequencyArray) {
      return new Array(128).fill(0);
    }

    // Ensure we're in frequency domain mode
    if (this.analyser.fftSize !== 256) {
      this.analyser.fftSize = 256;
      this.frequencyBufferLength = this.analyser.frequencyBinCount;
      this.frequencyArray = new Uint8Array(this.frequencyBufferLength);
    }

    this.analyser.getByteFrequencyData(this.frequencyArray);

    // Return normalized values (0 to 1)
    return Array.from(this.frequencyArray).map(val => val / 255);
  }

  getRMSLevel(): number {
    const waveformData = this.getWaveformData();
    if (waveformData.length === 0) return 0;

    // Calculate RMS (Root Mean Square) for audio level
    const sum = waveformData.reduce((acc, val) => acc + val * val, 0);
    return Math.sqrt(sum / waveformData.length);
  }

  isActive(): boolean {
    return this.source !== null && this.audioContext?.state === 'running';
  }

  dispose() {
    this.disconnectAudioStream();
    if (this.audioContext) {
      this.audioContext.close().catch(console.warn);
      this.audioContext = null;
      this.analyser = null;
      this.dataArray = null;
      this.frequencyArray = null;
    }
  }
}

// Singleton instance
export const audioWaveformAnalyzer = new AudioWaveformAnalyzer();
