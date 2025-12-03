


import { ParticleContext, ShapeResult } from './types';
import { GeometricShapes } from './geometricShapes.ts';
import { CosmicShapes } from './cosmicShapes.ts';
import { ComplexShapes } from './complexShapes.ts';
import { AgentShapes } from './agentShapes.ts';
import { VisualShape } from 'types';

/**
 * Main visual controller.
 * Delegates particle updates to specific shape generators based on the current VisualShape.
 */
export function calculateParticleTarget(
    shape: VisualShape,
    ctx: ParticleContext
): ShapeResult {

    // Show idle state only when shape is 'orb' and inactive (for voice mode)
    // For text chat, always show the shape regardless of isActive
    const shouldShowIdle = shape === 'orb' && !ctx.visualState.isActive;
    if (shouldShowIdle) {
        return GeometricShapes.idle(ctx);
    }

    switch (shape) {
        // Geometric / Core
        case 'orb': return GeometricShapes.orb(ctx);
        case 'rect': return GeometricShapes.rect(ctx);
        case 'grid': return GeometricShapes.grid(ctx);
        case 'shield': return GeometricShapes.shield(ctx);
        case 'hourglass': return GeometricShapes.hourglass(ctx);
        case 'clock': return GeometricShapes.clock(ctx);
        case 'code': return GeometricShapes.code(ctx);
        case 'text': return GeometricShapes.text(ctx);
        case 'scanner': return GeometricShapes.scanner(ctx);
        case 'vortex': return GeometricShapes.vortex(ctx);
        case 'fireworks': return GeometricShapes.fireworks(ctx);
        case 'lightning': return GeometricShapes.lightning(ctx);
        case 'flower': return GeometricShapes.flower(ctx);

        // Organic / Nature
        case 'wave': return GeometricShapes.wave(ctx);
        case 'dna': return GeometricShapes.dna(ctx);
        case 'heart': return GeometricShapes.heart(ctx);
        case 'brain': return GeometricShapes.brain(ctx);
        case 'face': return ComplexShapes.face(ctx);
        case 'weather': return ComplexShapes.weather(ctx);

        // Data Visualization
        case 'chart': return GeometricShapes.chart(ctx);
        case 'map': return ComplexShapes.map(ctx);

        // Cosmic / Space
        case 'planet': return CosmicShapes.planet(ctx);
        case 'atom': return CosmicShapes.atom(ctx);
        // Spiral removed
        case 'star': return CosmicShapes.star(ctx);
        case 'globe': return CosmicShapes.globe(ctx);
        case 'constellation': return CosmicShapes.constellation(ctx);

        // Agent Shapes
        case 'discovery': return AgentShapes.discovery(ctx);
        case 'scoring': return AgentShapes.scoring(ctx);
        case 'workshop': return AgentShapes.workshop(ctx);
        case 'consulting': return AgentShapes.consulting(ctx);
        case 'closer': return AgentShapes.closer(ctx);
        case 'summary': return AgentShapes.summary(ctx);
        case 'proposal': return AgentShapes.proposal(ctx);
        case 'admin': return AgentShapes.admin(ctx);
        case 'retargeting': return AgentShapes.retargeting(ctx);

        default: return GeometricShapes.orb(ctx);
    }
}