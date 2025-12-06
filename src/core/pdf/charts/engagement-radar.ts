/**
 * Engagement Radar Chart Generator
 * 
 * Creates an SVG radar/spider chart showing engagement across modalities
 * 4 axes: Text, Voice, Screen Share, File Upload
 * McKinsey/BCG style - clean, professional, data-focused
 */

import type { EngagementMetrics } from '../utils/discovery-report-types.js'

export interface RadarChartOptions {
  width?: number
  height?: number
  showLabels?: boolean
}

const DEFAULT_OPTIONS: Required<RadarChartOptions> = {
  width: 280,
  height: 180,
  showLabels: true
}

/**
 * Convert polar coordinates to cartesian
 */
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

/**
 * Generate radar chart SVG
 */
export function generateEngagementRadar(metrics: EngagementMetrics, options: RadarChartOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { width, height } = opts
  
  // Chart center and radius
  const centerX = width / 2
  const centerY = height / 2 + 10 // Offset for title
  const maxRadius = Math.min(width, height) / 2 - 35
  
  // Axis labels and values
  const axes = [
    { label: 'Text', value: metrics.text, angle: 0 },
    { label: 'Voice', value: metrics.voice, angle: 90 },
    { label: 'Screen', value: metrics.screen, angle: 180 },
    { label: 'Files', value: metrics.files, angle: 270 }
  ]
  
  // Colors (McKinsey-inspired)
  const fillColor = '#FF6B35'      // Orange accent
  const strokeColor = '#FF6B35'
  const gridColor = '#e5e7eb'
  const textColor = '#1a1a2e'
  const mutedColor = '#6b7280'
  
  // Generate grid circles (25%, 50%, 75%, 100%)
  const gridCircles = [0.25, 0.5, 0.75, 1].map(factor => {
    const r = maxRadius * factor
    return `<circle cx="${centerX}" cy="${centerY}" r="${r}" fill="none" stroke="${gridColor}" stroke-width="1" stroke-dasharray="${factor < 1 ? '2,2' : 'none'}"/>`
  }).join('\n')
  
  // Generate axis lines
  const axisLines = axes.map(axis => {
    const endPoint = polarToCartesian(centerX, centerY, maxRadius, axis.angle)
    return `<line x1="${centerX}" y1="${centerY}" x2="${endPoint.x}" y2="${endPoint.y}" stroke="${gridColor}" stroke-width="1"/>`
  }).join('\n')
  
  // Generate data polygon points
  const dataPoints = axes.map(axis => {
    const radius = (axis.value / 100) * maxRadius
    return polarToCartesian(centerX, centerY, radius, axis.angle)
  })
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ')
  
  // Generate axis labels
  const labels = axes.map(axis => {
    const labelRadius = maxRadius + 18
    const point = polarToCartesian(centerX, centerY, labelRadius, axis.angle)
    const anchor = axis.angle === 0 ? 'middle' : axis.angle === 90 ? 'start' : axis.angle === 180 ? 'middle' : 'end'
    const dy = axis.angle === 0 ? '-2' : axis.angle === 180 ? '8' : '3'
    return `
      <text x="${point.x}" y="${point.y}" text-anchor="${anchor}" dy="${dy}" fill="${mutedColor}" font-family="system-ui, sans-serif" font-size="9" font-weight="500">
        ${axis.label}
      </text>
    `
  }).join('\n')
  
  // Generate value dots
  const valueDots = dataPoints.map((point) => {
    return `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${fillColor}" stroke="white" stroke-width="2"/>`
  }).join('\n')
  
  // Calculate average engagement for badge
  const avgEngagement = Math.round((metrics.text + metrics.voice + metrics.screen + metrics.files) / 4)
  const engagementLabel = avgEngagement >= 60 ? 'High' : avgEngagement >= 30 ? 'Medium' : 'Low'
  const badgeColor = avgEngagement >= 60 ? '#00A878' : avgEngagement >= 30 ? '#FF6B35' : '#9ca3af'
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${fillColor};stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:${fillColor};stop-opacity:0.1" />
        </linearGradient>
      </defs>
      
      <!-- Title -->
      <text x="${width / 2}" y="14" text-anchor="middle" fill="${textColor}" font-family="system-ui, sans-serif" font-size="11" font-weight="600">
        Engagement by Modality
      </text>
      
      <!-- Grid -->
      ${gridCircles}
      ${axisLines}
      
      <!-- Data Area -->
      <polygon 
        points="${polygonPoints}" 
        fill="url(#radarFill)" 
        stroke="${strokeColor}" 
        stroke-width="2"
      />
      
      <!-- Value Dots -->
      ${valueDots}
      
      <!-- Labels -->
      ${labels}
      
      <!-- Engagement Badge -->
      <rect x="${width - 55}" y="4" width="50" height="18" rx="9" fill="${badgeColor}" opacity="0.15"/>
      <text x="${width - 30}" y="16" text-anchor="middle" fill="${badgeColor}" font-family="system-ui, sans-serif" font-size="9" font-weight="700">
        ${engagementLabel}
      </text>
    </svg>
  `.trim()
}

/**
 * Generate placeholder when no engagement data
 */
export function generateEngagementPlaceholder(width: number = 280, height: number = 180): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f9fafb" rx="8"/>
      <text x="${width / 2}" y="${height / 2 - 8}" text-anchor="middle" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="11" font-weight="500">
        Engagement Metrics
      </text>
      <text x="${width / 2}" y="${height / 2 + 10}" text-anchor="middle" fill="#d1d5db" font-family="system-ui, sans-serif" font-size="9">
        Data will appear here
      </text>
    </svg>
  `.trim()
}

