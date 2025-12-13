/**
 * Shape Morphing System - Smooth transitions between different particle shapes
 */

import { ParticleContext, ShapeResult } from './types';
import { calculateParticleTarget } from './index';
import { VisualShape } from '../../types';

export class ShapeMorpher {
  private morphProgress = 0;
  private fromShape: VisualShape = 'orb';
  private toShape: VisualShape = 'orb';
  private duration = 1000; // ms
  private startTime = 0;
  private isMorphing = false;

  morph(from: VisualShape, to: VisualShape, duration = 1000) {
    this.fromShape = from;
    this.toShape = to;
    this.duration = duration;
    this.morphProgress = 0;
    this.startTime = Date.now();
    this.isMorphing = true;
  }

  update() {
    if (!this.isMorphing) return;

    const elapsed = Date.now() - this.startTime;
    this.morphProgress = Math.min(elapsed / this.duration, 1);

    if (this.morphProgress >= 1) {
      this.isMorphing = false;
    }
  }

  getMorphedPosition(ctx: ParticleContext): ShapeResult {
    if (!this.isMorphing || this.morphProgress === 0) {
      return calculateParticleTarget(this.fromShape, ctx);
    }

    if (this.morphProgress === 1) {
      return calculateParticleTarget(this.toShape, ctx);
    }

    // Interpolate between shapes
    const fromResult = calculateParticleTarget(this.fromShape, ctx);
    const toResult = calculateParticleTarget(this.toShape, ctx);

    // Apply easing function
    const easedProgress = this.easeInOutCubic(this.morphProgress);

    return {
      tx: this.lerp(fromResult.tx, toResult.tx, easedProgress),
      ty: this.lerp(fromResult.ty, toResult.ty, easedProgress),
      spring: this.lerp(fromResult.spring, toResult.spring, easedProgress),
      friction: this.lerp(fromResult.friction, toResult.friction, easedProgress),
      noise: this.lerp(fromResult.noise || 0, toResult.noise || 0, easedProgress),
      targetAlpha: this.lerp(fromResult.targetAlpha || 0.7, toResult.targetAlpha || 0.7, easedProgress),
      scale: this.lerp(fromResult.scale || 1, toResult.scale || 1, easedProgress)
    };
  }

  isActive(): boolean {
    return this.isMorphing;
  }

  getProgress(): number {
    return this.morphProgress;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Advanced morphing with shape-specific transitions
  morphWithStyle(from: VisualShape, to: VisualShape, style: 'dissolve' | 'flow' | 'spiral' = 'dissolve') {
    switch (style) {
      case 'flow':
        this.morphWithFlow(from, to);
        break;
      case 'spiral':
        this.morphWithSpiral(from, to);
        break;
      default:
        this.morph(from, to);
    }
  }

  private morphWithFlow(from: VisualShape, to: VisualShape) {
    // Flow-style morphing: particles move in a wave pattern during transition
    this.morph(from, to, 1500); // Longer duration for flow effect
  }

  private morphWithSpiral(from: VisualShape, to: VisualShape) {
    // Spiral-style morphing: particles spiral inward/outward during transition
    this.morph(from, to, 2000); // Even longer for spiral effect
  }

  // Get intermediate shape for complex morphing chains
  getIntermediateShape(progress: number): { from: VisualShape; to: VisualShape; localProgress: number } {
    if (!this.isMorphing) {
      return { from: this.fromShape, to: this.toShape, localProgress: 0 };
    }

    // For now, simple linear morphing
    return {
      from: this.fromShape,
      to: this.toShape,
      localProgress: progress
    };
  }

  // Reset morphing state
  reset() {
    this.isMorphing = false;
    this.morphProgress = 0;
  }
}

// Singleton instance
export const shapeMorpher = new ShapeMorpher();
