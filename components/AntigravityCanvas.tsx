
import type React from 'react';
import { useEffect, useRef } from 'react';
import type { VisualState } from 'types';
import { calculateParticleTarget } from 'utils/visuals/index';
import type { ParticleContext } from 'utils/visuals/types';
import { useTheme } from '../context/ThemeContext';
import { unifiedContext } from '../services/unifiedContext';

interface AntigravityCanvasProps {
  visualState: VisualState;
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
    localTime?: string
  ) {
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

    const { tx, ty, spring, friction, noise, targetAlpha, teleport, scale } = calculateParticleTarget(visualState.shape, context);

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

  draw(ctx: CanvasRenderingContext2D, isDarkMode: boolean) {
    if (this.rad < 0.05 || this.targetAlpha < 0.05) return;
    
    // Use bright particles in dark mode, dark particles in light mode
    if (isDarkMode) {
        ctx.fillStyle = `rgba(220, 220, 230, ${this.targetAlpha * 0.8})`;
    } else {
        ctx.fillStyle = `rgba(20, 20, 20, ${this.targetAlpha})`;
    }
    
    const d = Math.max(0.8, this.rad * 2); 
    ctx.fillRect(Math.floor(this.x), Math.floor(this.y), d, d);
  }
}

const AntigravityCanvas: React.FC<AntigravityCanvasProps> = ({ visualState }) => {
  const { isDarkMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualStateRef = useRef(visualState);
  const isDarkModeRef = useRef(isDarkMode);
  const smoothedAudioRef = useRef(0); 
  const requestRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);

  const buildKeywordPool = (state: VisualState) => {
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
  };
  
  // Clock state
  const currentTimeRef = useRef("");
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
      isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

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

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visualState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true }); 
    if (!ctx) return;

    const initParticles = () => {
        particlesRef.current = [];
        const baseCount = 4000;
        // Increase particle count based on citation count (more citations = more particles)
        const citationCount = visualStateRef.current.citationCount || 0;
        const citationMultiplier = 1 + (citationCount * 0.1); // 10% more particles per citation, max ~2x
        const count = Math.floor(baseCount * Math.min(citationMultiplier, 2.0));
        
        // Use display dimensions (not scaled) for particle initialization
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        for (let i = 0; i < count; i++) {
            particlesRef.current.push(new Particle(displayWidth, displayHeight, i, count));
        }
    };

    // Store display dimensions (not scaled)
    let displayWidth = window.innerWidth;
    let displayHeight = window.innerHeight;

    const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        displayWidth = window.innerWidth;
        displayHeight = window.innerHeight;
        
        // Set actual canvas size in memory (scaled for device pixel ratio)
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // Scale the canvas back down using CSS
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        // Reset transform and scale the drawing context
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        initParticles();
    };

    window.addEventListener('resize', resize);
    resize();

    const animate = (time: number) => {
      const baseState = visualStateRef.current;
      const darkMode = isDarkModeRef.current;
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
      // In dark mode, we clear with pure black for maximum contrast
      if (darkMode) {
          ctx.fillStyle = `rgba(0, 0, 0, ${clearOpacity})`;
      } else {
          ctx.fillStyle = `rgba(248, 249, 250, ${clearOpacity})`;
      }
      ctx.fillRect(0, 0, displayWidth, displayHeight);

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
        p.update(
            displayWidth, 
            displayHeight, 
            mouseRef.current.x, 
            mouseRef.current.y, 
            renderState,
            smoothedAudioRef.current,
            time,
            currentTimeRef.current 
        );
        p.draw(ctx, darkMode);
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (touch) {
            mouseRef.current = { x: touch.clientX, y: touch.clientY };
        }
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-auto touch-none">
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchMove}
            onTouchEnd={() => {
              mouseRef.current = { x: -1000, y: -1000 };
            }}
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
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
