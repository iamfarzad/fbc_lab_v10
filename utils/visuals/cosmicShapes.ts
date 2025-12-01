
import { ParticleContext, ShapeResult } from './types';
import { cx, cy, PHYSICS } from './mathHelpers';

export const CosmicShapes = {
  planet(ctx: ParticleContext): ShapeResult {
    const { index, total, time } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);

    // Animation Timeline (based on time since shape activation)
    // Use a cycle that resets to show the zoom effect periodically
    const cycleDuration = 12000; // 12 second cycle
    const cycleTime = time % cycleDuration;
    
    // Phase 1: Milky Way (0-3s)
    // Phase 2: Arrow appears, zoom starts (1-4s)
    // Phase 3: Zooming in (4-8s)
    // Phase 4: Solar system (8-12s)
    
    const milkyWayPhase = cycleTime < 3000;
    const arrowPhase = cycleTime > 1000 && cycleTime < 4000;
    const zoomPhase = cycleTime > 4000 && cycleTime < 8000;
    const solarSystemPhase = cycleTime >= 8000;
    
    // Zoom interpolation (0 = Milky Way view, 1 = Solar System view)
    let zoomProgress = 0;
    if (zoomPhase) {
        zoomProgress = (cycleTime - 4000) / 4000; // 0 to 1 during zoom
        // Smooth easing
        zoomProgress = zoomProgress * zoomProgress * (3 - 2 * zoomProgress);
    } else if (solarSystemPhase) {
        zoomProgress = 1;
    }
    
    // Scale factor: starts huge (Milky Way), ends at normal (Solar System)
    const milkyWayScale = 50; // Much larger scale for galaxy view
    const solarSystemScale = 1;
    const currentScale = milkyWayScale * (1 - zoomProgress) + solarSystemScale * zoomProgress;
    
    // Offset for zoom target (where we're zooming to)
    const zoomTargetX = centerX + 200; // Solar system location in galaxy
    const zoomTargetY = centerY - 100;
    const offsetX = (zoomTargetX - centerX) * (1 - zoomProgress);
    const offsetY = (zoomTargetY - centerY) * (1 - zoomProgress);

    // Dedicate particles for arrow (15% of total)
    const arrowParticleStart = Math.floor(total * 0.85);
    const arrowParticleCount = total - arrowParticleStart;
    const isArrowParticle = index >= arrowParticleStart;
    
    // Handle arrow particles separately
    if (isArrowParticle) {
        if (arrowPhase) {
            const arrowIndex = index - arrowParticleStart;
            const arrowBaseX = zoomTargetX;
            const arrowBaseY = zoomTargetY;
            const arrowLength = 150 * currentScale;
            const arrowAngle = Math.PI * 0.35; // Angle pointing to solar system
            
            // Arrow visibility pulse
            const pulse = Math.sin(time * 0.005) * 0.3 + 0.7;
            
            // Arrow shaft (70% of arrow particles)
            if (arrowIndex < arrowParticleCount * 0.7) {
                const shaftProgress = arrowIndex / (arrowParticleCount * 0.7);
                const shaftX = arrowBaseX + Math.cos(arrowAngle) * arrowLength * shaftProgress;
                const shaftY = arrowBaseY + Math.sin(arrowAngle) * arrowLength * shaftProgress;
                
                return {
                    tx: shaftX,
                    ty: shaftY,
                    spring: 0.2,
                    friction: 0.85,
                    noise: 0,
                    targetAlpha: 1.0 * pulse
                };
            }
            
            // Arrowhead (30% of arrow particles)
            const headIndex = arrowIndex - Math.floor(arrowParticleCount * 0.7);
            const headTotal = arrowParticleCount - Math.floor(arrowParticleCount * 0.7);
            const headProgress = headIndex / headTotal;
            
            const headCenterX = arrowBaseX + Math.cos(arrowAngle) * arrowLength * 0.85;
            const headCenterY = arrowBaseY + Math.sin(arrowAngle) * arrowLength * 0.85;
            const headSize = 40 * currentScale;
            
            // Arrowhead shape (triangle)
            const headAngle1 = arrowAngle + Math.PI;
            const headAngle2 = arrowAngle + Math.PI + Math.PI/6;
            const headAngle3 = arrowAngle + Math.PI - Math.PI/6;
            
            let headAngle;
            if (headProgress < 0.33) {
                headAngle = headAngle1;
            } else if (headProgress < 0.66) {
                headAngle = headAngle2;
            } else {
                headAngle = headAngle3;
            }
            
            const headOffset = headSize * (0.3 + headProgress * 0.7);
            const headX = headCenterX + Math.cos(headAngle) * headOffset;
            const headY = headCenterY + Math.sin(headAngle) * headOffset;
            
            return {
                tx: headX,
                ty: headY,
                spring: 0.2,
                friction: 0.85,
                noise: 0,
                targetAlpha: 1.0 * pulse
            };
        } else {
            // Hide arrow particles when not in arrow phase
            return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
        }
    }
    
    // Regular particles for Milky Way / Solar System
    const regularIndex = index;
    const regularTotal = arrowParticleStart;

    // MILKY WAY VIEW
    if (milkyWayPhase || (!solarSystemPhase && zoomProgress < 0.3)) {
        // Galaxy spiral arms
        const armIndex = regularIndex % 4; // 4 spiral arms
        const armAngle = (armIndex / 4) * Math.PI * 2;
        
        // Spiral arm particles
        const t = (regularIndex / regularTotal);
        const spiralTurns = 3;
        const spiralAngle = t * spiralTurns * Math.PI * 2 + armAngle + (time * 0.0001);
        const spiralR = t * 800 * currentScale;
        
        // Galaxy center
        if (t < 0.1) {
            const centerR = t * 200 * currentScale;
            const centerAngle = Math.random() * Math.PI * 2;
            return {
                tx: centerX + Math.cos(centerAngle) * centerR + offsetX,
                ty: centerY + Math.sin(centerAngle) * centerR + offsetY,
                spring: 0.03,
                friction: 0.95,
                noise: 0.02,
                targetAlpha: 0.6
            };
        }
        
        // Spiral arms
        const tx = centerX + Math.cos(spiralAngle) * spiralR + offsetX;
        const ty = centerY + Math.sin(spiralAngle) * spiralR + offsetY;
        
        return {
            tx,
            ty,
            spring: 0.02,
            friction: 0.96,
            noise: 0.01,
            targetAlpha: 0.4 * (1 - zoomProgress * 0.5)
        };
    }
    

    // SOLAR SYSTEM Configuration
    const planets = [
        { r: 45, s: 2.5, size: 3 },    // Mercury
        { r: 70, s: 1.5, size: 5 },    // Venus
        { r: 100, s: 1.0, size: 6 },   // Earth
        { r: 130, s: 0.8, size: 4 },   // Mars
        { r: 190, s: 0.4, size: 14 },  // Jupiter
        { r: 250, s: 0.3, size: 12 },  // Saturn
        { r: 300, s: 0.2, size: 8 },   // Uranus
        { r: 340, s: 0.15, size: 8 }   // Neptune
    ];

    // Interpolate solar system position during zoom
    const solarX = centerX * zoomProgress + zoomTargetX * (1 - zoomProgress);
    const solarY = centerY * zoomProgress + zoomTargetY * (1 - zoomProgress);
    
    // Apply scale
    const scaledPlanets = planets.map(p => ({
        ...p,
        r: p.r * currentScale,
        size: p.size * currentScale
    }));

    // 1. The Sun (Center ~5% of regular particles)
    if (regularIndex < regularTotal * 0.05) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 25 * currentScale; 
        const pulse = Math.sin(time * 0.002) * 2 * currentScale;
        return {
            tx: solarX + Math.cos(angle) * (r + pulse),
            ty: solarY + Math.sin(angle) * (r + pulse),
            spring: 0.05,
            friction: 0.9,
            noise: 0.15,
            targetAlpha: 0.9 * zoomProgress + 0.3 * (1 - zoomProgress)
        };
    }

    // 2. Asteroid Belt & Planets
    const remainingIndex = regularIndex - (regularTotal * 0.05);
    const totalRem = regularTotal * 0.95;
    
    // Asteroid Belt
    const asteroidBeltStart = totalRem * 0.45;
    const asteroidBeltEnd = totalRem * 0.50;
    
    if (remainingIndex > asteroidBeltStart && remainingIndex < asteroidBeltEnd) {
        const angle = (remainingIndex * 0.5) + (time * 0.0001);
        const r = (150 + (Math.random() * 20)) * currentScale;
        return {
            tx: solarX + Math.cos(angle) * r,
            ty: solarY + Math.sin(angle) * r,
            spring: 0.01,
            friction: 0.95,
            noise: 0.05,
            targetAlpha: (0.7 * zoomProgress) + (0.2 * (1 - zoomProgress))
        };
    }

    // Planets
    const particlesPerPlanet = totalRem / 9;
    const planetIndex = Math.floor(remainingIndex / particlesPerPlanet);
    
    if (planetIndex < 8) {
        const p = scaledPlanets[planetIndex];
        const pIndex = remainingIndex % particlesPerPlanet;
        
        // Orbit Ring (70% of particles for this planet section)
        if (pIndex < particlesPerPlanet * 0.7) {
             const angle = (pIndex / (particlesPerPlanet * 0.7)) * Math.PI * 2;
             const alpha = (0.2 * zoomProgress) + (0.05 * (1 - zoomProgress));
             return {
                 tx: solarX + Math.cos(angle) * (p?.r || 0),
                 ty: solarY + Math.sin(angle) * (p?.r || 0),
                 spring: PHYSICS.StandardSpring,
                 friction: PHYSICS.StandardFriction,
                 noise: 0,
                 targetAlpha: alpha
             };
        } else {
            // Planet Body - only visible during zoom/solar system phase
            if (zoomProgress > 0.2) {
                const planet = planets[planetIndex];
                if (!planet || !p) return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
                const orbitAngle = (time * 0.0005 * planet.s) + (planetIndex * 2.5);
                const px = solarX + Math.cos(orbitAngle) * p.r;
                const py = solarY + Math.sin(orbitAngle) * p.r;
                
                // Saturn Rings
                if (planetIndex === 5 && Math.random() > 0.4) {
                     const ringAngle = Math.random() * Math.PI * 2;
                     const ringR = (p.size + 4 + (Math.random() * 6));
                     return {
                         tx: px + Math.cos(ringAngle) * ringR,
                         ty: py + Math.sin(ringAngle) * ringR * 0.3,
                         spring: 0.1,
                         friction: PHYSICS.StandardFriction,
                         noise: 0.02,
                         targetAlpha: 0.8 * zoomProgress
                     };
                }
                
                const sphereAngle = Math.random() * Math.PI * 2;
                const sphereR = Math.sqrt(Math.random()) * p.size;
                
                return {
                    tx: px + Math.cos(sphereAngle) * sphereR,
                    ty: py + Math.sin(sphereAngle) * sphereR,
                    spring: 0.1,
                    friction: PHYSICS.StandardFriction,
                    noise: 0.02,
                    targetAlpha: 0.9 * zoomProgress // Bodies fade in during zoom
                };
            } else {
                // Hide planets during Milky Way phase
                return { tx: solarX, ty: solarY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
            }
        }
    }

    // Distant Stars (background) - visible throughout
    if (zoomProgress < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const r = (350 + Math.random() * 300) * currentScale;
        return {
            tx: centerX + Math.cos(angle) * r + offsetX,
            ty: centerY + Math.sin(angle) * r + offsetY,
            spring: 0.01,
            friction: 0.95,
            noise: 0,
            targetAlpha: 0.5 * (1 - zoomProgress * 0.5)
        };
    }
    
    // Default fallback
    return {
        tx: solarX,
        ty: solarY,
        spring: 0.01,
        friction: 0.95,
        noise: 0,
        targetAlpha: 0
    };
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
