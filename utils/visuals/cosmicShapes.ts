
import { ParticleContext, ShapeResult } from './types';
import { cx, cy, PHYSICS } from './mathHelpers';

export const CosmicShapes = {
  planet(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);

    // SATURN-LIKE PLANET VISUALIZATION using pure particle physics
    
    // Config
    const planetRadius = 85; 
    const ringInnerRadius = 120;
    const ringOuterRadius = 240;
    const tiltAngle = 0.4; // Tilt of the rings (radians)
    const rotationSpeed = time * 0.0003;
    
    const isPlanetBody = index < total * 0.35; // 35% particles for body
    
    // Audio Reactivity
    const activeAudio = visualState.mode === 'speaking' ? audio : audio * 0.5;
    const pulse = 1 + (activeAudio * 0.15); // Subtle pulse
    
    if (isPlanetBody) {
        // --- 1. PLANET SPHERE ---
        // distributing particles on a sphere surface + volume
        const sphereIdx = index;
        // Golden spiral on sphere for even distribution
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const theta = 2 * Math.PI * sphereIdx / goldenRatio;
        const phi = Math.acos(1 - 2 * (sphereIdx + 0.5) / (total * 0.35));
        
        let r = planetRadius;
        
        // Add texture/bands to planet body
        // e.g. Jupiter-like bands based on Y position (phi)
        const bandNoise = Math.sin(phi * 8 + rotationSpeed * 2) * 5;
        r += bandNoise;
        
        // Convert spherical to cartesian
        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);
        
        // Rotate the planet body itself slightly
        const bodyRot = time * 0.0005;
        const rx = x * Math.cos(bodyRot) - z * Math.sin(bodyRot);
        const rz = x * Math.sin(bodyRot) + z * Math.cos(bodyRot);
        x = rx; z = rz;
        
        // Apply tilt to match rings
        const tiltedY = y * Math.cos(tiltAngle) - z * Math.sin(tiltAngle);
        
        return {
            tx: centerX + x * pulse,
            ty: centerY + tiltedY * pulse,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction, 
            noise: 0.02,
            targetAlpha: 0.9 + (activeAudio * 0.1),
            scale: 1.1 // Slightly larger particles for solid body
        };
    } else {
        // --- 2. PLANET RINGS ---
        // Flat disk with gaps
        const ringIdx = index - (total * 0.35);
        const ringTotal = total * 0.65;
        const t = ringIdx / ringTotal; // 0 to 1
        
        // Radius distribution (from inner to outer)
        // Use power function to put more particles near inner ring for density
        const rNorm = Math.pow(t, 0.8); 
        let r = ringInnerRadius + (rNorm * (ringOuterRadius - ringInnerRadius));
        
        // Create "Cassini Division" (gap in rings)
        if (r > 190 && r < 205) {
             r = r > 197.5 ? 208 : 188; // Push particles out of the gap
        }
        
        const angle = (ringIdx * 137.5) + (time * 0.0002 * (300/r)); // Inner rings move faster
        
        // Ring position (flat disk on XZ plane)
        let x = r * Math.cos(angle);
        let y = 0; // Flat
        let z = r * Math.sin(angle);
        
        // Apply Tilt
        const tiltedY = y * Math.cos(tiltAngle) - z * Math.sin(tiltAngle);
        // z computation not strictly needed for 2D render unless we do depth sorting, 
        // but useful if we wanted logical Z
        
        // Audio wave flowing through rings
        const wave = Math.sin(angle * 3 - time * 0.002) * (activeAudio * 15);
        
        return {
            tx: centerX + x * pulse,
            ty: centerY + tiltedY * pulse + wave, // Add wave to Y
            spring: 0.08, // Looser for dust/rings
            friction: 0.92,
            noise: 0.01,
            targetAlpha: 0.6 + (Math.sin(angle * 2) * 0.2), // Variation in alpha
            scale: 0.8 // Smaller dust particles
        };
    }
  },

  atom(ctx: ParticleContext): ShapeResult {
    const { index, total, time } = ctx;
    
    if (index < total * 0.2) {
        // Nucleus
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * 20;
        return {
            tx: cx(ctx) + r * Math.sin(phi) * Math.cos(theta),
            ty: cy(ctx) + r * Math.sin(phi) * Math.sin(theta),
            spring: PHYSICS.SnappySpring,
            friction: PHYSICS.FluidFriction,
            noise: 0.5
        };
    } else {
        // Electrons
        const remainder = index - (total * 0.2);
        const orbit = remainder % 3;
        const t = (time * 0.002) + (remainder * 0.1);
        const rX = 120;
        const rY = 35;
        
        const ex = rX * Math.cos(t);
        const ey = rY * Math.sin(t);
        
        const rot = (orbit * Math.PI) / 1.5;
        
        return {
            tx: cx(ctx) + (ex * Math.cos(rot) - ey * Math.sin(rot)),
            ty: cy(ctx) + (ex * Math.sin(rot) + ey * Math.cos(rot)),
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.FluidFriction,
            noise: 0.01
        };
    }
  },

  star(ctx: ParticleContext): ShapeResult {
    const { index, total, time } = ctx;
    const points = 5;
    const outerRadius = 140;
    const innerRadius = 60;
    
    const sector = Math.floor(index / (total / (points * 2)));
    const t = (index % (total / (points * 2))) / (total / (points * 2));
    const step = Math.PI / points;
    
    const r1 = (sector % 2 === 0) ? outerRadius : innerRadius;
    const a1 = sector * step - (Math.PI / 2);
    const r2 = (sector % 2 === 0) ? innerRadius : outerRadius;
    const a2 = (sector + 1) * step - (Math.PI / 2);
    
    const x1 = cx(ctx) + Math.cos(a1) * r1;
    const y1 = cy(ctx) + Math.sin(a1) * r1;
    const x2 = cx(ctx) + Math.cos(a2) * r2;
    const y2 = cy(ctx) + Math.sin(a2) * r2;
    
    let tx = x1 + (x2 - x1) * t;
    let ty = y1 + (y2 - y1) * t;
    
    const pulse = Math.sin(time * 0.005) * 10;
    const dx = tx - cx(ctx);
    const dy = ty - cy(ctx);
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > 0.1) {
        tx += (dx/d) * pulse;
        ty += (dy/d) * pulse;
    }

    return { tx, ty, spring: PHYSICS.StandardSpring, friction: PHYSICS.StandardFriction, noise: 0.05 };
  },

  globe(ctx: ParticleContext): ShapeResult {
    const { index, time } = ctx;
    const r = 130;
    const rotY = time * 0.0005;
    const rotX = 0.3;
    const numLats = 8;
    const numLongs = 12;
    const isLat = index % 2 === 0;
    
    let gx, gy, gz;
    if (isLat) {
        const latIdx = index % numLats;
        const phi = -Math.PI/2 + (Math.PI * (latIdx + 1) / (numLats + 1));
        const theta = (index * 0.1) + rotY;
        gx = r * Math.cos(phi) * Math.cos(theta);
        gz = r * Math.cos(phi) * Math.sin(theta);
        gy = r * Math.sin(phi);
    } else {
        const longIdx = index % numLongs;
        const theta = (longIdx / numLongs) * Math.PI * 2 + rotY;
        const phi = (index * 0.05) - Math.PI/2;
        gx = r * Math.cos(phi) * Math.cos(theta);
        gz = r * Math.cos(phi) * Math.sin(theta);
        gy = r * Math.sin(phi);
    }
    
    return {
        tx: cx(ctx) + gx,
        ty: cy(ctx) + (gy * Math.cos(rotX) - gz * Math.sin(rotX)),
        spring: PHYSICS.StandardSpring,
        friction: 0.90,
        noise: 0.01
    };
  },

  constellation(ctx: ParticleContext): ShapeResult {
      const { index, time } = ctx;
      const numNodes = 6;
      const nodeSpeed = time * 0.0002;
      const nodeIndex = index % numNodes;
      
      const nx = cx(ctx) + Math.cos(nodeIndex * 1.5 + nodeSpeed) * (140 + Math.sin(time * 0.001 + nodeIndex) * 40);
      const ny = cy(ctx) + Math.sin(nodeIndex * 2.1 + nodeSpeed * 0.8) * (100 + Math.cos(time * 0.0015 + nodeIndex) * 30);

      const cloudSize = 40;
      return {
          tx: nx + (Math.random() - 0.5) * cloudSize,
          ty: ny + (Math.random() - 0.5) * cloudSize,
          spring: PHYSICS.StandardSpring,
          friction: 0.88,
          noise: 0.03
      };
  }
};
