import { useEffect, useRef } from 'react'
import { CONTACT_CONFIG } from 'src/config/constants'

interface CalendarWidgetProps {
  title: string
  description?: string
  url?: string
  isDarkMode?: boolean
}

export function CalendarWidget({
  title,
  description,
  url,
  isDarkMode = false
}: CalendarWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }>>([])

  // Get booking URL from environment or use default
  const bookingUrl = url || CONTACT_CONFIG.SCHEDULING.BOOKING_URL

  // Initialize particle effects similar to AntigravityCanvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Create subtle particles (fewer than main canvas)
    const particleCount = 20
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.2
    }))

    let animationId: number

    const animate = () => {
      // Clear with slight opacity for trails
      ctx.fillStyle = isDarkMode
        ? `rgba(0, 0, 0, 0.15)`
        : `rgba(248, 249, 250, 0.2)`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle (matching AntigravityCanvas style)
        ctx.fillStyle = isDarkMode
          ? `rgba(220, 220, 230, ${particle.alpha * 0.6})`
          : `rgba(20, 20, 20, ${particle.alpha * 0.4})`
        const d = Math.max(0.8, particle.size * 2)
        ctx.fillRect(Math.floor(particle.x), Math.floor(particle.y), d, d)
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      const newRect = canvas.getBoundingClientRect()
      canvas.width = newRect.width
      canvas.height = newRect.height
      // Reposition particles
      particlesRef.current.forEach((particle) => {
        particle.x = Math.random() * canvas.width
        particle.y = Math.random() * canvas.height
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [isDarkMode])

  return (
    <div className="w-full max-w-md mx-auto my-6 animate-fade-in-up px-4 relative">
      {/* Particle Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-3xl pointer-events-none opacity-50"
        style={{ mixBlendMode: isDarkMode ? 'screen' : 'multiply' }}
      />

      {/* Main Card with F.B/c Design */}
      <div className="relative bg-white/70 dark:bg-black/50 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
        {/* Header with F.B/c Branding */}
        <div className="px-6 py-5 bg-gradient-to-r from-orange-500/20 via-blue-500/20 to-orange-500/20 border-b border-white/20 dark:border-white/5 relative overflow-hidden">
          {/* Subtle animated particle dots */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-3 left-6 w-1 h-1 rounded-full bg-orange-400 animate-pulse"></div>
            <div className="absolute top-7 right-10 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute bottom-4 left-14 w-1 h-1 rounded-full bg-orange-300 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute bottom-6 right-6 w-1 h-1 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '0.7s' }}></div>
          </div>

          <div className="relative flex items-start gap-4">
            {/* F.B/c Logo Badge */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-400 via-blue-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-lg relative overflow-hidden">
                <span className="relative z-10 font-matrix tracking-tight">F.B/c</span>
                {/* Animated shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse opacity-50"></div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-blue-600 dark:from-orange-400 dark:to-blue-400 leading-tight">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 relative">
          <button
            onClick={() => window.open(bookingUrl, '_blank')}
            className="relative w-full px-6 py-4 bg-gradient-to-r from-orange-500 via-blue-500 to-orange-500 text-white font-semibold rounded-2xl hover:from-orange-600 hover:via-blue-600 hover:to-orange-600 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group overflow-hidden"
          >
            {/* Animated shimmer effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

            {/* Calendar Icon */}
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>

            <span className="relative z-10 tracking-wide">Book Free 30-Min Call</span>

            {/* Calendar icon instead of external link */}
            <svg
              className="w-4 h-4 group-hover:scale-110 transition-transform relative z-10"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Footer with F.B/c branding */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-blue-500"></div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Powered by <span className="font-matrix font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-500">F.B/c</span>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}