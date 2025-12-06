/**
 * ROI Bar Chart Generator
 * 
 * Creates an SVG bar chart showing Investment vs Projected Savings
 * McKinsey/BCG style - clean, professional, data-focused
 */

import type { DiscoveryROIData } from '../utils/discovery-report-types.js'

export interface ROIChartOptions {
  width?: number
  height?: number
  showLabels?: boolean
}

const DEFAULT_OPTIONS: Required<ROIChartOptions> = {
  width: 280,
  height: 180,
  showLabels: true
}

/**
 * Format number as currency
 */
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

/**
 * Generate ROI bar chart SVG
 */
export function generateROIChart(data: DiscoveryROIData, options: ROIChartOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { width, height } = opts
  
  // If no data, return placeholder
  if (!data.hasData || !data.investment || !data.projectedSavings) {
    return generatePlaceholderChart(width, height)
  }
  
  const investment = data.investment
  const savings = data.projectedSavings
  const maxValue = Math.max(investment, savings)
  
  // Chart dimensions
  const chartPadding = { top: 30, right: 20, bottom: 40, left: 20 }
  const chartWidth = width - chartPadding.left - chartPadding.right
  const chartHeight = height - chartPadding.top - chartPadding.bottom
  
  // Bar dimensions
  const barWidth = 60
  const barGap = 40
  const totalBarsWidth = (barWidth * 2) + barGap
  const startX = chartPadding.left + (chartWidth - totalBarsWidth) / 2
  
  // Calculate bar heights
  const investmentHeight = (investment / maxValue) * chartHeight
  const savingsHeight = (savings / maxValue) * chartHeight
  
  // Colors (McKinsey-inspired)
  const investmentColor = '#FF6B35'  // Orange accent
  const savingsColor = '#00A878'     // Green for positive
  const textColor = '#1a1a2e'        // Dark navy
  const mutedColor = '#6b7280'       // Gray
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="investmentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${investmentColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${investmentColor};stop-opacity:0.7" />
        </linearGradient>
        <linearGradient id="savingsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${savingsColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${savingsColor};stop-opacity:0.7" />
        </linearGradient>
      </defs>
      
      <!-- Title -->
      <text x="${width / 2}" y="18" text-anchor="middle" fill="${textColor}" font-family="system-ui, sans-serif" font-size="11" font-weight="600">
        Investment vs Projected Savings
      </text>
      
      <!-- Baseline -->
      <line x1="${chartPadding.left}" y1="${chartPadding.top + chartHeight}" x2="${width - chartPadding.right}" y2="${chartPadding.top + chartHeight}" stroke="#e5e7eb" stroke-width="1"/>
      
      <!-- Investment Bar -->
      <rect 
        x="${startX}" 
        y="${chartPadding.top + chartHeight - investmentHeight}" 
        width="${barWidth}" 
        height="${investmentHeight}"
        fill="url(#investmentGrad)"
        rx="4"
      />
      <text 
        x="${startX + barWidth / 2}" 
        y="${chartPadding.top + chartHeight - investmentHeight - 8}" 
        text-anchor="middle" 
        fill="${investmentColor}" 
        font-family="system-ui, sans-serif" 
        font-size="12" 
        font-weight="700"
      >
        ${formatCurrency(investment)}
      </text>
      <text 
        x="${startX + barWidth / 2}" 
        y="${chartPadding.top + chartHeight + 16}" 
        text-anchor="middle" 
        fill="${mutedColor}" 
        font-family="system-ui, sans-serif" 
        font-size="9"
      >
        Investment
      </text>
      
      <!-- Savings Bar -->
      <rect 
        x="${startX + barWidth + barGap}" 
        y="${chartPadding.top + chartHeight - savingsHeight}" 
        width="${barWidth}" 
        height="${savingsHeight}"
        fill="url(#savingsGrad)"
        rx="4"
      />
      <text 
        x="${startX + barWidth + barGap + barWidth / 2}" 
        y="${chartPadding.top + chartHeight - savingsHeight - 8}" 
        text-anchor="middle" 
        fill="${savingsColor}" 
        font-family="system-ui, sans-serif" 
        font-size="12" 
        font-weight="700"
      >
        ${formatCurrency(savings)}
      </text>
      <text 
        x="${startX + barWidth + barGap + barWidth / 2}" 
        y="${chartPadding.top + chartHeight + 16}" 
        text-anchor="middle" 
        fill="${mutedColor}" 
        font-family="system-ui, sans-serif" 
        font-size="9"
      >
        Proj. Savings
      </text>
      
      <!-- ROI Badge -->
      ${data.roiPercentage ? `
        <rect x="${width - 65}" y="8" width="55" height="20" rx="10" fill="${savingsColor}" opacity="0.15"/>
        <text x="${width - 37}" y="22" text-anchor="middle" fill="${savingsColor}" font-family="system-ui, sans-serif" font-size="10" font-weight="700">
          ${data.roiPercentage}% ROI
        </text>
      ` : ''}
    </svg>
  `.trim()
}

/**
 * Generate placeholder when no ROI data available
 */
function generatePlaceholderChart(width: number, height: number): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f9fafb" rx="8"/>
      <text x="${width / 2}" y="${height / 2 - 8}" text-anchor="middle" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="11" font-weight="500">
        ROI Analysis
      </text>
      <text x="${width / 2}" y="${height / 2 + 10}" text-anchor="middle" fill="#d1d5db" font-family="system-ui, sans-serif" font-size="9">
        Available after ROI calculation
      </text>
    </svg>
  `.trim()
}

