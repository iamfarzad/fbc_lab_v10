import { ParticleContext, ShapeResult } from './types';
import { cx, cy, PHYSICS } from './mathHelpers';

export const AgentShapes = {
    discovery: (ctx: ParticleContext): ShapeResult => {
        // Expanding spiral search pattern
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const turns = 5;
        const angle = (index / total) * Math.PI * 2 * turns + time * 0.0005;
        const radius = (index / total) * 250 + Math.sin(time * 0.002) * 20;

        return {
            tx: centerX + Math.cos(angle) * radius,
            ty: centerY + Math.sin(angle) * radius,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.02,
            targetAlpha: 0.7
        };
    },

    scoring: (ctx: ParticleContext): ShapeResult => {
        // Vertical bars visualization
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const bars = 10;
        const barWidth = 30;
        const spacing = 10;
        const totalWidth = bars * (barWidth + spacing);
        const startX = centerX - totalWidth / 2;

        const barIndex = Math.floor((index / total) * bars);
        const particleInBar = (index % (total / bars)) / (total / bars);

        const height = 100 + Math.sin(time * 0.002 + barIndex) * 50;

        const x = startX + barIndex * (barWidth + spacing) + (Math.random() * barWidth);
        const y = centerY + (particleInBar - 0.5) * height * 2;

        return {
            tx: x,
            ty: y,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.01,
            targetAlpha: 0.8
        };
    },

    workshop: (ctx: ParticleContext): ShapeResult => {
        // Connected nodes (clusters)
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const clusters = 5;
        const clusterIndex = Math.floor((index / total) * clusters);

        const angle = (clusterIndex / clusters) * Math.PI * 2 + time * 0.0002;
        const clusterX = centerX + Math.cos(angle) * 150;
        const clusterY = centerY + Math.sin(angle) * 150;

        const r = Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;

        return {
            tx: clusterX + Math.cos(theta) * r,
            ty: clusterY + Math.sin(theta) * r,
            spring: 0.1,
            friction: 0.9,
            noise: 0.03,
            targetAlpha: 0.7
        };
    },

    consulting: (ctx: ParticleContext): ShapeResult => {
        // Geometric squares
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const side = 200;
        const perimeter = side * 4;
        const pos = (index / total) * perimeter;

        let x, y;
        if (pos < side) { x = pos - side / 2; y = -side / 2; }
        else if (pos < side * 2) { x = side / 2; y = (pos - side) - side / 2; }
        else if (pos < side * 3) { x = (side * 3 - pos) - side / 2; y = side / 2; }
        else { x = -side / 2; y = (side * 4 - pos) - side / 2; }

        // Rotate
        const rot = time * 0.0003;
        const rx = x * Math.cos(rot) - y * Math.sin(rot);
        const ry = x * Math.sin(rot) + y * Math.cos(rot);

        return {
            tx: centerX + rx,
            ty: centerY + ry,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.005,
            targetAlpha: 0.8
        };
    },

    closer: (ctx: ParticleContext): ShapeResult => {
        // Converging particles
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const angle = (index / total) * Math.PI * 2;
        const radius = 200 * ((Math.sin(time * 0.001 + index * 0.01) + 1) / 2);

        return {
            tx: centerX + Math.cos(angle) * radius,
            ty: centerY + Math.sin(angle) * radius,
            spring: 0.2, // Snappy
            friction: 0.8,
            noise: 0.05,
            targetAlpha: 0.9
        };
    },

    summary: (ctx: ParticleContext): ShapeResult => {
        // Spiral inward
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const angle = (index / total) * Math.PI * 10 + time * 0.0005;
        const radius = 200 * (1 - (index / total));

        return {
            tx: centerX + Math.cos(angle) * radius,
            ty: centerY + Math.sin(angle) * radius,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.01,
            targetAlpha: 0.6
        };
    },

    proposal: (ctx: ParticleContext): ShapeResult => {
        // Grid structure
        const { index, total } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const cols = 20;
        const spacing = 15;
        const row = Math.floor(index / cols);
        const col = index % cols;

        const width = cols * spacing;
        const height = (total / cols) * spacing;

        return {
            tx: centerX + col * spacing - width / 2,
            ty: centerY + row * spacing - height / 2,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.002,
            targetAlpha: 0.7
        };
    },

    admin: (ctx: ParticleContext): ShapeResult => {
        // Network/Brain pattern (reuse brain logic simplified)
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const angle = (index / total) * Math.PI * 2;
        const r = 100 + Math.sin(angle * 5 + time * 0.001) * 20;

        return {
            tx: centerX + Math.cos(angle) * r,
            ty: centerY + Math.sin(angle) * r * 0.6, // Ellipse
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.02,
            targetAlpha: 0.8
        };
    },

    retargeting: (ctx: ParticleContext): ShapeResult => {
        // Expanding waves
        const { index, total, time } = ctx;
        const centerX = cx(ctx);
        const centerY = cy(ctx);

        const waveCount = 3;
        const waveIndex = Math.floor((index / total) * waveCount);
        const progress = (time * 0.0005 + waveIndex / waveCount) % 1;
        const radius = progress * 300;
        const angle = Math.random() * Math.PI * 2;

        return {
            tx: centerX + Math.cos(angle) * radius,
            ty: centerY + Math.sin(angle) * radius,
            spring: PHYSICS.StandardSpring,
            friction: PHYSICS.StandardFriction,
            noise: 0.01,
            targetAlpha: 1 - progress
        };
    }
};
