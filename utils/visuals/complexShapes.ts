
import { ParticleContext, ShapeResult } from './types';
import { FaceLandmarkStore } from './store';
import { cx, cy, PHYSICS, latLngToVector3 } from './mathHelpers';
import { calculatePixelText } from './geometricShapes';

// 64x32 Bitmask of Earth's Continents (1 = Land, 0 = Water)
// Equirectangular Projection approximation
const EARTH_MAP_DATA = [
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000111111111111100000000000000111111000000000", // Russia/Greenland
"0000000000000110000011111111111111110000000000001111111110000000", 
"0000000000011111100111111111111111111000000000011111111111000000", // Europe/Canada
"0000000001111111101111111111111111111100000000111111111111100000",
"0000000011111111101111111111111111111110000001111111111111110000", // USA/China
"0000000011111111101111111111111111111110000011111111111111111000",
"0000000001111111000111111111111111111110000011111111111111111000", // Mexico/India
"0000000000001100000011111111111111111100000001111111111111110000",
"0000000000000000000000111111111111111000000000111111000111000000", // Africa/SE Asia
"0000000000000000000000011111111110000000000000011100000000000000", 
"0000000000000000000000001111111100000000000000011110000111000000", // Indonesia
"0000000000000000000000000111111100000000000000111110000011000000", 
"0000000000000000000000000011111110000000000001111110000000000000", // Brazil/Africa
"0000000000000000000000000011111110000000000011111110000000000000",
"0000000000000000000000000011111100000000000011111100000000000000",
"0000000000000000000000000011111000000000000011111000000000000000", 
"0000000000000000000000000011111000000000000001110000000000000000", // Australia
"0000000000000000000000000001100000000000000000000000000111110000", 
"0000000000000000000000000001000000000000000000000000000111110000",
"0000000000000000000000000000000000000000000000000000000011100000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000011000000", // NZ
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0001111111111111111111111111111111111111111111111111111111110000", // Antarctica
"0000111111111111111111111111111111111111111111111111111111100000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000",
"0000000000000000000000000000000000000000000000000000000000000000"
];

function sampleEarthMap(phi: number, theta: number): boolean {
    // phi: 0 (North) to PI (South)
    // theta: 0 to 2PI (Longitude)
    
    const rows = EARTH_MAP_DATA.length;
    const firstRow = EARTH_MAP_DATA[0];
    if (!firstRow) return false;
    const cols = firstRow.length;
    
    // Map phi to row
    const r = Math.floor((phi / Math.PI) * rows);
    const rowIdx = Math.max(0, Math.min(rows - 1, r));
    
    // Map theta to col (Rotate to align Prime Meridian)
    // Adjust offset so Africa is roughly center
    const thetaAdjusted = (theta + Math.PI) % (2 * Math.PI);
    const c = Math.floor((thetaAdjusted / (2 * Math.PI)) * cols);
    const colIdx = Math.max(0, Math.min(cols - 1, c));
    
    const row = EARTH_MAP_DATA[rowIdx];
    if (!row) return false;
    return row[colIdx] === '1';
}

// MediaPipe Face Mesh Region Definitions (468 landmarks)
const FACE_REGIONS = {
    // Face contour/oval (key points)
    FACE_OVAL: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167]),
    
    // Right eye (outer to inner)
    RIGHT_EYE: new Set([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]),
    RIGHT_EYE_IRIS: new Set([468, 469, 470, 471, 472]), // Iris landmarks if available
    
    // Left eye
    LEFT_EYE: new Set([362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]),
    LEFT_EYE_IRIS: new Set([473, 474, 475, 476, 477]),
    
    // Right eyebrow
    RIGHT_EYEBROW: new Set([107, 55, 65, 52, 53, 46]),
    
    // Left eyebrow  
    LEFT_EYEBROW: new Set([336, 296, 334, 293, 300, 276]),
    
    // Nose
    NOSE_TIP: new Set([1, 2, 5, 4, 6, 19, 20, 94, 125, 141, 235, 236, 3, 51, 48, 115, 131, 134, 102, 49, 220, 305, 281, 363, 360, 279, 358, 327, 326, 2]),
    NOSE_BRIDGE: new Set([6, 19, 20, 51, 48, 115, 131, 134, 102, 49, 220, 305, 281, 363, 360, 279, 358, 327, 326]),
    
    // Mouth outer
    MOUTH_OUTER: new Set([61, 146, 91, 181, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318]),
    
    // Mouth inner/lips
    MOUTH_INNER: new Set([78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 321, 375, 307, 320, 405, 314, 17, 84, 181, 91, 146, 61]),
    UPPER_LIP: new Set([78, 95, 88, 178, 87, 14, 317, 402, 318, 324]),
    LOWER_LIP: new Set([78, 14, 317, 402, 324, 308, 321, 375, 307, 320]),
    
    // Face mesh (general)
    FACE_MESH: new Set(Array.from({length: 468}, (_, i) => i))
};

