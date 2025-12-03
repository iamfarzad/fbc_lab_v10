// Type declarations for dynamically imported admin route handlers
// These modules are resolved at runtime by Vite/Vercel

declare module '../../../api/admin/analytics/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/sessions/route' {
  export function GET(req: Request): Promise<Response>
  export function POST(req: Request): Promise<Response>
  export function DELETE(req: Request): Promise<Response>
}

declare module '../../../api/admin/conversations/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/logs/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/stats/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/meetings/route' {
  export function GET(req: Request): Promise<Response>
  export function POST(req: Request): Promise<Response>
  export function PATCH(req: Request): Promise<Response>
  export function DELETE(req: Request): Promise<Response>
}

declare module '../../../api/admin/system-health/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/ai-performance/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/interaction-analytics/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/real-time-activity/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/security-audit/route' {
  export function GET(req: Request): Promise<Response>
  export function POST(req: Request): Promise<Response>
}

declare module '../../../api/admin/token-costs/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/email-campaigns/route' {
  export function GET(req: Request): Promise<Response>
  export function POST(req: Request): Promise<Response>
  export function PATCH(req: Request): Promise<Response>
  export function DELETE(req: Request): Promise<Response>
}

declare module '../../../api/admin/failed-conversations/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/flyio/usage/route' {
  export function GET(req: Request): Promise<Response>
}

declare module '../../../api/admin/login/route' {
  export function POST(req: Request): Promise<Response>
}

declare module '../../../api/admin/logout/route' {
  export function POST(req: Request): Promise<Response>
}

declare module '../../../api/admin/flyio/settings/route' {
  export function POST(req: Request): Promise<Response>
}

