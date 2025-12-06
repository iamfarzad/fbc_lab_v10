/**
 * Tools Timeline Chart Generator
 * 
 * Creates an SVG horizontal timeline showing tools/capabilities used during session
 * McKinsey/BCG style - clean, professional, data-focused
 */

import type { ToolUsageRecord } from '../utils/discovery-report-types.js'
import { TOOL_LABELS } from '../utils/discovery-report-types.js'

export interface TimelineChartOptions {
  width?: number
  height?: number
  maxTools?: number
}

const DEFAULT_OPTIONS: Required<TimelineChartOptions> = {
  width: 560,
  height: 80,
  maxTools: 6
}

/**
 * Get friendly label for tool
 */
function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const TOOL_SVG_PATHS: Record<string, string> = {
  'search_web': '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'calculate_roi': '<path d="M12 20V10m6 10V4M6 20v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', 
  'capture_screen_snapshot': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2"/>',
  'capture_webcam_snapshot': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>',
  'default': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2"/>'
}

/**
 * Get SVG content for tool
 */
function getToolSVG(toolName: string): string {
  const path = TOOL_SVG_PATHS[toolName] || TOOL_SVG_PATHS['default']
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="icon">${path}</svg>`
}

/**
 * Generate tools timeline SVG
 */
export function generateToolsTimeline(tools: ToolUsageRecord[], options: TimelineChartOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { width, height, maxTools } = opts
  
  // If no tools, return placeholder
  if (!tools || tools.length === 0) {
    return generateTimelinePlaceholder(width, height)
  }
  
  // Limit tools to max
  const displayTools = tools.slice(0, maxTools)
  const hasMore = tools.length > maxTools
  
  // Colors
  const accentColor = '#FF6B35'
  const lineColor = '#e5e7eb'
  const textColor = '#1a1a2e'
  const mutedColor = '#6b7280'
  const bgColor = '#fff7ed'
  
  // Layout
  const padding = { left: 20, right: 20, top: 20, bottom: 10 }
  const timelineY = height / 2 + 5
  const nodeRadius = 14
  const availableWidth = width - padding.left - padding.right
  const spacing = displayTools.length > 1 ? availableWidth / (displayTools.length - 1) : 0
  
  // Generate tool nodes
  const nodes = displayTools.map((tool, index) => {
    const x = displayTools.length === 1 
      ? width / 2 
      : padding.left + (index * spacing)
    const svgIcon = getToolSVG(tool.name)
    const label = getToolLabel(tool.name)
    
    return `
      <!-- Node ${index + 1}: ${tool.name} -->
      <g transform="translate(${x}, ${timelineY})">
        <!-- Node circle -->
        <circle cx="0" cy="0" r="${nodeRadius}" fill="${bgColor}" stroke="${accentColor}" stroke-width="2"/>
        
        <!-- Icon (SVG) -->
        <g transform="translate(-7, -7)" style="color: ${accentColor}">
           ${svgIcon}
        </g>
        
        <!-- Label below -->
        <text x="0" y="${nodeRadius + 14}" text-anchor="middle" fill="${mutedColor}" font-family="system-ui, sans-serif" font-size="8" font-weight="500">
          ${label.length > 12 ? label.substring(0, 10) + '...' : label}
        </text>
      </g>
    `
  }).join('\n')
  
  // Generate connecting arrows
  const arrows = displayTools.slice(0, -1).map((_, index) => {
    const x1 = padding.left + (index * spacing) + nodeRadius + 4
    const x2 = padding.left + ((index + 1) * spacing) - nodeRadius - 4
    
    if (x2 - x1 < 20) return '' // Skip if too close
    
    return `
      <line x1="${x1}" y1="${timelineY}" x2="${x2 - 6}" y2="${timelineY}" stroke="${lineColor}" stroke-width="2"/>
      <polygon points="${x2},${timelineY} ${x2 - 6},${timelineY - 4} ${x2 - 6},${timelineY + 4}" fill="${lineColor}"/>
    `
  }).join('\n')
  
  // "More" indicator if truncated
  const moreIndicator = hasMore ? `
    <text x="${width - padding.right}" y="${timelineY + 4}" text-anchor="end" fill="${mutedColor}" font-family="system-ui, sans-serif" font-size="9" font-style="italic">
      +${tools.length - maxTools} more
    </text>
  ` : ''
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Title -->
      <text x="${padding.left}" y="14" fill="${textColor}" font-family="system-ui, sans-serif" font-size="11" font-weight="600">
        AI Capabilities Demonstrated
      </text>
      
      <!-- Connecting Lines -->
      ${arrows}
      
      <!-- Tool Nodes -->
      ${nodes}
      
      <!-- More Indicator -->
      ${moreIndicator}
    </svg>
  `.trim()
}

/**
 * Generate placeholder when no tools used
 */
function generateTimelinePlaceholder(width: number, height: number): string {
  const mutedColor = '#9ca3af'
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f9fafb" rx="8"/>
      <text x="${width / 2}" y="${height / 2 - 4}" text-anchor="middle" fill="${mutedColor}" font-family="system-ui, sans-serif" font-size="11" font-weight="500">
        AI Capabilities
      </text>
      <text x="${width / 2}" y="${height / 2 + 12}" text-anchor="middle" fill="#d1d5db" font-family="system-ui, sans-serif" font-size="9">
        Tools will appear as they're used
      </text>
    </svg>
  `.trim()
}

/**
 * Generate compact tools list (alternative to timeline for small spaces)
 */
export function generateToolsList(tools: ToolUsageRecord[], maxDisplay: number = 4): string {
  if (!tools || tools.length === 0) {
    return '<span style="color: #9ca3af; font-size: 11px;">No tools used</span>'
  }
  
  const displayTools = tools.slice(0, maxDisplay)
  const hasMore = tools.length > maxDisplay
  
  const items = displayTools.map(tool => {
    const label = getToolLabel(tool.name)
    return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #fff7ed; border-radius: 12px; font-size: 10px; color: #1a1a2e; border: 1px solid #FF6B35;">${label}</span>`
  })
  
  if (hasMore) {
    items.push(`<span style="color: #6b7280; font-size: 10px;">+${tools.length - maxDisplay} more</span>`)
  }
  
  return `<div style="display: flex; flex-wrap: wrap; gap: 6px;">${items.join('')}</div>`
}

