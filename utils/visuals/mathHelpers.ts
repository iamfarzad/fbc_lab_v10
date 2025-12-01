
import { ParticleContext } from './types';

// --- Canvas Centers ---
export const cx = (ctx: ParticleContext) => ctx.width / 2;
export const cy = (ctx: ParticleContext) => ctx.height / 2;

// --- Physics Constants ---
export const PHYSICS = {
    IdleSpring: 0.04,
    IdleFriction: 0.94,
    StandardSpring: 0.08,
    StandardFriction: 0.85,
    SnappySpring: 0.15,
    DampedFriction: 0.80,
    FluidFriction: 0.92
};

// --- Math Utilities ---
export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
export const toRad = (deg: number) => deg * (Math.PI / 180);

// --- 3D Projection Utilities ---
export const latLngToVector3 = (lat: number, lng: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return { x, y, z };
};
