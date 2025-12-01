
import { VisualState } from '../../types.ts';

/**
 * Context passed to every particle update function.
 * Contains all necessary state to calculate the particle's next position.
 */
export interface ParticleContext {
  index: number;      // The particle's unique index
  total: number;      // Total number of particles
  width: number;      // Canvas width
  height: number;     // Canvas height
  time: number;       // Global animation time
  audio: number;      // Smoothed audio level (0.0 to 1.0)
  rawAudio: number;   // Instantaneous audio level (0.0 to 1.0)
  mouse: { x: number; y: number }; // Mouse position
  p: { x: number; y: number; baseAlpha: number }; // Current particle properties
  visualState: VisualState; // The overall app visual state
  localTime?: string; // Current time string (HH:MM) for clock visualization
}

/**
 * The result returned by a shape generator.
 * Determines where the particle should go and how it should move.
 */
export interface ShapeResult {
  tx: number;         // Target X coordinate
  ty: number;         // Target Y coordinate
  spring: number;     // Spring tension (0.0 to 1.0)
  friction: number;   // Velocity damping (0.0 to 1.0)
  noise: number;      // Random noise factor
  targetAlpha?: number; // Optional target opacity
  scale?: number;     // Optional z-depth scale factor (1.0 is default)
  
  // Teleportation logic for rain/snow effects
  teleport?: { 
    x: number; 
    y: number; 
    vx: number; 
    vy: number; 
  }; 
}
