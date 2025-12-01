import React, { useRef, useEffect } from 'react';
import { ResizeObserver } from '@juggle/resize-observer';

interface ServiceIconParticlesProps {
  iconType: 'book' | 'people' | 'code';
  color: 'orange' | 'blue' | 'purple';
  isDarkMode?: boolean;
}

class IconParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  baseRad: number;
  rad: number;
  alpha: number;
  index: number;
  pathIndex: number; // Which path segment this particle belongs to

  constructor(w: number, h: number, index: number, targetX: number, targetY: number, pathIndex: number) {
    this.index = index;
    this.pathIndex = pathIndex;
    this.targetX = targetX;
    this.targetY = targetY;

    // Start from random position
    this.x = Math.random() * w;
    this.y = Math.random() * h;

    this.vx = 0;
    this.vy = 0;

    this.baseRad = Math.random() * 0.5 + 0.5;
    this.rad = this.baseRad;

    this.alpha = 0.7;
  }

  update(_w: number, _h: number, time: number) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Stronger spring when far, gentler when close
    const spring = dist > 2 ? 0.12 : 0.06;
    this.vx += dx * spring;
    this.vy += dy * spring;

    // Subtle noise
    this.vx += (Math.random() - 0.5) * 0.015;
    this.vy += (Math.random() - 0.5) * 0.015;

    // Friction
    this.vx *= 0.94;
    this.vy *= 0.94;

    this.x += this.vx;
    this.y += this.vy;

    // Subtle pulse
    const pulse = Math.sin(time * 1.5 + this.index * 0.15) * 0.08;
    this.rad = this.baseRad + pulse;
    this.alpha = 0.6 + Math.sin(time * 1.2 + this.index * 0.1) * 0.15;
  }

  draw(ctx: CanvasRenderingContext2D, color: 'orange' | 'blue' | 'purple', isDarkMode: boolean) {
    const colors = {
      orange: isDarkMode ? 'rgba(251, 146, 60, ' : 'rgba(249, 115, 22, ',  // Orange 400/500
      blue: isDarkMode ? 'rgba(59, 130, 246, ' : 'rgba(59, 130, 246, ',      // Consistent vibrancy
      purple: isDarkMode ? 'rgba(168, 85, 247, ' : 'rgba(168, 85, 247, '     // Consistent vibrancy
    };

    ctx.fillStyle = colors[color] + this.alpha + ')';

    // Slightly larger particles for better visibility
    const d = Math.max(1.4, this.rad * 2.2);
    ctx.beginPath();
    ctx.arc(this.x, this.y, d / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Generate points along a path
function generatePathPoints(path: { x: number; y: number }[], density: number = 1): { x: number; y: number; pathIndex: number }[] {
  const points: { x: number; y: number; pathIndex: number }[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    if (!start || !end) continue;
    const steps = Math.max(2, Math.ceil(Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    ) * density));

    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      points.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        pathIndex: i
      });
    }
  }

  return points;
}

