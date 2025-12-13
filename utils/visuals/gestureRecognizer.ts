/**
 * Gesture Recognition System - Mouse/touch gesture recognition for shape switching
 */

import { VisualShape } from '../../types';

interface Point {
  x: number;
  y: number;
  time: number;
}

interface GesturePattern {
  pattern: 'circular' | 'angular' | 'linear' | 'tap';
  minPoints: number;
  maxDuration: number;
  minVelocity?: number;
  action: (direction?: 'up' | 'down' | 'left' | 'right') => void;
}

interface GestureData {
  points: Point[];
  startTime: number;
  lastUpdate: number;
}

export class GestureRecognizer {
  private gestures: Map<string, GesturePattern> = new Map();
  private currentGesture: GestureData | null = null;
  private onShapeChange: ((shape: VisualShape) => void) | null = null;
  private readonly maxGestureTime = 2000; // 2 seconds
  private readonly minGestureDistance = 50; // Minimum distance to be considered a gesture

  constructor(onShapeChange: ((shape: VisualShape) => void) | null = null) {
    this.onShapeChange = onShapeChange;
    this.initializeGestures();
  }

  private initializeGestures() {
    this.gestures.set('circle', {
      pattern: 'circular',
      minPoints: 20,
      maxDuration: 2000,
      action: () => this.triggerShapeChange('orb')
    });

    this.gestures.set('zigzag', {
      pattern: 'angular',
      minPoints: 10,
      maxDuration: 1500,
      action: () => this.triggerShapeChange('lightning')
    });

    this.gestures.set('swipe-up', {
      pattern: 'linear',
      minPoints: 5,
      maxDuration: 1000,
      minVelocity: 200,
      action: () => this.triggerShapeChange('fireworks')
    });

    this.gestures.set('swipe-down', {
      pattern: 'linear',
      minPoints: 5,
      maxDuration: 1000,
      minVelocity: 200,
      action: () => this.triggerShapeChange('wave')
    });

    this.gestures.set('swipe-left', {
      pattern: 'linear',
      minPoints: 5,
      maxDuration: 1000,
      minVelocity: 200,
      action: () => this.triggerShapeChange('dna')
    });

    this.gestures.set('swipe-right', {
      pattern: 'linear',
      minPoints: 5,
      maxDuration: 1000,
      minVelocity: 200,
      action: () => this.triggerShapeChange('brain')
    });

    this.gestures.set('double-tap', {
      pattern: 'tap',
      minPoints: 2,
      maxDuration: 500,
      action: () => this.triggerShapeChange('constellation')
    });
  }

  onPointerDown(x: number, y: number) {
    this.currentGesture = {
      points: [{ x, y, time: Date.now() }],
      startTime: Date.now(),
      lastUpdate: Date.now()
    };
  }

  onPointerMove(x: number, y: number) {
    if (!this.currentGesture) return;

    const now = Date.now();
    this.currentGesture.points.push({ x, y, time: now });
    this.currentGesture.lastUpdate = now;

    // Check for gesture timeout
    if (now - this.currentGesture.startTime > this.maxGestureTime) {
      this.endGesture();
    }
  }

  onPointerUp(x: number, y: number) {
    if (!this.currentGesture) return;

    const now = Date.now();
    this.currentGesture.points.push({ x, y, time: now });

    // Analyze the completed gesture
    this.analyzeGesture();
    this.currentGesture = null;
  }

  private analyzeGesture() {
    if (!this.currentGesture || this.currentGesture.points.length < 2) return;

    const points = this.currentGesture.points;
    const duration = this.currentGesture.lastUpdate - this.currentGesture.startTime;
    const totalDistance = this.calculateTotalDistance(points);

    // Skip if gesture is too short
    if (totalDistance < this.minGestureDistance) return;

    // Try to match patterns
    for (const [, pattern] of this.gestures) {
      if (this.matchesPattern(points, pattern, duration)) {
        const direction = this.getSwipeDirection(points);
        pattern.action(direction);
        break;
      }
    }
  }

  private matchesPattern(points: Point[], pattern: GesturePattern, duration: number): boolean {
    // Check basic requirements
    if (points.length < pattern.minPoints) return false;
    if (duration > pattern.maxDuration) return false;

    switch (pattern.pattern) {
      case 'circular':
        return this.isCircular(points);
      case 'angular':
        return this.isAngular(points);
      case 'linear':
        return this.isLinear(points, pattern.minVelocity);
      case 'tap':
        return this.isDoubleTap(points, duration);
      default:
        return false;
    }
  }

  private isCircular(points: Point[]): boolean {
    if (points.length < 10) return false;

    // Calculate center of mass
    const center = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 });
    center.x /= points.length;
    center.y /= points.length;

    // Check if points are roughly equidistant from center
    const distances = points.map(p => p ? Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2) : 0);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((acc, d) => acc + (d - avgDistance) ** 2, 0) / distances.length;

    // Low variance indicates circular motion
    return variance < avgDistance * 0.3;
  }

  private isAngular(points: Point[]): boolean {
    if (points.length < 8) return false;

    // Count direction changes (zigzag pattern)
    let directionChanges = 0;
    let lastDirection = 0;

    for (let i = 2; i < points.length; i++) {
      const current = points[i];
      const previous = points[i-1];
      if (!current || !previous) continue;

      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const direction = Math.atan2(dy, dx);

      if (lastDirection !== 0) {
        const angleDiff = Math.abs(direction - lastDirection);
        if (angleDiff > Math.PI / 3) { // 60 degrees
          directionChanges++;
        }
      }
      lastDirection = direction;
    }

    return directionChanges >= 3; // At least 3 direction changes for zigzag
  }

  private isLinear(points: Point[], minVelocity?: number): boolean {
    if (points.length < 5) return false;

    // Calculate overall direction
    const start = points[0];
    const end = points[points.length - 1];
    if (!start || !end) return false;

    const totalDx = end.x - start.x;
    const totalDy = end.y - start.y;
    const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

    // Check velocity if required
    if (minVelocity) {
      const duration = end.time - start.time;
      const velocity = totalDistance / (duration / 1000); // pixels per second
      if (velocity < minVelocity) return false;
    }

    // Check if points are roughly colinear
    let maxDeviation = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      if (point) {
        const deviation = this.pointToLineDistance(point, start, end);
        maxDeviation = Math.max(maxDeviation, deviation);
      }
    }

    // Allow some deviation for natural drawing
    return maxDeviation < totalDistance * 0.2;
  }

  private isDoubleTap(points: Point[], duration: number): boolean {
    return points.length === 2 && duration < 300; // Quick double tap
  }

  private getSwipeDirection(points: Point[]): 'up' | 'down' | 'left' | 'right' | undefined {
    if (points.length < 2) return undefined;

    const start = points[0];
    const end = points[points.length - 1];
    if (!start || !end) return undefined;

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  private calculateTotalDistance(points: Point[]): number {
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i-1];
      if (current && previous) {
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        distance += Math.sqrt(dx * dx + dy * dy);
      }
    }
    return distance;
  }

  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;

    let xx: number, yy: number;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private triggerShapeChange(shape: VisualShape) {
    this.onShapeChange?.(shape);
  }

  private endGesture() {
    this.currentGesture = null;
  }
}
