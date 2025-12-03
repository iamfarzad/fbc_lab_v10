/**
 * Company size type definitions
 * Shared across the codebase for consistent company size handling
 */

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+' | 'unknown'

/**
 * Convert company size string to employee count range
 */
export function getCompanySizeRange(size: CompanySize): { min: number; max: number } | null {
  switch (size) {
    case '1-10':
      return { min: 1, max: 10 }
    case '11-50':
      return { min: 11, max: 50 }
    case '51-200':
      return { min: 51, max: 200 }
    case '201-1000':
      return { min: 201, max: 1000 }
    case '1000+':
      return { min: 1000, max: Infinity }
    case 'unknown':
    default:
      return null
  }
}

/**
 * Check if company size is enterprise-level
 */
export function isEnterpriseSize(size: CompanySize): boolean {
  return size === '201-1000' || size === '1000+'
}

/**
 * Check if company size is startup/small business
 */
export function isSmallBusiness(size: CompanySize): boolean {
  return size === '1-10' || size === '11-50'
}