// Icon shape definitions based on actual SVG paths (scaled to 48x48, viewBox 24x24)
function getIconPaths(iconType: 'book' | 'people' | 'code', w: number, h: number): { x: number; y: number }[][] {
  const scale = Math.min(w, h) / 24;
  const cx = w / 2;
  const cy = h / 2;

  if (iconType === 'book') {
    // Book icon: M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z (left page)
    // M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z (right page)
    const paths: { x: number; y: number }[][] = [];

    // Left page path
    const leftPage: { x: number; y: number }[] = [];
    // Top edge
    for (let i = 0; i <= 6; i++) {
      leftPage.push({ x: cx - 8 * scale + i * scale, y: cy - 8 * scale });
    }
    // Right edge (rounded corner)
    for (let i = 0; i <= 4; i++) {
      const angle = Math.PI / 2 * (i / 4);
      leftPage.push({
        x: cx - 2 * scale + Math.cos(angle) * 4 * scale,
        y: cy - 8 * scale + Math.sin(angle) * 4 * scale
      });
    }
    // Bottom edge
    for (let i = 0; i <= 6; i++) {
      leftPage.push({ x: cx - 2 * scale - i * scale, y: cy + 6 * scale });
    }
    // Left edge
    for (let i = 0; i <= 14; i++) {
      leftPage.push({ x: cx - 8 * scale, y: cy - 8 * scale + i * scale });
    }
    paths.push(leftPage);

    // Right page path
    const rightPage: { x: number; y: number }[] = [];
    // Top edge
    for (let i = 0; i <= 6; i++) {
      rightPage.push({ x: cx + 2 * scale + i * scale, y: cy - 8 * scale });
    }
    // Right edge
    for (let i = 0; i <= 14; i++) {
      rightPage.push({ x: cx + 8 * scale, y: cy - 8 * scale + i * scale });
    }
    // Bottom edge (rounded corner)
    for (let i = 0; i <= 4; i++) {
      const angle = Math.PI / 2 * (i / 4);
      rightPage.push({
        x: cx + 8 * scale - Math.cos(angle) * 4 * scale,
        y: cy + 6 * scale - Math.sin(angle) * 4 * scale
      });
    }
    // Left edge
    for (let i = 0; i <= 6; i++) {
      rightPage.push({ x: cx + 2 * scale - i * scale, y: cy - 2 * scale });
    }
    paths.push(rightPage);

    return paths;
  }

  if (iconType === 'people') {
    // People icon: circle at (9,7) r=4, circle at (16,3.13) r=4, bodies
    const paths: { x: number; y: number }[][] = [];

    // Left person head (circle cx=9 cy=7 r=4)
    const leftHead: { x: number; y: number }[] = [];
    const leftHeadX = cx - 3 * scale;
    const leftHeadY = cy - 2 * scale;
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.2) {
      leftHead.push({
        x: leftHeadX + Math.cos(angle) * 4 * scale,
        y: leftHeadY + Math.sin(angle) * 4 * scale
      });
    }
    paths.push(leftHead);

    // Left person body (M17 21v-2a4 4 0 0 0-4-4H5)
    const leftBody: { x: number; y: number }[] = [];
    leftBody.push({ x: leftHeadX, y: leftHeadY + 4 * scale });
    leftBody.push({ x: leftHeadX, y: cy + 6 * scale });
    paths.push(leftBody);

    // Right person head (circle at 16,3.13)
    const rightHead: { x: number; y: number }[] = [];
    const rightHeadX = cx + 3.5 * scale;
    const rightHeadY = cy - 3.5 * scale;
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.2) {
      rightHead.push({
        x: rightHeadX + Math.cos(angle) * 4 * scale,
        y: rightHeadY + Math.sin(angle) * 4 * scale
      });
    }
    paths.push(rightHead);

    // Right person body
    const rightBody: { x: number; y: number }[] = [];
    rightBody.push({ x: rightHeadX, y: rightHeadY + 4 * scale });
    rightBody.push({ x: rightHeadX, y: cy + 6 * scale });
    paths.push(rightBody);

    return paths;
  }

  if (iconType === 'code') {
    // Code brackets: polyline "16 18 22 12 16 6" and "8 6 2 12 8 18"
    const paths: { x: number; y: number }[][] = [];

    // Left bracket < : (8,6) -> (2,12) -> (8,18)
    const leftBracket: { x: number; y: number }[] = [];
    // Top to middle
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      leftBracket.push({
        x: cx - 4 * scale + (cx - 10 * scale - (cx - 4 * scale)) * t,
        y: cy - 6 * scale + (cy - (cy - 6 * scale)) * t
      });
    }
    // Middle to bottom
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      leftBracket.push({
        x: cx - 10 * scale + (cx - 4 * scale - (cx - 10 * scale)) * t,
        y: cy + (cy + 6 * scale - cy) * t
      });
    }
    paths.push(leftBracket);

    // Right bracket > : (16,6) -> (22,12) -> (16,18)
    const rightBracket: { x: number; y: number }[] = [];
    // Top to middle
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      rightBracket.push({
        x: cx + 4 * scale + (cx + 10 * scale - (cx + 4 * scale)) * t,
        y: cy - 6 * scale + (cy - (cy - 6 * scale)) * t
      });
    }
    // Middle to bottom
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      rightBracket.push({
        x: cx + 10 * scale + (cx + 4 * scale - (cx + 10 * scale)) * t,
        y: cy + (cy + 6 * scale - cy) * t
      });
    }
    paths.push(rightBracket);

    return paths;
  }

  return [];
}

export const ServiceIconParticles: React.FC<ServiceIconParticlesProps> = ({
  iconType,
  color,
  isDarkMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<IconParticle[]>([]);
  const requestRef = useRef<number>(0);
  const isDarkModeRef = useRef(isDarkMode);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;

    const initParticles = (w: number, h: number) => {
      const iconPaths = getIconPaths(iconType, w, h);
      particlesRef.current = [];

      iconPaths.forEach((path, pathIdx) => {
        const pathPoints = generatePathPoints(path, 0.8);
        pathPoints.forEach((point) => {
          // 2-3 particles per point for density
          const particlesPerPoint = pathIdx === 0 ? 2 : 2;
          for (let j = 0; j < particlesPerPoint; j++) {
            particlesRef.current.push(
              new IconParticle(w, h, particlesRef.current.length, point.x, point.y, pathIdx)
            );
          }
        });
      });
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(dpr, dpr);
      initParticles(rect.width, rect.height);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const time = (Date.now() - startTimeRef.current) / 1000;

      // Clear with subtle fade for smooth trails (adjusted for better clarity)
      ctx.fillStyle = isDarkModeRef.current
        ? 'rgba(0, 0, 0, 0.12)'
        : 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Update icon paths
      const iconPaths = getIconPaths(iconType, w, h);
      let particleIdx = 0;

      iconPaths.forEach((path) => {
        const pathPoints = generatePathPoints(path, 0.8);
        pathPoints.forEach((point) => {
          const particlesPerPoint = 2;
          for (let j = 0; j < particlesPerPoint; j++) {
            const particle = particleIdx < particlesRef.current.length ? particlesRef.current[particleIdx] : undefined;
            if (particle) {
              particle.targetX = point.x;
              particle.targetY = point.y;
              particleIdx++;
            }
          }
        });
      });

      // Draw connecting lines for solid appearance
      const iconPaths2 = getIconPaths(iconType, w, h);
      iconPaths2.forEach((path) => {
        ctx.strokeStyle = isDarkModeRef.current
          ? (color === 'orange' ? 'rgba(249, 115, 22, 0.25)' : color === 'blue' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(168, 85, 247, 0.25)')
          : (color === 'orange' ? 'rgba(249, 115, 22, 0.3)' : color === 'blue' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        path.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      });

      // Update and draw particles
      particlesRef.current.forEach(particle => {
        particle.update(w, h, time);
        particle.draw(ctx, color, isDarkModeRef.current);
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(requestRef.current);
    };
  }, [iconType, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 rounded-2xl pointer-events-none"
    />
  );
};
