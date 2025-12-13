
import type React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import type { VisualState, VisualShape } from 'types';
import { calculateParticleTarget } from 'utils/visuals/index';
import type { ParticleContext } from 'utils/visuals/types';
import { bloomRenderer } from 'utils/visuals/bloomRenderer';
import { audioWaveformAnalyzer } from 'utils/visuals/audioWaveformAnalyzer';
import { GestureRecognizer } from 'utils/visuals/gestureRecognizer';
import { shapeMorpher } from 'utils/visuals/shapeMorpher';
import { themeManager } from 'utils/visuals/visualThemes';
import { useTheme } from '../context/ThemeContext';
import { unifiedContext } from '../services/unifiedContext';

interface AntigravityCanvasProps {
  visualState: VisualState;
  chatWidth?: number;
  onShapeChange?: (shape: VisualShape) => void;
  userProfile?: { name?: string; email?: string } | null;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRad: number;
  rad: number;
  baseAlpha: number;
  targetAlpha: number;
  index: number;
  totalParticles: number;
  scale: number; // Z-depth scale
  
  constructor(w: number, h: number, index: number, total: number) {
    this.index = index;
    this.totalParticles = total;
    
    // Initialize near center
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 200; 
    
    this.x = w / 2 + Math.cos(angle) * dist;
    this.y = h / 2 + Math.sin(angle) * dist;
    
    this.vx = 0;
    this.vy = 0;
    
    // Micro-particles for refined look
    this.baseRad = Math.random() * 0.4 + 0.1; 
    this.rad = this.baseRad;
    
    this.baseAlpha = Math.random() * 0.6 + 0.2;
    this.targetAlpha = this.baseAlpha;
    this.scale = 1;
  }

  update(
    w: number,
    h: number,
    mouseX: number,
    mouseY: number,
    visualState: VisualState,
    smoothedAudio: number,
    time: number,
    localTime?: string,
    customTarget?: { tx: number; ty: number; spring: number; friction: number; noise: number; targetAlpha?: number; teleport?: any; scale?: number }
  ) {
    let tx, ty, spring, friction, noise, targetAlpha, teleport, scale;

    if (customTarget) {
      // Use provided custom target (for morphing)
      ({ tx, ty, spring, friction, noise, targetAlpha, teleport, scale } = customTarget);
    } else {
      // Calculate target normally
      const context: ParticleContext = {
          index: this.index,
          total: this.totalParticles,
          width: w,
          height: h,
          time,
          audio: smoothedAudio, // Smoothed audio for general reactivity
          rawAudio: Math.max(visualState.audioLevel || 0, 0), // Raw instantaneous audio (clamped to 0+)
          mouse: { x: mouseX, y: mouseY },
          p: { x: this.x, y: this.y, baseAlpha: this.baseAlpha },
          visualState,
          ...(localTime !== undefined ? { localTime } : {})
      };

      ({ tx, ty, spring, friction, noise, targetAlpha, teleport, scale } = calculateParticleTarget(visualState.shape, context));
    }

    this.targetAlpha = targetAlpha ?? this.baseAlpha;
    
    // Smoothly interpolate scale for depth effect
    const targetScale = scale ?? 1;
    this.scale += (targetScale - this.scale) * 0.15;
    
    if (teleport) {
        this.x = teleport.x;
        this.y = teleport.y;
        this.vx = teleport.vx;
        this.vy = teleport.vy;
        return;
    }

    // Forces
    const dx = tx - this.x;
    const dy = ty - this.y;
    
    // Physics Integration
    this.vx += dx * spring;
    this.vy += dy * spring;
    
    // Orbit boost
    if (['orb', 'planet', 'atom'].includes(visualState.shape)) {
        const orbitSpeed = visualState.mode === 'speaking' ? 0.05 : 0.01; 
        const cx = w/2, cy = h/2;
        const odx = this.x - cx, ody = this.y - cy;
        const angle = Math.atan2(ody, odx);
        const dist = Math.sqrt(odx*odx + ody*ody);
        this.vx += Math.sin(angle) * orbitSpeed * dist * 0.02;
        this.vy -= Math.cos(angle) * orbitSpeed * dist * 0.02;
    }

    // Reasoning complexity affects particle behavior
    const reasoningComplexity = visualState.reasoningComplexity || 0;
    let adjustedNoise = noise;
    let adjustedFriction = friction;
    
    if (reasoningComplexity > 0) {
        adjustedNoise = noise * (1 + reasoningComplexity * 0.5);
        adjustedFriction = friction * (1 - reasoningComplexity * 0.2);
    }
    
    // Apply noise
    this.vx += (Math.random() - 0.5) * adjustedNoise;
    this.vy += (Math.random() - 0.5) * adjustedNoise;

    // Mouse Repulsion
    if (mouseX >= 0 && mouseY >= 0) {
        const mx = this.x - mouseX;
        const my = this.y - mouseY;
        const mDist = Math.sqrt(mx * mx + my * my);
        if (mDist < 100) {
            const force = (1 - mDist / 100) * 0.5; 
            const ang = Math.atan2(my, mx);
            this.vx += Math.cos(ang) * force;
            this.vy += Math.sin(ang) * force;
        }
    }

    // Audio Reactive Size
    let targetR = this.baseRad;
    if (visualState.shape === 'face') {
        targetR = this.baseRad * 0.6; 
    } else if (visualState.mode === 'speaking') {
        targetR = this.baseRad * (1 + visualState.audioLevel * 0.4); 
    } else if (visualState.mode === 'listening') {
        targetR = this.baseRad * (1 + smoothedAudio * 0.2);
    }
    
    targetR *= this.scale;
    this.rad += (targetR - this.rad) * 0.2;

    // Integration
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= adjustedFriction;
    this.vy *= adjustedFriction;
  }

