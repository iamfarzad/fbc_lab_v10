


import { ParticleContext, ShapeResult } from './types';
import { cx, cy, PHYSICS } from './mathHelpers';

// 5x5 Bitmap Font for A-Z, 0-9, and symbols
// 1 = Particle, 0 = Empty
export const GLYPH_MAPS: Record<string, number[][]> = {
    // Digits
    '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
    '3': [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
    '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
    '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
    '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
    '7': [[1,1,1],[0,0,1],[0,0,1],[0,1,0],[0,1,0]],
    '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
    '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
    
    // Symbols
    ':': [[0],[1],[0],[1],[0]],
    '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
    '+': [[0,0,0],[0,1,0],[1,1,1],[0,1,0],[0,0,0]],
    '.': [[0],[0],[0],[0],[1]],
    ',': [[0],[0],[0],[0],[1],[1]],
    '°': [[1,1,0],[1,1,0],[0,0,0],[0,0,0],[0,0,0]], 
    '$': [[0,0,1,0,0],[0,1,1,1,0],[1,0,1,0,0],[0,1,1,1,0],[0,0,1,0,1],[0,1,1,1,0],[0,0,1,0,0]],
    '%': [[1,0,0,1],[0,0,1,0],[0,1,0,0],[1,0,0,1]],
    '/': [[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0]], 

    // Letters (Caps)
    'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
    'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
    'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
    'E': [[1,1,1],[1,0,0],[1,1,1],[1,0,0],[1,1,1]],
    'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
    'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
    'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,1]],
    'K': [[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'M': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
    'N': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]], // Simplified
    'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
    'Q': [[0,1,0],[1,0,1],[1,0,1],[1,1,1],[0,0,1]],
    'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
    'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,1]],
    'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    'W': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
    'X': [[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
    'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
    'Z': [[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
    '?': [[0,1,0],[1,0,1],[0,0,1],[0,1,0],[0,0,0]],

    // Specific Lowercase
    'c': [[0,0,0],[0,0,0],[0,1,1],[1,0,0],[0,1,1]], 
};

/**
 * Reusable helper to render text using the standard particle morph effect.
 */
export function calculatePixelText(
    ctx: ParticleContext,
    text: string,
    centerX: number,
    centerY: number,
    options: { scale?: number, particlesPerChar?: number, jitter?: number } = {}
): ShapeResult | null {
    const { index } = ctx;
    // Don't force uppercase immediately, allow case-specific glyphs if they exist
    const cleanText = text; 
    const scale = options.scale || 18;
    const particlesPerChar = options.particlesPerChar || 250;
    const jitterAmount = options.jitter ?? 0.5;
    const spacing = 1.5 * scale;

    // 1. Calculate Layout
    const charWidths = cleanText.split('').map(char => {
        // Try exact match, then uppercase match, then default
        const map = GLYPH_MAPS[char] || (char ? GLYPH_MAPS[char.toUpperCase()] : undefined) || GLYPH_MAPS['-'];
        if (!map || !map[0]) return 0;
        const cols = map[0].length;
        return cols * scale;
    });

    const totalW = charWidths.reduce((sum, w) => sum + w, 0) + ((cleanText.length - 1) * spacing);
    const startX = centerX - totalW / 2;

    // 2. Determine Character Index
    const charIndex = Math.floor(index / particlesPerChar);

    // If this particle belongs to a character beyond the string, return null
    if (charIndex >= cleanText.length) {
        return null; 
    }

    // 3. Calculate X Offset for this character
    let currentXOffset = 0;
    for (let i = 0; i < charIndex; i++) {
        const width = charWidths[i];
        if (width !== undefined) {
          currentXOffset += width + spacing;
        }
    }

    // 4. Map Particle to Grid Point
    const char = cleanText[charIndex];
    if (!char) return null;
    const pattern = GLYPH_MAPS[char] || GLYPH_MAPS[char.toUpperCase()] || GLYPH_MAPS['?'];
    const pIndex = index % particlesPerChar;

    // Flatten grid points
    if (!pattern) return null;
    const activePoints: {c:number, r:number}[] = [];
    pattern.forEach((row: number[], r: number) => {
        row.forEach((val: number, c: number) => {
            if (val === 1) activePoints.push({c, r});
        });
    });

    if (activePoints.length === 0) {
        return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
    }

    const pt = activePoints[pIndex % activePoints.length];
    if (!pt) return null;

    // 5. Apply Jitter & Position
    const jitterX = (Math.random() - 0.5) * scale * jitterAmount;
    const jitterY = (Math.random() - 0.5) * scale * jitterAmount;

    const tx = startX + currentXOffset + (pt.c * scale) + jitterX;
    const ty = centerY - (2.5 * scale) + (pt.r * scale) + jitterY;

    // Gentle breathing animation
    const breathe = Math.sin(ctx.time * 0.002) * 2;

    return {
        tx,
        ty: ty + breathe,
        spring: 0.15, 
        friction: 0.85,
        noise: 0.02, 
        targetAlpha: 0.9
    };
}

export const GeometricShapes = {
  
  orb(ctx: ParticleContext): ShapeResult {
    const { index, total, time, visualState, audio, rawAudio } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // Enhanced spiral: more accurate logarithmic spiral
    const turns = 10; // More turns for denser spiral
    const angle = (index / total) * turns * Math.PI * 2 + (time * 0.0004);
    
    // Logarithmic spiral formula: r = a * e^(b*θ)
    const spiralGrowth = 1.08;
    const t = index / total;
    const baseRadius = 2.5;
    const r = baseRadius * Math.pow(spiralGrowth, t * turns) * (1 + audio * 0.15);
    
    // Audio-reactive expansion
    const audioPulse = visualState.mode === 'speaking' ? rawAudio * 0.3 : audio * 0.1;
    const finalR = r * (1 + audioPulse);
    
    const targetX = centerX + Math.cos(angle) * finalR;
    const targetY = centerY + Math.sin(angle) * finalR;
    
    // Enhanced physics based on mode
    let spring = PHYSICS.StandardSpring;
    let friction = 0.88;
    let noise = 0.03;
    let targetAlpha = 0.7;

    if (visualState.mode === 'listening') {
        spring = 0.12;
        noise = 0.05 + (audio * 0.15);
        targetAlpha = 0.6 + (audio * 0.3);
    } else if (visualState.mode === 'speaking') {
        spring = 0.1;
        friction = 0.86; // Slightly looser
        noise = 0.04 + (rawAudio * 0.1);
        targetAlpha = 0.75 + (rawAudio * 0.25);
    } else if (visualState.mode === 'thinking') {
        spring = 0.07;
        noise = 0.02;
        // Subtle pulsing
        targetAlpha = 0.65 + Math.sin(time * 0.002) * 0.1;
    }

    return { 
      tx: targetX, 
      ty: targetY, 
      spring, 
      friction, 
      noise,
      targetAlpha
    };
  },

  idle(ctx: ParticleContext): ShapeResult {
    const { index, total, time } = ctx;
    const angle = (index / total) * Math.PI * 2 + time * 0.0002; 
    const radius = 100 + Math.sin(time * 0.001 + index) * 20;
    
    return {
      tx: cx(ctx) + Math.cos(angle) * radius,
      ty: cy(ctx) + Math.sin(angle) * radius,
      spring: PHYSICS.IdleSpring,
      friction: PHYSICS.IdleFriction,
      noise: 0.05,
      targetAlpha: ctx.p.baseAlpha * 0.3
    };
  },

  dna(ctx: ParticleContext): ShapeResult {
    const { index, total, height, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // More accurate DNA double helix
    const heightSpan = height * 0.65;
    const yPos = (index / total) * heightSpan - (heightSpan / 2);
    
    // Determine strand (A or B)
    const strand = index % 2 === 0 ? 0 : Math.PI;
    
    // More accurate helix twist (10.5 base pairs per turn)
    const helixFrequency = 0.014; // Adjusted for realistic DNA
    const twist = (yPos * helixFrequency) + (time * 0.0015);
    
    // Base width with audio-reactive expansion
    const baseWidth = 85;
    const audioExpansion = audio * 25;
    const breathing = Math.sin(time * 0.0006) * 8;
    const width = baseWidth + audioExpansion + breathing;
    
    // Calculate position on helix
    const helixX = Math.sin(twist + strand) * width;
    const helixY = yPos;
    
    // Add subtle vertical offset for 3D effect
    const depthOffset = Math.cos(twist + strand) * 5;
    
    // Enhanced physics
    let spring = PHYSICS.StandardSpring;
    const friction = PHYSICS.StandardFriction;
    let targetAlpha = 0.6;
    
    if (visualState.mode === 'speaking') {
        spring = PHYSICS.SnappySpring;
        targetAlpha = 0.7 + (audio * 0.2);
    } else if (visualState.mode === 'thinking') {
        // Subtle pulsing during thinking
        targetAlpha = 0.65 + Math.sin(time * 0.003 + index * 0.01) * 0.1;
    }

    return {
      tx: centerX + helixX,
      ty: centerY + helixY + depthOffset,
      spring, 
      friction,
      noise: 0.015,
      targetAlpha
    };
  },

  wave(ctx: ParticleContext): ShapeResult {
    const { index, total, width, time, audio, rawAudio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    const layers = 3;
    const layerIdx = index % layers;
    const ptIdx = Math.floor(index / layers);
    const ptsPerLayer = Math.floor(total / layers);
    
    const spread = width * 0.9; // Slightly wider
    const t = ptIdx / ptsPerLayer;
    const x = (t - 0.5) * spread;
    
    // Better envelope: smooth fade in/out
    const envelope = Math.pow(Math.sin(t * Math.PI), 1.8);
    
    // Enhanced amplitude with mode awareness
    const baseAmp = 25;
    const activeAudio = visualState.mode === 'speaking' ? rawAudio : audio;
    const activeAmp = 200 * activeAudio; 
    const totalAmp = (baseAmp + activeAmp) * envelope;

    const speed = time * 0.002;
    const freqBase = 0.022;

    // More accurate waveforms with harmonics
    let y = 0;
    if (layerIdx === 0) {
        // Primary wave - fundamental frequency
        y = Math.sin(x * freqBase + speed) * totalAmp;
        // Add subtle harmonic
        y += Math.sin(x * freqBase * 2 + speed * 1.5) * totalAmp * 0.15;
    } else if (layerIdx === 1) {
        // Secondary wave - slightly higher frequency, phase shifted
        y = Math.sin(x * freqBase * 1.6 - speed * 1.3) * totalAmp * 0.75;
        y += Math.cos(x * freqBase * 0.8 + speed * 0.8) * totalAmp * 0.2;
    } else {
        // Tertiary wave - highest frequency, most subtle
        y = Math.sin(x * freqBase * 2.5 + speed * 2.0) * totalAmp * 0.45;
    }
    
    // Audio-reactive modulation
    const modulation = Math.cos(x * 0.012 + time * 0.0018) * activeAudio * 35 * envelope;
    y += modulation;
    
    // Frequency-dependent noise
    const noise = 0.008 + (activeAudio * 0.03);
    
    // Layer-specific alpha with audio enhancement
    let targetAlpha = 0.7;
    if (layerIdx === 1) targetAlpha = 0.45;
    if (layerIdx === 2) targetAlpha = 0.35;
    
    // Boost alpha with audio
    if (visualState.mode === 'speaking') {
        targetAlpha = Math.min(1.0, targetAlpha + rawAudio * 0.3);
    } else if (visualState.mode === 'listening') {
        targetAlpha = Math.min(1.0, targetAlpha + audio * 0.2);
    }

    return {
      tx: centerX + x,
      ty: centerY + y,
      spring: 0.13,
      friction: 0.87,
      noise,
      targetAlpha
    };
  },

  rect(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // Responsive rectangle size
    const rectW = Math.min(ctx.width * 0.6, 360);
    const rectH = Math.min(ctx.height * 0.5, 280);
    const perimeter = (rectW + rectH) * 2;
    const pos = (index / total) * perimeter;
    
    // Audio-reactive corner rounding effect
    // const cornerRadius = 15 + (audio * 10);
    
    let px = 0, py = 0;
    
    // Enhanced corner handling for smoother appearance
    if (pos < rectW) { 
        // Top edge
        px = pos - rectW/2; 
        py = -rectH/2; 
    } else if (pos < rectW + rectH) { 
        // Right edge
        px = rectW/2; 
        py = (pos - rectW) - rectH/2; 
    } else if (pos < rectW * 2 + rectH) { 
        // Bottom edge
        px = (rectW * 2 + rectH - pos) - rectW/2; 
        py = rectH/2; 
    } else { 
        // Left edge
        px = -rectW/2; 
        py = (perimeter - pos) - rectH/2; 
    }
    
    // Subtle breathing animation
    const breathe = Math.sin(time * 0.0005) * 2;
    px *= (1 + breathe * 0.01);
    py *= (1 + breathe * 0.01);

    // Enhanced alpha
    let targetAlpha = 0.65;
    if (visualState.mode === 'speaking') {
        targetAlpha = 0.75 + (audio * 0.2);
    }

    return {
      tx: centerX + px,
      ty: centerY + py,
      spring: PHYSICS.StandardSpring,
      friction: PHYSICS.DampedFriction,
      noise: 0.008,
      targetAlpha
    };
  },

  heart(ctx: ParticleContext): ShapeResult {
    const { index, total, audio, rawAudio, time, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // More accurate parametric heart equation
    const t = (index / total) * Math.PI * 2;
    
    // Classic heart curve formula (more accurate)
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    
    // Enhanced scaling with audio and breathing
    const baseScale = 9;
    const audioScale = visualState.mode === 'speaking' ? rawAudio * 6 : audio * 4;
    const breathing = Math.sin(time * 0.001) * 1.5; // Gentle heartbeat
    const scale = baseScale + audioScale + breathing;
    
    // Position with slight vertical offset
    const tx = centerX + hx * scale;
    const ty = centerY + hy * scale - 25;
    
    // Enhanced alpha with pulsing effect
    let targetAlpha = 0.7;
    
    // Heartbeat pulse effect
    const heartbeat = Math.sin(time * 0.002) * 0.1;
    targetAlpha += heartbeat;
    
    // Audio-reactive glow
    if (visualState.mode === 'speaking') {
        targetAlpha = Math.min(1.0, targetAlpha + rawAudio * 0.3);
    }
    
    // Better physics for smoother heart
    const spring = PHYSICS.StandardSpring;
    const friction = PHYSICS.StandardFriction;

    return {
      tx,
      ty,
      spring,
      friction,
      noise: 0.015,
      targetAlpha
    };
  },

  grid(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // More precise grid calculation
    const cols = 32; // Slightly more columns for denser grid
    const spacing = 24;
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    // Center the grid properly
    const totalRows = Math.ceil(total / cols);
    const offsetX = ((cols - 1) * spacing) / 2;
    const offsetY = ((totalRows - 1) * spacing) / 2;
    
    const baseX = centerX + (col * spacing) - offsetX;
    const baseY = centerY + (row * spacing) - offsetY;
    
    // Enhanced wave effect with multiple frequencies
    const waveSpeed = time * 0.004;
    const waveFreq = 0.18;
    const waveAmp = 8 + (audio * 12);
    
    // Horizontal wave (column-based)
    const waveX = Math.sin(col * waveFreq + waveSpeed) * waveAmp * 0.5;
    
    // Vertical wave (row-based, out of phase)
    const waveY = Math.cos(row * waveFreq * 0.8 + waveSpeed * 1.2) * waveAmp;
    
    // Combined wave effect
    const tx = baseX + waveX;
    const ty = baseY + waveY;
    
    // Mode-aware alpha
    let targetAlpha = 0.55;
    if (visualState.mode === 'speaking') {
        targetAlpha = 0.65 + (audio * 0.25);
    } else if (visualState.mode === 'thinking') {
        targetAlpha = 0.6 + Math.sin(time * 0.002 + row * 0.1) * 0.1;
    }

    return {
      tx,
      ty,
      spring: PHYSICS.StandardSpring,
      friction: PHYSICS.StandardFriction,
      noise: 0.005, // Minimal noise for clean grid
      targetAlpha
    };
  },
  
  code(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    const cols = 42; // Slightly more columns
    const spacingX = 11;
    const spacingY = 17;
    const blockWidth = cols * spacingX;
    
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    // More realistic code patterns
    const rowHash = (row * 9301 + 49297) % 233280;
    const indent = (rowHash % 7) * spacingX; 
    const lineLength = 12 + (rowHash % (cols - 15));
    
    if (col > lineLength) {
         return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
    }

    const startX = centerX - blockWidth / 2;
    const startY = centerY - (total / cols * spacingY) / 3;

    // Smoother cursor animation
    const activeRow = Math.floor((time * 0.008) % 22); 
    const isCursor = row === activeRow && col === lineLength;
    const blinkSpeed = time * 0.006;
    const blink = Math.floor(blinkSpeed) % 2 === 0;

    let alpha = 0.65;
    if (isCursor) {
        alpha = blink ? 1 : 0.3;
    }
    
    // Enhanced syntax highlighting
    if (col < 4 && indent === 0) {
        // Keywords (at start of line)
        alpha = 0.95;
    } else if (col < indent + 8) {
        // Variables/functions
        alpha = 0.75;
    } else {
        // Regular code
        alpha = 0.6;
    }
    
    // Subtle audio-reactive pulse
    if (visualState.mode === 'speaking' && audio > 0.1) {
        alpha += audio * 0.15;
    }
    
    return {
        tx: startX + (col * spacingX) + indent,
        ty: startY + (row * spacingY),
        spring: 0.12,
        friction: 0.85,
        noise: 0.002,
        targetAlpha: Math.min(1.0, alpha)
    };
  },

  hourglass(ctx: ParticleContext): ShapeResult {
    const { index, total, time } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    const size = 130;
    const half = total / 2;
    const narrowPoint = 15; // Width at narrowest point
    const topWidth = 80;
    const bottomWidth = 80;
    
    let tx, ty;
    const noise = 0.01;
    let targetAlpha = 0.6;

    if (index < half) {
        // Top half (upper chamber)
        const p = index / half;
        const normalizedY = Math.sqrt(p); // More particles at top
        const y = -size + (normalizedY * size);
        
        // Taper from topWidth to narrowPoint
        const progress = normalizedY;
        const widthAtY = topWidth - ((topWidth - narrowPoint) * progress);
        
        tx = centerX + (Math.random() - 0.5) * 2 * widthAtY;
        ty = centerY + y;
        
        // Particles near narrow point are brighter (flow effect)
        if (progress > 0.7) {
            targetAlpha = 0.8;
        }
    } else {
        // Bottom half (lower chamber)
        const p = (index - half) / half;
        const normalizedY = Math.sqrt(p); // More particles at bottom
        const y = normalizedY * size;
        
        // Expand from narrowPoint to bottomWidth
        const progress = normalizedY;
        const widthAtY = narrowPoint + ((bottomWidth - narrowPoint) * progress);
        
        tx = centerX + (Math.random() - 0.5) * 2 * widthAtY;
        ty = centerY + y;
        
        // Particles near narrow point are brighter
        if (progress < 0.3) {
            targetAlpha = 0.8;
        }
    }
    
    // Animated flow effect - particles "falling"
    const flowSpeed = time * 0.0003;
    const flowOffset = Math.sin(flowSpeed + index * 0.001) * 2;
    ty += flowOffset;

    return { 
      tx, 
      ty, 
      spring: PHYSICS.StandardSpring, 
      friction: PHYSICS.StandardFriction, 
      noise,
      targetAlpha
    };
  },

  clock(ctx: ParticleContext): ShapeResult {
    const { index, localTime, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    const str = localTime || "00:00";
    
    // Enhanced text rendering with better clarity
    const textResult = calculatePixelText(ctx, str, centerX, centerY, { 
        particlesPerChar: 350,
        scale: 20,
        jitter: 0.3
    });
    
    if (textResult) {
        // Enhance text with subtle glow
        const enhanced = { ...textResult };
        if (visualState.mode === 'thinking') {
            enhanced.targetAlpha = (textResult.targetAlpha || 0.9) + Math.sin(time * 0.002) * 0.1;
        }
        return enhanced;
    }
    
    const usedParticles = 350 * str.length;
    const rem = index - usedParticles;
    
    if (rem >= 0) {
        // Enhanced clock ring with smoother motion
        const ringAngle = rem * 0.04 + (time * 0.0004);
        const ringR = 200 + Math.sin(rem * 0.1) * 8;
        
        // Audio-reactive ring expansion
        const audioExpansion = audio * 15;
        const finalR = ringR + audioExpansion;
        
        let targetAlpha = 0.12;
        if (visualState.mode === 'speaking') {
            targetAlpha = 0.15 + (audio * 0.1);
        }
        
        return {
            tx: centerX + Math.cos(ringAngle) * finalR,
            ty: centerY + Math.sin(ringAngle) * finalR,
            spring: 0.06,
            friction: 0.92,
            noise: 0.03,
            targetAlpha
        };
    }

    return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
  },

  shield(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // More accurate shield shape (heater shield)
    const p = index / total;
    const angle = p * Math.PI * 2;
    const size = 110 + (audio * 15); // Audio-reactive size
    
    // Shield shape: pointed top, rounded bottom
    const t = angle - Math.PI/2;
    let sx = size * Math.cos(t);
    let sy;
    
    // Bottom half: more rounded
    if (Math.sin(t) < 0) {
        sy = size * Math.sin(t) * 0.65; // Slightly more rounded
        // Taper the sides
        sx = sx * (0.9 + Math.abs(Math.sin(t)) * 0.1);
    } else {
        // Top half: pointed
        sy = size * Math.sin(t) * 1.25; 
        // Pointed top with smooth taper
        sx = sx * (1 - (Math.sin(t) * 0.45));
    }
    
    // Subtle rotation/breathing
    const breathing = Math.sin(time * 0.0007) * 1;
    sx *= (1 + breathing * 0.01);
    sy *= (1 + breathing * 0.01);

    // Enhanced alpha
    let targetAlpha = 0.7;
    if (visualState.mode === 'speaking') {
        targetAlpha = 0.8 + (audio * 0.15);
    }

    return {
      tx: centerX + sx,
      ty: centerY + sy,
      spring: PHYSICS.StandardSpring,
      friction: PHYSICS.StandardFriction,
      noise: 0.008,
      targetAlpha
    };
  },

  brain(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // Enhanced brain with better lobe separation
    const lobeOffset = 50;
    const isLeft = index % 2 === 0;
    const lobeCenterX = isLeft ? centerX - lobeOffset : centerX + lobeOffset;
    
    // Better distribution: use golden spiral for more even coverage
    const i = Math.floor(index / 2); // Per-lobe index
    const lobeTotal = Math.floor(total / 2);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    // Spherical distribution for each lobe
    const theta = (i / goldenRatio) % 1 * Math.PI * 2;
    const phi = Math.acos(1 - 2 * (i + 0.5) / lobeTotal);
    
    const baseRadius = 60;
    
    // Enhanced brain folds (sulci and gyri)
    const foldFrequency = 7;
    const foldDepth = 6;
    const fold = Math.sin(theta * foldFrequency) * Math.cos(phi * 6) * foldDepth;
    const r = baseRadius + fold;
    
    // Convert to cartesian
    let tx = lobeCenterX + r * Math.sin(phi) * Math.cos(theta);
    let ty = centerY + r * Math.sin(phi) * Math.sin(theta) * 1.15;
    
    // Better separation between lobes
    const separation = 8;
    if (isLeft && tx > centerX - separation) tx = centerX - separation;
    if (!isLeft && tx < centerX + separation) tx = centerX + separation;
    
    // Enhanced pulsing (thinking effect)
    const pulseSpeed = 0.0015;
    const pulse = Math.sin(time * pulseSpeed) * 1.5;
    tx += (tx - centerX) * 0.01 * pulse;
    
    // Audio-reactive expansion
    const audioExpansion = audio * 0.03;
    tx += (tx - centerX) * audioExpansion;
    ty += (ty - centerY) * audioExpansion;
    
    // Enhanced alpha based on mode
    let targetAlpha = 0.65;
    if (visualState.mode === 'thinking') {
        targetAlpha = 0.75 + Math.sin(time * 0.003 + index * 0.01) * 0.15;
    } else if (visualState.mode === 'speaking') {
        targetAlpha = 0.7 + (audio * 0.25);
    }

    return { 
      tx, 
      ty, 
      spring: PHYSICS.StandardSpring, 
      friction: PHYSICS.StandardFriction, 
      noise: 0.015,
      targetAlpha
    };
  },

  chart(ctx: ParticleContext): ShapeResult {
      const { index, total, width, time, audio, visualState } = ctx;
      const graphWidth = width * 0.6;
      const graphHeight = 200;
      const centerX = cx(ctx);
      const centerY = cy(ctx);
      const trend = visualState.chartData?.trend || 'neutral';
      const valueStr = visualState.chartData?.value || "";

      const textParticles = 2000; 
      if (index < textParticles && valueStr) {
          const textResult = calculatePixelText(ctx, valueStr, centerX, centerY - 120, { scale: 12, particlesPerChar: 200 });
          if (textResult) return textResult;
      }

      const graphIndex = index - textParticles;
      const graphTotal = total - textParticles;
      
      if (graphTotal <= 0) return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };

      if (graphIndex < graphTotal * 0.1) {
          const p = graphIndex / (graphTotal * 0.1);
          if (p < 0.5) { 
             const t = p / 0.5;
             return {
                 tx: (centerX - graphWidth/2) + (t * graphWidth),
                 ty: centerY + graphHeight/2,
                 spring: 0.1, friction: 0.8, noise: 0
             };
          } else { 
              const t = (p - 0.5) / 0.5;
              return {
                  tx: centerX - graphWidth/2,
                  ty: (centerY + graphHeight/2) - (t * graphHeight),
                  spring: 0.1, friction: 0.8, noise: 0
              };
          }
      }

      const dataParticles = graphTotal * 0.9;
      const i = graphIndex - (graphTotal * 0.1);
      const t = i / dataParticles;
      const x = (centerX - graphWidth/2) + (t * graphWidth);
      
      let trendY = 0;
      if (trend === 'up') {
          trendY = (1 - t) * (graphHeight * 0.4) - (t * graphHeight * 0.4);
      } else if (trend === 'down') {
          trendY = (t * graphHeight * 0.4) - ((1-t) * graphHeight * 0.4);
      }
      
      const volatile = Math.sin(t * 15 + time * 0.0005) * 25 + Math.cos(t * 40) * 10;
      let audioOffset = 0;
      if (t > 0.85) {
           audioOffset = audio * 80 * (Math.random() > 0.5 ? 1 : -1);
      }
      
      const y = centerY + trendY + volatile + audioOffset;

      return {
          tx: x,
          ty: y,
          spring: PHYSICS.StandardSpring,
          friction: PHYSICS.StandardFriction,
          noise: 0.01
      };
  },
  
  // Dynamic Text Shape
  text(ctx: ParticleContext): ShapeResult {
      const { visualState, time, audio, index, total } = ctx;
      const centerX = cx(ctx);
      const centerY = cy(ctx);
      const str = visualState.textContent || "AI";
      
      // Calculate scale based on length to fit screen
      const maxChars = 12;
      const defaultScale = 20;
      let scale = defaultScale;
      if (str.length > maxChars) {
          scale = defaultScale * (maxChars / str.length);
      }

      const result = calculatePixelText(ctx, str, centerX, centerY, { 
          scale: scale, 
          particlesPerChar: 250,
          jitter: 0.4
      });
      
      if (result) {
          // Enhance text with audio-reactive glow
          const enhanced = { ...result };
          if (visualState.mode === 'speaking') {
              enhanced.targetAlpha = Math.min(1.0, (result.targetAlpha || 0.9) + audio * 0.2);
          } else if (visualState.mode === 'thinking') {
              enhanced.targetAlpha = (result.targetAlpha || 0.9) + Math.sin(time * 0.003) * 0.1;
          }
          return enhanced;
      }
      
      // Enhanced orbiting particles for excess
      const angle = (index / total) * Math.PI * 2 + time * 0.0008;
      const baseR = 280;
      const audioR = audio * 30;
      const r = baseR + audioR;
      return {
          tx: centerX + Math.cos(angle) * r,
          ty: centerY + Math.sin(angle) * r,
          spring: 0.03,
          friction: 0.94,
          noise: 0.015,
          targetAlpha: 0.15 + (audio * 0.1)
      };
  },

  scanner(ctx: ParticleContext): ShapeResult {
    const { index, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    const cols = 42;
    const spacing = 14;
    const gridWidth = cols * spacing;
    
    // Document Grid
    const row = Math.floor(index / cols);
    const col = index % cols;
    const startX = centerX - gridWidth / 2;
    const startY = centerY - 160; 
    
    // Only use enough particles for a rectangular document shape
    const maxRows = 52;
    if (row > maxRows) return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };

    const tx = startX + col * spacing;
    const ty = startY + row * spacing;
    
    // Enhanced scanner bar with smoother motion
    const scanHeight = maxRows * spacing;
    const scanSpeed = time * 0.0018;
    const scanY = startY + (Math.sin(scanSpeed) * 0.5 + 0.5) * scanHeight;
    
    const distToScan = Math.abs(ty - scanY);
    const scanLineWidth = 35; // Wider scan line
    const isScanLine = distToScan < scanLineWidth;
    
    // Progressive intensity based on distance from scan line
    const scanIntensity = isScanLine ? (1 - distToScan / scanLineWidth) : 0;
    
    let targetAlpha = 0.25;
    let scale = 1;
    
    if (isScanLine) {
        targetAlpha = 0.95 + (scanIntensity * 0.05);
        scale = 1.3 + (scanIntensity * 0.4); // Pop out effect
    } else if (distToScan < scanLineWidth * 2) {
        // Fade zone around scan line
        targetAlpha = 0.3 + ((1 - distToScan / (scanLineWidth * 2)) * 0.3);
    } else if (Math.random() > 0.97) {
        targetAlpha = 0.5; // Random sparkle
    }
    
    // Audio-reactive scan intensity
    if (visualState.mode === 'speaking' && audio > 0.2) {
        targetAlpha += audio * 0.2;
        scale += audio * 0.1;
    }

    return {
      tx,
      ty,
      spring: 0.12,
      friction: 0.88,
      noise: 0.002,
      targetAlpha: Math.min(1.0, targetAlpha),
      scale
    };
  },

  // NEW ANIMATIONS

  vortex(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, rawAudio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // Logarithmic spiral vortex
    const turns = 12;
    const t = index / total;
    const angle = t * turns * Math.PI * 2 + (time * 0.0006 * (1 + audio * 0.5));
    
    // Tight spiral that expands
    const spiralGrowth = 1.06;
    const baseRadius = 5;
    const maxRadius = 300 + (audio * 100);
    const radius = baseRadius * Math.pow(spiralGrowth, t * turns);
    const finalRadius = Math.min(radius, maxRadius);
    
    // Audio-reactive expansion
    const audioExpansion = visualState.mode === 'speaking' ? rawAudio * 0.4 : audio * 0.2;
    const r = finalRadius * (1 + audioExpansion);
    
    // Convert to cartesian
    const tx = centerX + Math.cos(angle) * r;
    const ty = centerY + Math.sin(angle) * r;
    
    // Enhanced physics - tighter spring for vortex effect
    const spring = PHYSICS.SnappySpring * 0.8;
    const friction = 0.82; // Less friction for spinning
    let targetAlpha = 0.7;
    
    // Particles closer to center are brighter
    const distanceFromCenter = r / maxRadius;
    targetAlpha = 0.5 + (1 - distanceFromCenter) * 0.4;
    
    // Audio-reactive glow
    if (visualState.mode === 'speaking') {
        targetAlpha = Math.min(1.0, targetAlpha + rawAudio * 0.3);
    }

    return {
      tx,
      ty,
      spring,
      friction,
      noise: 0.01,
      targetAlpha
    };
  },

  fireworks(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // Multiple firework bursts
    const numBursts = 8;
    const burstIndex = index % numBursts;
    const particlesPerBurst = Math.floor(total / numBursts);
    const particleInBurst = Math.floor(index / numBursts);
    
    // Burst timing - staggered
    const burstDelay = burstIndex * 2000; // 2 seconds apart
    const cycleTime = (time + burstDelay) % (numBursts * 2000);
    const burstAge = cycleTime;
    const maxAge = 3000; // 3 seconds lifespan
    
    if (burstAge > maxAge) {
        // Before next burst - invisible
        return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
    }
    
    // Burst origin (random positions)
    const seed = burstIndex * 73;
    const originX = centerX + (Math.sin(seed) * (ctx.width * 0.3));
    const originY = centerY - 150 + (Math.cos(seed * 1.3) * 100);
    
    // Explosion physics
    const ageNorm = burstAge / maxAge;
    const velocity = 200 * (1 - ageNorm * 0.7); // Slow down over time
    const distance = velocity * ageNorm * 0.5;
    
    // Particle direction
    const angle = (particleInBurst / particlesPerBurst) * Math.PI * 2;
    // const spread = Math.PI * 2 / particlesPerBurst; // Full circle
    
    // Add gravity (falling)
    const gravity = ageNorm * ageNorm * 120;
    
    const tx = originX + Math.cos(angle) * distance;
    const ty = originY + Math.sin(angle) * distance + gravity;
    
    // Fade out over time
    let targetAlpha = 0.9 * (1 - ageNorm);
    
    // Audio triggers new bursts
    if (visualState.mode === 'speaking' && audio > 0.3) {
        targetAlpha += audio * 0.3;
    }
    
    // Trail effect - particles fade as they spread
    const trail = 1 - (distance / 250);
    targetAlpha *= trail;

    return {
      tx,
      ty,
      spring: 0.05,
      friction: 0.92,
      noise: 0.02,
      targetAlpha: Math.max(0, Math.min(1.0, targetAlpha))
    };
  },

  lightning(ctx: ParticleContext): ShapeResult {
    const { index, total, time, rawAudio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // Multiple lightning branches
    const numBranches = 5;
    const branchIndex = index % numBranches;
    const particlesPerBranch = Math.floor(total / numBranches);
    const particleInBranch = Math.floor(index / numBranches);
    
    // Lightning timing - random strikes
    const branchSeed = branchIndex * 47;
    const strikeInterval = 3000 + (branchSeed % 2000);
    const cycleTime = (time + branchSeed * 100) % strikeInterval;
    const strikeDuration = 150; // Quick flash
    const isStriking = cycleTime < strikeDuration;
    
    if (!isStriking) {
        return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
    }
    
    // Lightning path - jagged downward
    const startX = centerX - 100 + (branchIndex * 50);
    const startY = centerY - 200;
    const endY = centerY + 200;
    
    const t = particleInBranch / particlesPerBranch;
    const y = startY + (endY - startY) * t;
    
    // Jagged zigzag pattern
    const segments = 8;
    const segmentIndex = Math.floor(t * segments);
    // const segmentT = (t * segments) % 1;
    
    // Horizontal offset for zigzag
    const zigzag = Math.sin(segmentIndex * Math.PI * 2.7) * 60;
    const x = startX + zigzag + (Math.random() - 0.5) * 15;
    
    // Branching - some particles branch off
    if (t > 0.3 && Math.random() > 0.85) {
        const branchAngle = (Math.random() - 0.5) * Math.PI * 0.6;
        const branchLength = (1 - t) * 80;
        const branchX = x + Math.cos(branchAngle) * branchLength;
        const branchY = y + Math.sin(branchAngle) * branchLength;
        
        return {
            tx: branchX,
            ty: branchY,
            spring: 0.2,
            friction: 0.85,
            noise: 0.1,
            targetAlpha: 0.9
        };
    }

    // Fade based on strike age
    // const strikeAge = cycleTime / strikeDuration;
    let targetAlpha = 0.95;
    
    // Flicker effect
    const flicker = Math.random() > 0.7 ? 1.2 : 1.0;
    targetAlpha *= flicker;
    
    // Audio-reactive intensity
    if (visualState.mode === 'speaking' && rawAudio > 0.2) {
        targetAlpha = Math.min(1.0, targetAlpha + rawAudio * 0.3);
    }

    return {
      tx: x,
      ty: y,
      spring: 0.15,
      friction: 0.88,
      noise: 0.05,
      targetAlpha
    };
  },

  flower(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    
    // Flower parameters
    const petals = 8; // Number of petals
    const petalIndex = index % petals;
    const particlesPerPetal = Math.floor(total / petals);
    const particleInPetal = Math.floor(index / petals);
    
    // Petal shape - rose curve
    const t = particleInPetal / particlesPerPetal;
    const angle = (petalIndex / petals) * Math.PI * 2 + (time * 0.0003);
    
    // Rose curve: r = a * cos(k*θ)
    const k = petals / 2; // For 8 petals
    const baseRadius = 80 + (audio * 40);
    const r = baseRadius * Math.cos(k * t * Math.PI * 2) * (0.3 + t * 0.7);
    
    // Add breathing/blooming effect
    const bloom = Math.sin(time * 0.001) * 0.15 + 1;
    const finalR = r * bloom;
    
    // Convert to cartesian
    const petalAngle = angle + (t * Math.PI * 0.5); // Petal orientation
    const tx = centerX + Math.cos(petalAngle) * finalR;
    const ty = centerY + Math.sin(petalAngle) * finalR;
    
    // Center (stamen)
    if (t < 0.15) {
        const centerR = t * 25;
        const centerAngle = Math.random() * Math.PI * 2;
        return {
            tx: centerX + Math.cos(centerAngle) * centerR,
            ty: centerY + Math.sin(centerAngle) * centerR,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.02,
            targetAlpha: 0.9
        };
    }
    
    // Petal particles
    let targetAlpha = 0.7;
    
    // Outer petals are slightly dimmer
    if (t > 0.8) {
        targetAlpha = 0.5;
    }
    
    // Audio-reactive bloom
    if (visualState.mode === 'speaking' && audio > 0.2) {
        targetAlpha = Math.min(1.0, targetAlpha + audio * 0.3);
    }
    
    // Gentle swaying
    const sway = Math.sin(time * 0.0005 + petalIndex) * 2;

    return {
      tx: tx + sway,
      ty,
      spring: PHYSICS.StandardSpring * 0.9,
      friction: PHYSICS.StandardFriction,
      noise: 0.015,
      targetAlpha
    };
  }
};