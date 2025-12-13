/**
 * Bloom Effect Renderer - Post-processing glow effects for particles
 */

export interface BloomSettings {
  enabled: boolean;
  intensity: number; // 0.0-2.0
  radius: number; // 4-16px
  threshold: number; // Brightness cutoff 0.0-1.0
}

export class BloomRenderer {
  private bloomCanvas: HTMLCanvasElement | null = null;
  private bloomCtx: CanvasRenderingContext2D | null = null;

  renderBloom(
    sourceCanvas: HTMLCanvasElement,
    targetCtx: CanvasRenderingContext2D,
    settings: BloomSettings
  ): void {
    if (!settings.enabled) return;

    // Create bloom canvas if needed
    if (!this.bloomCanvas) {
      this.bloomCanvas = document.createElement('canvas');
      this.bloomCanvas.width = sourceCanvas.width;
      this.bloomCanvas.height = sourceCanvas.height;
      this.bloomCtx = this.bloomCanvas.getContext('2d', { alpha: true });
    }

    if (!this.bloomCtx) return;

    const bloomCtx = this.bloomCtx;
    const { width, height } = sourceCanvas;

    // Step 1: Extract bright particles only (threshold)
    bloomCtx.clearRect(0, 0, width, height);
    bloomCtx.globalCompositeOperation = 'source-over';

    // Draw original canvas
    bloomCtx.drawImage(sourceCanvas, 0, 0);

    // Apply brightness threshold - darken everything below threshold
    bloomCtx.globalCompositeOperation = 'multiply';
    const threshold = 1 - settings.threshold;
    bloomCtx.fillStyle = `rgba(${threshold * 255}, ${threshold * 255}, ${threshold * 255}, 1)`;
    bloomCtx.fillRect(0, 0, width, height);

    // Boost brightness of remaining particles
    bloomCtx.globalCompositeOperation = 'screen';
    bloomCtx.filter = `brightness(${1 + settings.intensity})`;

    // Step 2: Apply gaussian blur for bloom effect
    this.applyGaussianBlur(bloomCtx, width, height, settings.radius);

    // Step 3: Composite back to target canvas
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.globalAlpha = 0.7; // Blend with original
    targetCtx.drawImage(this.bloomCanvas, 0, 0);
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.globalAlpha = 1.0;
  }

  private applyGaussianBlur(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    radius: number
  ): void {
    // Simple box blur approximation (multiple passes for gaussian-like effect)
    const passes = Math.max(1, Math.floor(radius / 2));
    const blurAmount = radius / passes;

    for (let i = 0; i < passes; i++) {
      ctx.filter = `blur(${blurAmount}px)`;
      // Re-draw the canvas onto itself to apply blur
      ctx.globalCompositeOperation = 'source-over';
      const imageData = ctx.getImageData(0, 0, width, height);
      ctx.putImageData(imageData, 0, 0);
    }

    ctx.filter = 'none';
  }

  dispose(): void {
    this.bloomCanvas = null;
    this.bloomCtx = null;
  }
}

// Singleton instance
export const bloomRenderer = new BloomRenderer();