// Helper to check if landmark is in region
// function _isInRegion(landmarkIndex: number, regions: Set<number>[]): boolean {
//     return regions.some(region => region.has(landmarkIndex));
// }

// Get region priority (higher = more important)
function getRegionPriority(landmarkIndex: number): number {
    if (FACE_REGIONS.RIGHT_EYE_IRIS.has(landmarkIndex) || FACE_REGIONS.LEFT_EYE_IRIS.has(landmarkIndex)) return 5;
    if (FACE_REGIONS.RIGHT_EYE.has(landmarkIndex) || FACE_REGIONS.LEFT_EYE.has(landmarkIndex)) return 4;
    if (FACE_REGIONS.MOUTH_INNER.has(landmarkIndex)) return 4;
    if (FACE_REGIONS.NOSE_TIP.has(landmarkIndex)) return 3;
    if (FACE_REGIONS.RIGHT_EYEBROW.has(landmarkIndex) || FACE_REGIONS.LEFT_EYEBROW.has(landmarkIndex)) return 2;
    if (FACE_REGIONS.MOUTH_OUTER.has(landmarkIndex)) return 2;
    if (FACE_REGIONS.FACE_OVAL.has(landmarkIndex)) return 1.5;
    return 1;
}

export const ComplexShapes = {
  
  // Enhanced Real-time Face Mesh with improved region detection and smoothing
  face(ctx: ParticleContext): ShapeResult {
     const { index, total, time, audio, visualState } = ctx;
     const centerX = cx(ctx);
     const centerY = cy(ctx);

     // -------------------------------
     // MODE A: ENHANCED REAL-TIME FACE MAPPING
     // -------------------------------
     const landmarks = FaceLandmarkStore.get();
     
     if (landmarks && landmarks.length > 0) {
         // Calculate face center for reference
        let faceCenterX = 0, faceCenterY = 0, faceCenterZ = 0;
        landmarks.forEach(pt => {
            faceCenterX += pt.x;
            faceCenterY += pt.y;
            faceCenterZ += pt.z;
        });
        faceCenterX /= landmarks.length;
        faceCenterY /= landmarks.length;
        faceCenterZ /= landmarks.length;
        // faceCenterX and faceCenterY computed but not used - kept for future use
        void faceCenterX;
        void faceCenterY;
         
         // Determine landmark for this particle (with region-based weighting)
         let landmarkIndex = index % landmarks.length;
         
         // Optional: Weight particles toward important features
         // Use audio to shift more particles to mouth/eyes when speaking
         const audioWeight = visualState.mode === 'speaking' ? audio * 0.3 : 0;
         if (audioWeight > 0.1 && Math.random() < audioWeight) {
             // Prioritize mouth and eye regions when speaking
             const importantRegions = new Set([
                 ...Array.from(FACE_REGIONS.MOUTH_INNER),
                 ...Array.from(FACE_REGIONS.RIGHT_EYE),
                 ...Array.from(FACE_REGIONS.LEFT_EYE)
             ]);
             const importantLandmarks = landmarks
                 .map((_, i) => i)
                 .filter(i => importantRegions.has(i));
             if (importantLandmarks.length > 0) {
                 const selectedIndex = importantLandmarks[Math.floor(Math.random() * importantLandmarks.length)];
                 if (selectedIndex !== undefined) {
                   landmarkIndex = selectedIndex;
                 }
             }
         }
         
        const pt = landmarks[landmarkIndex];
        if (!pt) return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
        const regionPriority = getRegionPriority(landmarkIndex);
        
         // 2. Aspect Ratio Correction
         // MediaPipe coordinates (0-1) are normalized to the *input video dimensions*.
         // If input is portrait (e.g. 720x1280), a y-dist of 0.1 is much longer (pixels) than x-dist 0.1.
         // We must multiply Y offsets by the Aspect Ratio (Height/Width) to restore the physical shape.
         // 2. Aspect Ratio Correction
         const inputAR = FaceLandmarkStore.getAspectRatio() || 1; 
         
         const isMobile = ctx.width < 768; 

         // 3. Scaling - Make it BIGGER on mobile
         let baseScale;
         let targetCenterY = centerY; // Use a mutable target for center

         if (isMobile) {
             // On mobile, fill the width. Face is usually ~0.6 of video width.
             baseScale = ctx.width * 1.5; 
             targetCenterY -= 60; // Shift up slightly to center in visible area
         } else {
             // Desktop
             baseScale = Math.min(ctx.width, ctx.height) * 0.9;
         }

         const scale = baseScale * (1 + audio * 0.1); 
         
         // 4. Coordinate Mapping
         const flipX = 1 - pt.x;
         const offsetX = (flipX - 0.5) * scale;
         
         // Apply Aspect Ratio to Y to fix "squashed" face
         const offsetY = (pt.y - 0.5) * scale * inputAR;
         
         // 5. Reduced Noise/Drift for sharper look
         const driftX = Math.sin(time * 0.0003 + landmarkIndex * 0.05) * 2; 
         const driftY = Math.cos(time * 0.0002 + landmarkIndex * 0.05) * 2;

         const finalTx = centerX + offsetX + driftX;
         const finalTy = targetCenterY + offsetY + driftY;
         
         // Enhanced depth perception
         const depthFromCenter = Math.abs(pt.z - faceCenterZ);
         const depthScale = 1 - (depthFromCenter * 0.4); 
         
         // Scanner effect
         const scanSpeed = 0.08;
         const scanY1 = (time * scanSpeed) % ctx.height;
         const distToScan1 = Math.abs(finalTy - scanY1);
         const minDist = distToScan1;
         
         let targetAlpha = 0.35 + (regionPriority - 1) * 0.12; 
         if (visualState.mode === 'listening') targetAlpha *= 0.8;
         
         // Feature highlighting
         if (FACE_REGIONS.RIGHT_EYE.has(landmarkIndex) || FACE_REGIONS.LEFT_EYE.has(landmarkIndex)) {
             targetAlpha = 0.85 + (audio * 0.3); 
         } else if (FACE_REGIONS.MOUTH_INNER.has(landmarkIndex)) {
             targetAlpha = 0.9 + (audio * 0.2);
         } else if (FACE_REGIONS.NOSE_TIP.has(landmarkIndex)) {
             targetAlpha = 0.7;
         } else if (FACE_REGIONS.FACE_OVAL.has(landmarkIndex)) {
             targetAlpha = 0.5;
         }
         
         // Scanner line
         let noise = 0.01; // Reduced noise
         if (minDist < 60) {
             const scanIntensity = 1 - (minDist / 60);
             targetAlpha += scanIntensity * 0.5;
             noise = 0.04; 
         }
         
         // Breathing
         const breathe = Math.sin(time * 0.001) * 2; // Reduced breathing amplitude
         
         let spring = PHYSICS.SnappySpring;
         if (regionPriority >= 4) {
             spring = PHYSICS.SnappySpring * 1.3;
         } else if (regionPriority >= 2) {
             spring = PHYSICS.StandardSpring;
         }

         return {
             tx: finalTx + breathe, 
             ty: finalTy + breathe,
             spring: Math.min(0.2, spring), 
             friction: PHYSICS.DampedFriction,
             noise: noise,
             targetAlpha: Math.min(1.0, targetAlpha),
             scale: Math.max(0.3, Math.min(1.5, depthScale * (0.8 + regionPriority * 0.15)))
         };
     }

     // -------------------------------
     // MODE B: NEURAL AUDIO RING
     // -------------------------------
     const numRings = 5;
     const ringIdx = index % numRings; 
     const particlesPerRing = Math.floor(total / numRings);
     const baseRadius = 60 + (ringIdx * 30); 
     
     const activeAudio = visualState.mode === 'speaking' ? audio : (visualState.mode === 'listening' ? audio * 0.4 : 0);
     const expansion = activeAudio * (40 + ringIdx * 25);
     
     const direction = ringIdx % 2 === 0 ? 1 : -1;
     const rotSpeed = 0.0002 * (ringIdx + 1);
     
     const particleInGroup = Math.floor(index / numRings);
     const angleStep = (Math.PI * 2) / particlesPerRing;
     
     let angle = particleInGroup * angleStep;
     angle += time * rotSpeed * direction; 
     
     const wave = Math.sin((angle * (4 + ringIdx)) + time * 0.0015) * 6;
     const r = baseRadius + expansion + wave;
     
     const tiltX = Math.sin(time * 0.0004) * 0.15;
     const tiltY = Math.cos(time * 0.0003) * 0.15;
     
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const z = Math.sin(angle * 2) * (r * 0.1);

     const y2 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
     const x2 = x * Math.cos(tiltY) - z * Math.sin(tiltY);

     let targetAlpha = 0.15;
     if (activeAudio > 0.05) targetAlpha += activeAudio * 0.8; 
     if (ringIdx === 0) targetAlpha += 0.25; 
     
     if (visualState.mode === 'thinking') {
         targetAlpha += Math.sin(time * 0.005) * 0.1;
     }

     return {
         tx: centerX + x2,
         ty: centerY + y2,
         spring: PHYSICS.StandardSpring,
         friction: PHYSICS.StandardFriction,
         noise: 0.02 + (activeAudio * 0.05),
         targetAlpha: Math.min(1, targetAlpha),
         scale: 1
     };
  },

  weather(ctx: ParticleContext): ShapeResult {
    const { index, total, time, audio, visualState } = ctx;
    const centerX = cx(ctx);
    const centerY = cy(ctx);
    const condition = visualState.weatherData?.condition || 'sunny';
    
    // Enhanced temperature parsing - handle various formats
    let tempStr = "";
    if (visualState.weatherData?.temperature) {
        const temp = visualState.weatherData.temperature;
        // Extract numbers and handle F/C
        const numMatch = temp.match(/(-?\d+)/);
        if (numMatch) {
            tempStr = numMatch[1] + "°";
        } else {
            tempStr = temp.replace(/[^0-9-]/g, '') + "°";
        }
    }
    
    // 1. Render Temperature Display (center, above weather effect)
    if (tempStr) {
        const textResult = calculatePixelText(ctx, tempStr, centerX, centerY - 80, { 
            scale: 22, 
            particlesPerChar: 350,
            jitter: 0.3
        });
        if (textResult) {
            // Enhance temperature text with subtle glow
            const enhanced = { ...textResult };
            enhanced.targetAlpha = (textResult.targetAlpha || 0.9) * 1.1;
            return enhanced;
        }
    }

    // 2. Render Weather Effects (using remaining particles)
    const textParticlesConsumed = tempStr ? tempStr.length * 350 : 0;
    if (index < textParticlesConsumed) {
        return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
    }

    const weatherIndex = index - textParticlesConsumed;
    const weatherTotal = total - textParticlesConsumed;
    
    if (weatherTotal <= 0) {
        return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
    }

    // ENHANCED WEATHER CONDITIONS

    if (condition === 'stormy') {
        // STORMY: Heavy rain + lightning + dark clouds
        const width = ctx.width;
        const height = ctx.height;
        
        // Lightning flashes (5% of particles)
        if (weatherIndex < weatherTotal * 0.05) {
            const flashIndex = weatherIndex;
            // const numFlashes = Math.floor(weatherTotal * 0.05);
            const flashTime = (time * 0.003 + flashIndex * 0.5) % 4;
            const isFlashing = flashTime < 0.1; // Quick flash
            
            if (isFlashing) {
                const flashX = centerX - width * 0.3 + (flashIndex % 3) * (width * 0.3);
                const flashY = centerY - 200 + Math.random() * 400;
                
                // Jagged lightning bolt
                const boltSegments = 8;
                const segment = flashIndex % boltSegments;
                const segmentY = flashY + (segment * 50);
                const segmentX = flashX + (Math.random() - 0.5) * 60;
                
                return {
                    tx: segmentX,
                    ty: segmentY,
                    spring: 0.15,
                    friction: 0.85,
                    noise: 0.05,
                    targetAlpha: 1.0,
                    scale: 1.5
                };
            }
        }
        
        // Dark storm clouds (30% of particles)
        if (weatherIndex < weatherTotal * 0.35) {
            const cloudIndex = weatherIndex - (weatherTotal * 0.05);
            const cloudTotal = weatherTotal * 0.3;
            const numClouds = 5;
            const cloudIdx = cloudIndex % numClouds;
            const cloudX = centerX - width * 0.4 + (cloudIdx * (width * 0.4 / (numClouds - 1)));
            const cloudY = centerY - 180;
            
            // Dense, dark cloud particles
            const cloudParticleIdx = Math.floor(cloudIndex / numClouds);
            const cloudParticles = Math.floor(cloudTotal / numClouds);
            const t = cloudParticleIdx / cloudParticles;
            
            const cloudR = 120 * Math.sqrt(t);
            const angle = Math.random() * Math.PI * 2;
            const r = cloudR * (0.7 + Math.random() * 0.3);
            
            return {
                tx: cloudX + Math.cos(angle) * r,
                ty: cloudY + Math.sin(angle) * r * 0.6,
                spring: 0.03,
                friction: 0.92,
                noise: 0.01,
                targetAlpha: 0.35 // Dark clouds
            };
        }
        
        // Heavy rain (65% of particles)
        const rainIndex = weatherIndex - (weatherTotal * 0.35);
        const rainTotal = weatherTotal * 0.65;
        
        const speed = 40; // Faster for stormy
        const xSeed = (rainIndex * 9301 + 49297) % 233280;
        const x = (xSeed / 233280) * width;
        const offset = (rainIndex * height / rainTotal);
        const y = (time * speed * 0.6 + offset) % height;
        
        // Strong wind effect
        const wind = Math.sin(time * 0.002) * 40 + Math.cos(time * 0.0015) * 20;
        
        return {
            tx: x + wind,
            ty: y,
            spring: 0,
            friction: 0,
            noise: 0,
            targetAlpha: 0.7,
            scale: 1.2,
            teleport: { x: x + wind, y, vx: wind * 0.15, vy: speed }
        };
    }
    
    else if (condition === 'rainy') {
        // RAINY: Moderate rain with lighter clouds
        const width = ctx.width;
        const height = ctx.height;
        
        // Light clouds (25% of particles)
        if (weatherIndex < weatherTotal * 0.25) {
            const cloudIndex = weatherIndex;
            const numClouds = 4;
            const cloudIdx = cloudIndex % numClouds;
            const cloudX = centerX - width * 0.35 + (cloudIdx * (width * 0.7 / (numClouds - 1)));
            const cloudY = centerY - 150;
            
            const cloudParticleIdx = Math.floor(cloudIndex / numClouds);
            const cloudParticles = Math.floor((weatherTotal * 0.25) / numClouds);
            const t = cloudParticleIdx / cloudParticles;
            
            const cloudR = 90 * Math.sqrt(t);
            const angle = Math.random() * Math.PI * 2;
            const r = cloudR * (0.8 + Math.random() * 0.2);
            
            return {
                tx: cloudX + Math.cos(angle) * r,
                ty: cloudY + Math.sin(angle) * r * 0.7,
                spring: 0.02,
                friction: 0.93,
                noise: 0.015,
                targetAlpha: 0.25
            };
        }
        
        // Rain drops (75% of particles)
        const rainIndex = weatherIndex - (weatherTotal * 0.25);
        const rainTotal = weatherTotal * 0.75;
        
        const speed = 25;
        const xSeed = (rainIndex * 9301 + 49297) % 233280;
        const x = (xSeed / 233280) * width;
        const offset = (rainIndex * height / rainTotal);
        const y = (time * speed * 0.5 + offset) % height;
        
        // Light wind
        const wind = Math.sin(time * 0.001) * 15;
        
        return {
            tx: x + wind,
            ty: y,
            spring: 0,
            friction: 0,
            noise: 0,
            targetAlpha: 0.65,
            teleport: { x: x + wind, y, vx: wind * 0.08, vy: speed }
        };
    }
    
    else if (condition === 'snowy') {
        // SNOWY: Fluffy snowflakes with varying sizes
        const width = ctx.width;
        const height = ctx.height;
        
        // Snow clouds (20% of particles)
        if (weatherIndex < weatherTotal * 0.2) {
            const cloudIndex = weatherIndex;
            const numClouds = 3;
            const cloudIdx = cloudIndex % numClouds;
            const cloudX = centerX - width * 0.3 + (cloudIdx * (width * 0.6 / (numClouds - 1)));
            const cloudY = centerY - 140;
            
            const cloudParticleIdx = Math.floor(cloudIndex / numClouds);
            const cloudParticles = Math.floor((weatherTotal * 0.2) / numClouds);
            const t = cloudParticleIdx / cloudParticles;
            
            const cloudR = 100 * Math.sqrt(t);
            const angle = Math.random() * Math.PI * 2;
            const r = cloudR * (0.7 + Math.random() * 0.3);
            
            return {
                tx: cloudX + Math.cos(angle) * r,
                ty: cloudY + Math.sin(angle) * r * 0.8,
                spring: 0.02,
                friction: 0.94,
                noise: 0.01,
                targetAlpha: 0.3
            };
        }
        
        // Snowflakes (80% of particles)
        const snowIndex = weatherIndex - (weatherTotal * 0.2);
        const snowTotal = weatherTotal * 0.8;
        
        const xSeed = (snowIndex * 9301 + 49297) % 233280;
        const baseX = (xSeed / 233280) * width;
        
        // Varying snowflake sizes and speeds
        const sizeType = snowIndex % 3; // Small, medium, large
        const speed = sizeType === 0 ? 1.5 : sizeType === 1 ? 2.5 : 3.5;
        const size = sizeType === 0 ? 0.8 : sizeType === 1 ? 1.0 : 1.3;
        
        const offset = (snowIndex * height / snowTotal);
        const y = (time * speed * 0.25 + offset) % height;
        
        // Gentle drifting (snowflakes drift side to side)
        const drift = Math.sin(time * 0.001 + snowIndex * 0.1) * 25 + Math.cos(time * 0.0008 + snowIndex) * 15;
        
        // Slight rotation for realism
        const rotation = time * 0.0005 + snowIndex * 0.01;
        const rotX = Math.cos(rotation) * 3;
        
        return {
            tx: baseX + drift + rotX,
            ty: y,
            spring: 0,
            friction: 0,
            noise: 0,
            targetAlpha: 0.75,
            scale: size,
            teleport: { x: baseX + drift + rotX, y, vx: Math.cos(rotation) * 0.5, vy: speed }
        };
    }
    
    else if (condition === 'cloudy') {
        // CLOUDY: Multiple cloud layers with subtle movement
        const numClouds = 7;
        const cloudIdx = weatherIndex % numClouds;
        const cloudParticleIdx = Math.floor(weatherIndex / numClouds);
        const cloudParticles = Math.floor(weatherTotal / numClouds);
        
        // Cloud positioning - multiple layers
        const layer = cloudIdx % 3; // 3 layers of clouds
        const cloudInLayer = Math.floor(cloudIdx / 3);
        const cloudsPerLayer = Math.ceil(numClouds / 3);
        
        const layerY = centerY - 140 + (layer * 60);
        const layerSpeed = 0.00008 + (layer * 0.00002);
        const cloudX = centerX - ctx.width * 0.4 + (cloudInLayer * (ctx.width * 0.8 / (cloudsPerLayer - 1)));
        const cloudY = layerY + Math.cos(time * 0.0001 + cloudIdx) * 30;
        
        // Cloud shape - fluffy, organic
        const t = cloudParticleIdx / cloudParticles;
        const cloudR = 110 * Math.sqrt(t);
        const angle = Math.random() * Math.PI * 2;
        
        // Vary cloud density
        const density = 0.7 + Math.random() * 0.3;
        const r = cloudR * density;
        
        // Horizontal drift
        const drift = Math.sin(time * layerSpeed + cloudIdx) * (ctx.width * 0.3);
        
        return {
            tx: cloudX + Math.cos(angle) * r + drift,
            ty: cloudY + Math.sin(angle) * r * 0.7,
            spring: 0.02,
            friction: 0.92,
            noise: 0.01,
            targetAlpha: 0.2 + (layer * 0.05) // Deeper clouds are darker
        };
    }
    
    else {
        // SUNNY: Bright sun with rays and clear sky
        // Sun core (20% of particles)
        if (weatherIndex < weatherTotal * 0.2) {
            const sunIndex = weatherIndex;
            const sunTotal = weatherTotal * 0.2;
            const t = sunIndex / sunTotal;
            
            // Sun sphere
            const angle = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const sunRadius = 50 + (audio * 10);
            const r = sunRadius * Math.sqrt(t);
            
            const x = r * Math.sin(phi) * Math.cos(angle);
            const y = r * Math.sin(phi) * Math.sin(angle);
            
            return {
                tx: centerX + x,
                ty: centerY - 100 + y,
                spring: 0.08,
                friction: 0.88,
                noise: 0.02,
                targetAlpha: 0.9 + (audio * 0.1)
            };
        }
        
        // Sun rays (30% of particles)
        if (weatherIndex < weatherTotal * 0.5) {
            const rayIndex = weatherIndex - (weatherTotal * 0.2);
            const rayTotal = weatherTotal * 0.3;
            
            const numRays = 12;
            const rayNum = rayIndex % numRays;
            const rayAngle = (rayNum / numRays) * Math.PI * 2 + (time * 0.0001);
            
            // Ray particles along each ray
            const rayParticleIdx = Math.floor(rayIndex / numRays);
            const rayParticles = Math.floor(rayTotal / numRays);
            const t = rayParticleIdx / rayParticles;
            
            const rayLength = 80 + (audio * 30);
            const rayPos = 60 + (t * rayLength);
            
            return {
                tx: centerX + Math.cos(rayAngle) * rayPos,
                ty: centerY - 100 + Math.sin(rayAngle) * rayPos,
                spring: 0.1,
                friction: 0.9,
                noise: 0.01,
                targetAlpha: 0.5 * (1 - t * 0.7) // Fade out along ray
            };
        }
        
        // Clear sky particles (50% of particles)
        const skyIndex = weatherIndex - (weatherTotal * 0.5);
        const skyTotal = weatherTotal * 0.5;
        
        // Gentle sky particles - very subtle
        const angle = (skyIndex / skyTotal) * Math.PI * 2 + (time * 0.0001);
        const r = 200 + Math.sqrt(Math.random()) * 150;
        
        return {
            tx: centerX + Math.cos(angle) * r,
            ty: centerY + Math.sin(angle) * r * 0.6,
            spring: 0.03,
            friction: 0.95,
            noise: 0.005,
            targetAlpha: 0.15
        };
    }
  },

  map(ctx: ParticleContext): ShapeResult {
      const { index, total, time, visualState, audio } = ctx;
      const centerX = cx(ctx);
      const centerY = cy(ctx);
      const mapData = visualState.mapData;
      
      // --- CONFIGURATION ---
      const GLOBE_RADIUS = 160;
      const ROTATION_SPEED = 0.0003;
      const ROTATION_OFFSET = time * ROTATION_SPEED;
      
      // If we have a destination, we visualize a route
      const hasRoute = !!(mapData?.destination && mapData.lat !== undefined && mapData.lng !== undefined);
      
      // --- 1. ROUTE VISUALIZATION (Trajectory) ---
      const routeParticleCount = hasRoute ? Math.floor(total * 0.15) : 0;
      
      if (index < routeParticleCount && hasRoute && mapData?.lat && mapData?.destination) {
          if (mapData.lat === undefined || mapData.lng === undefined) return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };
          const vecA = latLngToVector3(mapData.lat, mapData.lng, GLOBE_RADIUS);
          const vecB = latLngToVector3(mapData.destination.lat, mapData.destination.lng, GLOBE_RADIUS);
          
          const t = (index / routeParticleCount); 
          
          let mx = vecA.x + (vecB.x - vecA.x) * t;
          let my = vecA.y + (vecB.y - vecA.y) * t;
          let mz = vecA.z + (vecB.z - vecA.z) * t;
          
          const len = Math.sqrt(mx*mx + my*my + mz*mz);
          mx /= len; my /= len; mz /= len;
          
          // Audio reactive jump height
          const archHeight = Math.sin(t * Math.PI) * (60 + (audio * 30));
          const r = GLOBE_RADIUS + archHeight;
          
          mx *= r; my *= r; mz *= r;

          // Rotate
          const rotX = mx * Math.cos(ROTATION_OFFSET) - mz * Math.sin(ROTATION_OFFSET);
          // const rotZ = mx * Math.sin(ROTATION_OFFSET) + mz * Math.cos(ROTATION_OFFSET);
          const rotY = my;

          const pulseSpeed = 0.002;
          const pulsePos = (time * pulseSpeed) % 1;
          const distToPulse = Math.abs(t - pulsePos);
          
          let size = 1;
          let alpha = 0.3;
          
          if (distToPulse < 0.05) {
              size = 2.5 + (audio * 1.5);
              alpha = 1;
          } else if (t < pulsePos && t > pulsePos - 0.2) {
              alpha = 0.8 - (pulsePos - t) * 4;
          }

          return {
              tx: centerX + rotX,
              ty: centerY + rotY + (20 * Math.sin(time*0.001)),
              spring: 0.2,
              friction: 0.85,
              noise: 0,
              targetAlpha: alpha,
              scale: size
          };
      }
      
      // --- 2. START/END MARKERS ---
      const markerCount = hasRoute ? 200 : 150;
      const markersStartIndex = routeParticleCount;
      const totalMarkerParticles = hasRoute ? markerCount * 2 : markerCount;
      
      if (index >= markersStartIndex && index < markersStartIndex + totalMarkerParticles) {
          const markerIdx = index - markersStartIndex;
          const isDestination = hasRoute && markerIdx >= markerCount;
          
          const lat = isDestination ? (mapData?.destination?.lat ?? 0) : (mapData?.lat || 0);
          const lng = isDestination ? (mapData?.destination?.lng ?? 0) : (mapData?.lng || 0);
          
          const vec = latLngToVector3(lat, lng, GLOBE_RADIUS);
          
          const rotX = vec.x * Math.cos(ROTATION_OFFSET) - vec.z * Math.sin(ROTATION_OFFSET);
          // const rotZ = vec.x * Math.sin(ROTATION_OFFSET) + vec.z * Math.cos(ROTATION_OFFSET);
          const rotY = vec.y;
          
          // Marker Geometry: Pin Stick + Ripples
          const localIdx = markerIdx % markerCount;
          const pinRatio = 0.2;
          const isPinStick = localIdx < markerCount * pinRatio;
          
          if (isPinStick) {
              // Vertical line stick
              const t = localIdx / (markerCount * pinRatio);
              const height = 25;
              const h = t * height;
              
              // Project outward from center
              const factor = 1 + (h / GLOBE_RADIUS);
              
              return {
                  tx: centerX + (rotX * factor),
                  ty: centerY + (rotY * factor) + (20 * Math.sin(time*0.001)),
                  spring: 0.15,
                  friction: 0.8,
                  noise: 0,
                  targetAlpha: 0.9,
                  scale: 1.2
              };
          } else {
              // Ripples
              const rippleIdx = localIdx - (markerCount * pinRatio);
              const rippleTotal = markerCount * (1 - pinRatio);
              const ringT = rippleIdx / rippleTotal;
              
              // Create concentric ripples
              const rippleCount = 3;
              // const normalizedT = (ringT * rippleCount) % 1;
              const currentRippleIdx = Math.floor(ringT * rippleCount);
              
              const speed = 0.002;
              // Stagger ripples
              const animationOffset = (time * speed) + (currentRippleIdx * 0.33);
              const cycle = animationOffset % 1;
              
              const baseR = 5;
              const maxR = 40;
              // Audio boosts ripple expansion
              const radius = baseR + (cycle * maxR * (1 + audio * 0.5)); 
              
              const angle = Math.random() * Math.PI * 2;
              
              // Draw circle billboard facing roughly camera (simplified flat circle)
              const rX = rotX + Math.cos(angle) * radius;
              const rY = rotY + Math.sin(angle) * radius;
              
              return {
                  tx: centerX + rX,
                  ty: centerY + rY + (20 * Math.sin(time*0.001)),
                  spring: 0.1,
                  friction: 0.9,
                  noise: 0,
                  targetAlpha: (1 - cycle) * (0.4 + audio * 0.6), // Audio boosts brightness
                  scale: 1
              };
          }
      }

      // --- 3. THE GLOBE (Continental Distribution) ---
      const globeIndex = index - (markersStartIndex + totalMarkerParticles);
      const globeTotal = total - (markersStartIndex + totalMarkerParticles);
      
      if (globeTotal <= 0) return { tx: centerX, ty: centerY, spring: 0, friction: 0, noise: 0, targetAlpha: 0 };

      // Golden Spiral Sphere Distribution
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const i = globeIndex;
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / globeTotal);
      
      const gx = GLOBE_RADIUS * Math.cos(theta) * Math.sin(phi);
      const gy = GLOBE_RADIUS * Math.cos(phi);
      const gz = GLOBE_RADIUS * Math.sin(theta) * Math.sin(phi);

      // Procedural Continents (Replaced with Bitmap Map)
      const isLand = sampleEarthMap(phi, theta);
      
      // Apply Rotation to the point
      const rotX = gx * Math.cos(ROTATION_OFFSET) - gz * Math.sin(ROTATION_OFFSET);
      const rotZ = gx * Math.sin(ROTATION_OFFSET) + gz * Math.cos(ROTATION_OFFSET);
      const rotY = gy;
      
      const isFront = rotZ > 0;
      
      let targetAlpha = 0.1;
      let scale = 1;
      
      if (isLand) {
          // LAND: Brighter, more opaque, distinct
          targetAlpha = isFront ? 0.5 : 0.05; 
          scale = isFront ? 1.2 : 0.8;
      } else {
          // OCEAN: Dimmer, reacts to audio
          targetAlpha = isFront ? 0.03 : 0.01;
          if (audio > 0.1 && isFront) {
              targetAlpha += audio * 0.15; // Ocean lights up with voice
          }
      }

      return {
          tx: centerX + rotX,
          ty: centerY + rotY + (20 * Math.sin(time*0.001)),
          spring: 0.1,
          friction: 0.9,
          noise: 0.01,
          targetAlpha: targetAlpha,
          scale: scale
      };
  }
};
