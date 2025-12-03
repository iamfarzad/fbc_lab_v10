/**
 * PDF ROI Charts - Implementation using server-side SVG generation
 * Removes React/Recharts dependency for server-side rendering
 */

export interface ROIData {
  investment: {
    initial: number
    annual: number
  }
  savings: Record<string, number>
  roi: {
    firstYear: number
    paybackPeriod: string
  }
  [key: string]: unknown
}

export function isValidROIData(data: unknown): data is ROIData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, any>
  return (
    typeof d.investment === 'object' &&
    typeof d.savings === 'object' &&
    typeof d.roi === 'object'
  )
}

/**
 * Generate HTML string containing SVG charts
 * Note: This runs on the server/build time
 */
export async function generateROIChartsHTML(data: ROIData): Promise<string> {
  // Prepare data for charts
  const savingsData = Object.entries(data.savings).map(([name, value]) => ({
    name: name.replace(/([A-Z])/g, ' $1').trim(), // format camelCase
    value
  }))

  // We can't easily render Recharts to static SVG without a browser environment in this specific setup
  // because Recharts relies on DOM APIs for measurement.
  // However, we can generate a simplified SVG manually or use a different library.
  // For now, we'll construct a simple SVG string manually to ensure reliability without heavy DOM deps.
  
  const savingsTotal = Object.values(data.savings).reduce((a, b) => a + b, 0)
  
  // Simple Bar Chart SVG for Cost vs Savings
  const barChartSvg = `
    <svg width="100%" height="300" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
      <style>
        .bar { transition: all 0.3s; }
        .label { font-family: sans-serif; font-size: 12px; }
        .title { font-family: sans-serif; font-size: 16px; font-weight: bold; }
      </style>
      <text x="300" y="30" text-anchor="middle" class="title">Annual Cost vs Savings (Year 1)</text>
      
      <!-- Grid lines -->
      <line x1="50" y1="250" x2="550" y2="250" stroke="#ccc" stroke-width="1"/>
      <line x1="50" y1="50" x2="50" y2="250" stroke="#ccc" stroke-width="1"/>
      
      <!-- Investment Bar -->
      <rect x="150" y="${250 - (data.investment.initial / savingsTotal) * 200}" width="100" height="${(data.investment.initial / savingsTotal) * 200}" fill="#FF8042" />
      <text x="200" y="270" text-anchor="middle" class="label">Investment</text>
      <text x="200" y="${250 - (data.investment.initial / savingsTotal) * 200 - 10}" text-anchor="middle" class="label">$${data.investment.initial.toLocaleString()}</text>
      
      <!-- Savings Bar -->
      <rect x="350" y="50" width="100" height="200" fill="#00C49F" />
      <text x="400" y="270" text-anchor="middle" class="label">Projected Savings</text>
      <text x="400" y="40" text-anchor="middle" class="label">$${savingsTotal.toLocaleString()}</text>
    </svg>
  `

  // Simple Breakdown List instead of Pie Chart (cleaner for PDF)
  const breakdownHtml = `
    <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin-bottom: 15px; color: #333;">Savings Breakdown</h3>
      <ul style="list-style: none; padding: 0;">
        ${savingsData.map(item => `
          <li style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <span style="font-weight: 500;">${item.name}</span>
            <span style="color: #00C49F; font-weight: bold;">$${item.value.toLocaleString()}</span>
          </li>
        `).join('')}
        <li style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd;">
          <span style="font-weight: bold;">Total Annual Savings</span>
          <span style="color: #00C49F; font-weight: bold; font-size: 1.1em;">$${savingsTotal.toLocaleString()}</span>
        </li>
      </ul>
    </div>
  `

  // ROI Stats Grid
  const statsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 20px;">
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: #666;">ROI Year 1</div>
        <div style="font-size: 24px; font-weight: bold; color: #1976d2;">${data.roi.firstYear}%</div>
      </div>
      <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: #666;">Payback Period</div>
        <div style="font-size: 24px; font-weight: bold; color: #388e3c;">${data.roi.paybackPeriod}</div>
      </div>
      <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: #666;">Net Benefit (Yr 1)</div>
        <div style="font-size: 24px; font-weight: bold; color: #f57c00;">$${(savingsTotal - data.investment.initial).toLocaleString()}</div>
      </div>
    </div>
  `

  return `
    <div class="roi-section">
      <h2 class="section-title">Financial Impact Analysis</h2>
      ${statsHtml}
      <div style="margin-top: 30px; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        ${barChartSvg}
      </div>
      ${breakdownHtml}
    </div>
  `
}

export function generateROIChartsImages(_data: ROIData): Promise<{
  investmentChart: Uint8Array
  savingsChart: Uint8Array
  roiChart: Uint8Array
}> {
  // Stub: Return empty buffers or a 1x1 transparent pixel
  const emptyPng = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0,
    0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1,
    13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
  ])
  return Promise.resolve({
    investmentChart: emptyPng,
    savingsChart: emptyPng,
    roiChart: emptyPng
  })
}