  draw(ctx: CanvasRenderingContext2D, isDarkMode: boolean, _trailsEnabled?: boolean, particleColors?: { primary: string; secondary: string; accent: string }) {
    if (this.rad < 0.05 || this.targetAlpha < 0.05) return;

    // Use custom colors if provided, otherwise default theme-based colors
    let color = isDarkMode ? 'rgba(220, 220, 230, 0.8)' : 'rgba(20, 20, 20, 1.0)';
    if (particleColors) {
      // Use primary color with alpha based on mode
      const baseColor = particleColors.primary;
      const alpha = isDarkMode ? this.targetAlpha * 0.8 : this.targetAlpha;
      color = this.hexToRgba(baseColor, alpha);
    }

    ctx.fillStyle = color;

    const d = Math.max(0.8, this.rad * 2);
    ctx.fillRect(Math.floor(this.x), Math.floor(this.y), d, d);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

class ParticleTrail {
  positions: Array<{x: number, y: number, alpha: number, age: number}> = [];
  maxLength = 15;
  decayRate = 0.05;

  constructor(length: number = 15, decay: number = 0.05) {
    this.maxLength = length;
    this.decayRate = decay;
  }

  update(x: number, y: number, alpha: number) {
    this.positions.unshift({x, y, alpha, age: 0});
    if (this.positions.length > this.maxLength) {
      this.positions.pop();
    }
    // Age existing positions
    this.positions.forEach(pos => {
      pos.age += 1;
      pos.alpha *= (1 - this.decayRate);
    });
  }

  draw(ctx: CanvasRenderingContext2D, isDarkMode: boolean, particleColors?: { primary: string; secondary: string; accent: string }) {
    this.positions.forEach((pos, i) => {
      const trailAlpha = pos.alpha * (1 - i/this.maxLength);
      if (trailAlpha < 0.01) return;

      // Use same color logic as particles
      let color = isDarkMode ? 'rgba(220, 220, 230, 0.3)' : 'rgba(20, 20, 20, 0.3)';
      if (particleColors) {
        const baseColor = particleColors.secondary || particleColors.primary;
        color = this.hexToRgba(baseColor, trailAlpha * 0.5);
      }

      ctx.fillStyle = color;
      const size = Math.max(0.5, 2 - i * 0.1);
      ctx.fillRect(Math.floor(pos.x), Math.floor(pos.y), size, size);
    });
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

const AntigravityCanvas: React.FC<AntigravityCanvasProps> = ({ visualState, chatWidth = 0, onShapeChange, userProfile }) => {
  const { isDarkMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualStateRef = useRef(visualState);
  const isDarkModeRef = useRef(isDarkMode);
  const smoothedAudioRef = useRef(0); 
  const requestRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<Map<number, ParticleTrail>>(new Map());
  const audioWaveformRef = useRef(audioWaveformAnalyzer);
  const chatWidthRef = useRef(chatWidth);
  const resizeCallbackRef = useRef<(() => void) | null>(null);
  const performanceRef = useRef({ fps: 60, frameCount: 0, lastTime: 0 });

  // Gesture recognition
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);

  // Initialize gesture recognizer
  useEffect(() => {
    gestureRecognizerRef.current = new GestureRecognizer((shape) => {
      // Trigger shape change through callback
      onShapeChange?.(shape);
    });
  }, [onShapeChange]);

  const buildKeywordPool = useCallback((state: VisualState) => {
    const snapshot = unifiedContext.getSnapshot();
    const research = snapshot.researchContext;
    const intel = snapshot.intelligenceContext || {};
    const words: string[] = [];

    const pushWords = (arr?: (string | undefined)[]) => {
        arr?.forEach(w => {
            if (!w) return;
            const trimmed = w.trim();
            if (trimmed.length > 3 && trimmed.length < 48) words.push(trimmed);
        });
    };

    // From research findings
    if (research) {
        pushWords([
            research.company?.name,
            research.company?.industry,
            research.company?.domain,
            research.person?.fullName,
            research.role
        ]);
        pushWords(research.strategic?.competitors);
        pushWords(research.strategic?.market_trends);
        pushWords(research.strategic?.pain_points);
    }

    // From intelligence context if present
    if (intel.company) {
        pushWords([intel.company.name, intel.company.industry, intel.company.domain]);
    }
    if (intel.person) {
        pushWords([intel.person.fullName, intel.person.role]);
    }
    if (intel.strategic) {
        pushWords(intel.strategic.competitors);
        pushWords(intel.strategic.market_trends);
        pushWords(intel.strategic.pain_points);
    }

    // From current textContent
    if (state.textContent) {
        pushWords(
            state.textContent
                .split(/[\s,.;:/\n]+/)
                .map(w => w.trim())
        );
    }

    const unique = Array.from(new Set(words)).slice(0, 10);
    if (unique.length > 0) return unique;
    if (state.researchActive) return ['Research', 'Context', 'Signals', 'Leads', 'Trends', 'Insights'];
    return ['Research'];
  }, []);
  
  // Clock state
  const currentTimeRef = useRef("");
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
      isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  useEffect(() => {
    chatWidthRef.current = chatWidth;
    // Trigger resize when chat width changes
    if (resizeCallbackRef.current) {
      resizeCallbackRef.current();
    }
  }, [chatWidth]);

  useEffect(() => {
    visualStateRef.current = visualState;

    // Handle Clock Mode
    if (visualState.shape === 'clock') {
         const updateTime = () => {
             const now = new Date();
             const hours = now.getHours().toString().padStart(2, '0');
             const minutes = now.getMinutes().toString().padStart(2, '0');
             currentTimeRef.current = `${hours}:${minutes}`;
         };
         updateTime();
         timerRef.current = setInterval(updateTime, 1000);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }

    // Select theme based on user profile
    themeManager.selectThemeFromUser(userProfile);

    // Apply theme to visual state
    const themedVisualState = themeManager.applyToVisualState(visualState);

  // Handle Audio Waveform Connection
    if (themedVisualState.waveformEnabled && (themedVisualState.shape === 'wave' || themedVisualState.shape === 'scanner')) {
      // Try to connect to any available audio stream
      const connectToAudio = async () => {
        try {
          // Get audio stream from user media if available
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          audioWaveformRef.current.connectAudioStream(stream);
        } catch (error) {
          console.warn('Could not connect audio waveform analyzer:', error);
        }
      };

      connectToAudio();
    } else {
      audioWaveformRef.current.disconnectAudioStream();
    }

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        audioWaveformRef.current.disconnectAudioStream();
    };
  }, [visualState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true }); 
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;

    const initParticles = () => {
        particlesRef.current = [];
        const baseCount = 4000;
        // Increase particle count based on citation count (more citations = more particles)
        const citationCount = visualStateRef.current.citationCount || 0;
        const citationMultiplier = 1 + (citationCount * 0.1); // 10% more particles per citation, max ~2x

        // Adaptive particle count based on performance
        const performanceMultiplier = Math.min(1.0, performanceRef.current.fps / 50);
        const count = Math.floor(baseCount * Math.min(citationMultiplier, 2.0) * performanceMultiplier);
        
        // Use current display dimensions for particle initialization
        const currentWidth = displayWidth;
        const currentHeight = displayHeight;
        
        for (let i = 0; i < count; i++) {
            particlesRef.current.push(new Particle(currentWidth, currentHeight, i, count));
        }
    };

    const adjustParticlesToBounds = () => {
        // Constrain existing particles to visible bounds (left side only)
        particlesRef.current.forEach(p => {
            // If particle is outside visible area (right of chat panel), move it to left side
            if (p.x > displayWidth || p.x < 0 || p.y < 0 || p.y > displayHeight) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * Math.min(displayWidth, displayHeight) * 0.3;
                p.x = displayWidth / 2 + Math.cos(angle) * dist;
                // Ensure particle stays within visible bounds
                p.x = Math.max(0, Math.min(displayWidth, p.x));
                p.y = displayHeight / 2 + Math.sin(angle) * dist;
                p.y = Math.max(0, Math.min(displayHeight, p.y));
                p.vx = 0;
                p.vy = 0;
            }
        });
    };

    // Store full window dimensions for canvas (always full-screen)
    let fullWidth = window.innerWidth;
    let fullHeight = window.innerHeight;
    
    // Store visible area dimensions (excludes chat panel)
    let displayWidth = fullWidth - chatWidthRef.current;
    let displayHeight = fullHeight;

    const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        
        // Get full window dimensions
        fullWidth = window.innerWidth;
        fullHeight = window.innerHeight;
        
        // Calculate visible area (excludes chat) - use ref to get latest value
        const newDisplayWidth = fullWidth - chatWidthRef.current;
        const newDisplayHeight = fullHeight;
        
        // Canvas matches visible area (not full screen)
        canvas.width = newDisplayWidth * dpr;
        canvas.height = newDisplayHeight * dpr;
        
        // Canvas CSS matches visible area
        canvas.style.width = `${newDisplayWidth}px`;
        canvas.style.height = `${newDisplayHeight}px`;
        
        // Reset transform and scale the drawing context
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        // Update display dimensions for particle constraints
        const widthChanged = displayWidth !== newDisplayWidth;
        displayWidth = newDisplayWidth;
        displayHeight = newDisplayHeight;
        
        // Adjust existing particles to new bounds if width changed
        if (widthChanged && particlesRef.current.length > 0) {
            adjustParticlesToBounds();
        } else if (particlesRef.current.length === 0) {
            initParticles();
        }
    };

    // Store resize callback so it can be triggered from outside
    resizeCallbackRef.current = resize;

    // Use ResizeObserver to watch container size changes (handles drag/resize)
    const resizeObserver = new ResizeObserver(() => {
        resize();
    });
    resizeObserver.observe(container);

    // Also listen to window resize as fallback
    window.addEventListener('resize', resize);
    resize();

    const animate = (time: number) => {
      // Performance monitoring
      performanceRef.current.frameCount++;
      if (performanceRef.current.frameCount % 60 === 0) {
        const now = performance.now();
        const deltaTime = now - performanceRef.current.lastTime;
        performanceRef.current.fps = 1000 / (deltaTime / 60);
        performanceRef.current.lastTime = now;
      }

      const baseState = themeManager.applyToVisualState(visualStateRef.current);
      const darkMode = isDarkModeRef.current;
      // Use visible area center for calculations
      const cx = displayWidth / 2;
      const cy = displayHeight / 2;

      // When research is active, morph particles into rotating keywords using text shape
      let renderState = baseState;
      if (baseState.researchActive) {
          const pool = buildKeywordPool(baseState);
          const idx = pool.length ? Math.floor((time * 0.00025)) % pool.length : 0;
          const keyword = pool[idx] || 'Research';
          renderState = {
              ...baseState,
              shape: 'text',
              textContent: keyword
          };
      }
      
      smoothedAudioRef.current += (renderState.audioLevel - smoothedAudioRef.current) * 0.3; 
      
      let clearOpacity = 0.25; 
      if (['dna','grid','globe','brain','constellation','face','weather','chart','map','clock','code'].includes(renderState.shape)) clearOpacity = 0.18; 
      if (renderState.mode === 'speaking') clearOpacity = 0.3; 
      
      // Dynamic background clear for trails
      // Match App.tsx background exactly: bg-gray-50 (#f9fafb) or bg-black (#000000)
      if (darkMode) {
          ctx.fillStyle = `rgba(0, 0, 0, ${clearOpacity})`; // #000000 = bg-black
      } else {
          ctx.fillStyle = `rgba(249, 250, 251, ${clearOpacity})`; // #f9fafb = bg-gray-50
      }
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Create a snapshot of the current canvas state before bloom
      const preBloomImageData = ctx.getImageData(0, 0, displayWidth, displayHeight);

      // Constellation Lines
      if (renderState.shape === 'constellation') {
         const numNodes = 6;
         const nodeSpeed = time * 0.0005;
         const nodes: {x:number, y:number}[] = [];
         for(let i=0; i<numNodes; i++) {
             const nx = cx + Math.cos(i * 1.5 + nodeSpeed) * (140 + Math.sin(time * 0.001 + i) * 40);
             const ny = cy + Math.sin(i * 2.1 + nodeSpeed * 0.8) * (100 + Math.cos(time * 0.0015 + i) * 30);
             nodes.push({x: nx, y: ny});
         }
         ctx.beginPath();
         ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
         ctx.lineWidth = 0.5;
        for(let i=0; i<numNodes; i++) {
            for(let j=i+1; j<numNodes; j++) {
                const nodeI = nodes[i];
                const nodeJ = nodes[j];
                if (nodeI && nodeJ) {
                    ctx.moveTo(nodeI.x, nodeI.y);
                    ctx.lineTo(nodeJ.x, nodeJ.y);
                }
            }
        }
         ctx.stroke();
      }

      // Chart Grid Lines (Background Only)
      if (renderState.shape === 'chart') {
          const graphWidth = displayWidth * 0.6;
          const graphHeight = 200;
          const startX = cx - graphWidth/2;
          
          ctx.beginPath();
          ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
          ctx.lineWidth = 1;
          for (let i=0; i<=5; i++) {
              const x = startX + (graphWidth * i / 5);
              ctx.moveTo(x, cy - graphHeight/2);
              ctx.lineTo(x, cy + graphHeight/2);
          }
          for (let i=0; i<=4; i++) {
              const y = (cy - graphHeight/2) + (graphHeight * i / 4);
              ctx.moveTo(startX, y);
              ctx.lineTo(startX + graphWidth, y);
          }
          ctx.stroke();
      }

      // Research Mode Visualization (when research is active)
      if (baseState.researchActive && renderState.shape === 'scanner') {
          // Draw scanning lines effect
          const scanSpeed = time * 0.003;
          const scanY = (cy - displayHeight * 0.3) + (Math.sin(scanSpeed) * displayHeight * 0.6);
          
          ctx.beginPath();
          ctx.strokeStyle = darkMode ? 'rgba(255, 165, 0, 0.3)' : 'rgba(255, 140, 0, 0.4)';
          ctx.lineWidth = 2;
          ctx.moveTo(0, scanY);
          ctx.lineTo(displayWidth, scanY);
          ctx.stroke();
          
          // Draw pulsing circles at citation points
          const citationCount = baseState.citationCount || 0;
          if (citationCount > 0) {
              const angleStep = (Math.PI * 2) / citationCount;
              for (let i = 0; i < citationCount; i++) {
                  const angle = angleStep * i + scanSpeed;
                  const radius = 80 + Math.sin(time * 0.002 + i) * 20;
                  const px = cx + Math.cos(angle) * radius;
                  const py = cy + Math.sin(angle) * radius;
                  
                  const pulse = 0.5 + Math.sin(time * 0.005 + i) * 0.5;
                  ctx.beginPath();
                  ctx.fillStyle = darkMode 
                      ? `rgba(255, 165, 0, ${0.2 * pulse})` 
                      : `rgba(255, 140, 0, ${0.3 * pulse})`;
                  ctx.arc(px, py, 3 + pulse * 2, 0, Math.PI * 2);
                  ctx.fill();
              }
          }
      }

      particlesRef.current.forEach(p => {
        // Create particle context
        const particleCtx: ParticleContext = {
          index: p.index,
          total: particlesRef.current.length,
          width: displayWidth,
          height: displayHeight,
          time,
          audio: smoothedAudioRef.current,
          rawAudio: Math.max(renderState.audioLevel || 0, 0),
          mouse: mouseRef.current,
          p: { x: p.x, y: p.y, baseAlpha: p.baseAlpha },
          visualState: renderState,
          localTime: currentTimeRef.current
        };

        // Get target position - use morphed position if morphing is active
        let targetResult;
        if (shapeMorpher.isActive() && renderState.morphingTo) {
          targetResult = shapeMorpher.getMorphedPosition(particleCtx);
        } else {
          targetResult = calculateParticleTarget(renderState.shape, particleCtx);
        }

        // Update particle with calculated target
        p.update(
            displayWidth,
            displayHeight,
            mouseRef.current.x,
            mouseRef.current.y,
            {
              ...renderState,
              shape: renderState.morphingTo || renderState.shape // Use target shape for physics
            },
            smoothedAudioRef.current,
            time,
            currentTimeRef.current,
            targetResult // Pass custom target if morphed
        );

        // Update trails if enabled
        if (renderState.trailsEnabled) {
          let trail = trailsRef.current.get(p.index);
          if (!trail) {
            trail = new ParticleTrail(15, 0.05);
            trailsRef.current.set(p.index, trail);
          }
          trail.update(p.x, p.y, p.targetAlpha);
        }

        // Performance optimizations: LOD and culling
        const distanceFromCenter = Math.sqrt(
          Math.pow(p.x - displayWidth / 2, 2) +
          Math.pow(p.y - displayHeight / 2, 2)
        );

        // Adaptive particle count based on performance
        const targetFPS = 50;
        const currentFPS = performanceRef.current.fps;
        const lodFactor = Math.min(1.0, currentFPS / targetFPS);

        // Distance-based LOD: reduce alpha and skip drawing for distant particles
        const maxDistance = Math.sqrt(displayWidth * displayWidth + displayHeight * displayHeight) / 2;
        const distanceFactor = 1 - (distanceFromCenter / maxDistance);

        // Only draw particles that are in the visible area and pass LOD
        if (p.x >= 0 && p.x <= displayWidth && p.y >= 0 && p.y <= displayHeight &&
            distanceFactor > 0.1 && lodFactor > 0.3) {

          // Adjust alpha based on distance and performance
          const originalAlpha = p.targetAlpha;
          p.targetAlpha *= distanceFactor * lodFactor;

          p.draw(ctx, darkMode, renderState.trailsEnabled, renderState.particleColors);

          // Draw trails if enabled (with LOD)
          if (renderState.trailsEnabled && distanceFactor > 0.3) {
            const trail = trailsRef.current.get(p.index);
            if (trail) {
              trail.draw(ctx, darkMode, renderState.particleColors);
            }
          }

          // Restore original alpha
          p.targetAlpha = originalAlpha;
        }
      });

      // Apply bloom effect if enabled
      if (renderState.bloomEnabled) {
        bloomRenderer.renderBloom(canvasRef.current!, ctx, {
          enabled: true,
          intensity: renderState.bloomIntensity || 1.2,
          radius: renderState.bloomRadius || 8,
          threshold: 0.3 // Extract brighter particles for bloom
        });
      }

      // Remove unused variable
      void preBloomImageData;

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [buildKeywordPool]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x: e.clientX, y: e.clientY };

      // Update gesture recognizer
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.onPointerMove(x, y);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && gestureRecognizerRef.current) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      gestureRecognizerRef.current.onPointerDown(x, y);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && gestureRecognizerRef.current) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      gestureRecognizerRef.current.onPointerUp(x, y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      if (touch) {
        mouseRef.current = { x: touch.clientX, y: touch.clientY };

        // Update gesture recognizer
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && gestureRecognizerRef.current) {
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          gestureRecognizerRef.current.onPointerMove(x, y);
        }
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      if (touch) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && gestureRecognizerRef.current) {
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          gestureRecognizerRef.current.onPointerDown(x, y);
        }
      }
    }
  };

  const handleTouchEnd = (_e: React.TouchEvent) => {
    if (gestureRecognizerRef.current) {
      // Use the last known position
      gestureRecognizerRef.current.onPointerUp(mouseRef.current.x, mouseRef.current.y);
    }
  };

  // Calculate visible width (excludes chat panel)
  const visibleWidth = typeof window !== 'undefined' ? window.innerWidth - (chatWidth || 0) : '100%';

  return (
    <div 
        className="fixed top-0 left-0 h-full z-0 pointer-events-auto touch-none overflow-hidden"
        style={{ 
            width: `${visibleWidth}px`,
            backgroundColor: isDarkMode ? '#000000' : '#f9fafb' // Match App.tsx bg-black / bg-gray-50
        }}
    >
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ background: 'transparent' }}
        />
        
        {/* DOM Overlays (Clean/Minimal) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            
            {/* Weather Overlay - Condition Label Only (Temp is now particles) */}
            {visualState.shape === 'weather' && visualState.weatherData?.condition && (
                <div className="animate-fade-in-up absolute top-[60%] flex flex-col items-center gap-2">
                     <div className={`text-[10px] font-mono tracking-[0.4em] uppercase backdrop-blur-sm px-3 py-1 rounded-full border ${isDarkMode ? 'text-white/40 bg-black/40 border-white/10' : 'text-black/40 bg-white/40 border-white/20'}`}>
                        {visualState.weatherData.condition}
                    </div>
                </div>
            )}

            {/* Chart Overlay - Label Only (Value is now particles) */}
            {visualState.shape === 'chart' && visualState.chartData?.value && (
                <div className="animate-fade-in-up flex flex-col items-center gap-2 pt-[160px]">
                    <div className={`text-[10px] font-mono tracking-[0.4em] uppercase ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
                        Current Value
                    </div>
                </div>
            )}
            
             {/* Map Overlay Title */}
            {visualState.shape === 'map' && visualState.mapData?.title && (
                <div className="absolute top-[60%] flex flex-col items-center animate-fade-in-up">
                    <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>{visualState.mapData.title}</h3>
                    <div className={`text-[10px] font-mono tracking-[0.2em] mt-1 uppercase ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
                        Location Pinned
                    </div>
                </div>
            )}

            {/* Source Badge Overlay - Shows citation/source count */}
            {visualState.sourceCount !== undefined && visualState.sourceCount > 0 && (
                <div className="absolute top-6 right-6 animate-fade-in-up">
                    <div className={`flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-lg ${isDarkMode ? 'bg-black/60 border-orange-500/30 text-orange-400' : 'bg-white/80 border-orange-300 text-orange-700'}`}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Source link">
                            <title>Source link icon</title>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        <span className="text-xs font-semibold">{visualState.sourceCount}</span>
                        <span className="text-[10px] opacity-70">{visualState.sourceCount === 1 ? 'source' : 'sources'}</span>
                    </div>
                </div>
            )}


            {/* Reasoning Complexity Indicator - Subtle visual feedback */}
            {visualState.reasoningComplexity !== undefined && visualState.reasoningComplexity > 0.3 && (
                <div className="absolute bottom-6 right-6 animate-fade-in-up">
                    <div className={`flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-lg ${isDarkMode ? 'bg-black/60 border-purple-500/30 text-purple-400' : 'bg-white/80 border-purple-300 text-purple-700'}`}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Reasoning complexity">
                            <title>Reasoning complexity icon</title>
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        <span className="text-xs font-semibold">
                            {visualState.reasoningComplexity < 0.5 ? 'Thinking' : visualState.reasoningComplexity < 0.8 ? 'Deep Analysis' : 'Complex Reasoning'}
                        </span>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default AntigravityCanvas;
