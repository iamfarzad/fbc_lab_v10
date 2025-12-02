import * as React from 'react'
import * as RechartsPrimitives from 'recharts'

import { cn } from 'src/lib/utils'

// Chart container component
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: Record<
      string,
      {
        label?: React.ReactNode
        icon?: React.ComponentType
      } & (
        | { color?: string; theme?: never }
        | { color?: never; theme: Record<string, string> }
      )
    >
    children: React.ReactNode
    data?: unknown[]
  }
>(({ id, className, children, config, data, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <div
      data-chart={chartId}
      ref={ref}
      className={cn(
        'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke="#fff"]]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none',
        className
      )}
      {...props}
    >
      <RechartsPrimitives.ResponsiveContainer>
        {children}
      </RechartsPrimitives.ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = 'Chart'

// Chart tooltip
const ChartTooltip = RechartsPrimitives.Tooltip

interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{
    value?: unknown
    name?: string
    dataKey?: string
    color?: string
    fill?: string
    payload?: {
      config?: Record<string, { label?: React.ReactNode }>
    }
  }>
  label?: unknown
  labelFormatter?: (label: unknown, payload?: unknown[]) => React.ReactNode
  formatter?: (
    value: unknown,
    name: string,
    item: unknown,
    index: number,
    payload: unknown
  ) => React.ReactNode
  valueFormatter?: (value: unknown, name?: string) => React.ReactNode
  className?: string
  indicator?: 'line' | 'dot' | 'dashed'
  hideLabel?: boolean
  hideIndicator?: boolean
  labelClassName?: string
  color?: string
  nameKey?: string
  labelKey?: string
  // Recharts TooltipContent props (for compatibility)
  [key: string]: unknown
}

// Make ChartTooltipContent compatible with recharts Tooltip content prop
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps & Record<string, unknown>
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      valueFormatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload || !Array.isArray(payload) || payload.length === 0) {
        return null
      }

      const [item] = payload
      if (!item) return null
      
      const key = `${labelKey || item.dataKey || item.name || 'value'}`
      const itemConfig = item.payload?.config?.[key] ?? {}

      if (labelFormatter && typeof labelFormatter === 'function') {
        return (
          <div className={cn('font-medium', labelClassName || '')}>
            {labelFormatter(label, payload)}
          </div>
        )
      }

      if (!label && !itemConfig?.label) {
        return null
      }

      return (
        <div className={cn('font-medium', labelClassName || '')}>
          {itemConfig?.label ?? (label ? String(label) : null)}
        </div>
      )
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      labelKey,
    ])

    if (!active || !payload || !Array.isArray(payload) || payload.length === 0) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot'

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md',
          className || ''
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className={cn('grid gap-1.5', nestLabel ? 'ml-auto' : '')}>
          {payload.map((item: {
            value?: unknown
            name?: string
            dataKey?: string
            color?: string
            fill?: string
            payload?: {
              config?: Record<string, { label?: React.ReactNode }>
            }
          }, index: number) => {
            if (!item) return null
            const key = `${nameKey || item.name || item.dataKey || 'value'}`
            const itemConfig = item.payload?.config?.[key] ?? {}
            const indicatorColor = color || item.fill || item.color

            return (
              <div
                key={item.dataKey || index}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                  indicator === 'dot' && 'items-center'
                )}
              >
                {formatter && typeof formatter === 'function' && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload || {})
                ) : valueFormatter && typeof valueFormatter === 'function' && item?.value !== undefined ? (
                  <div className="flex items-center gap-2">
                    {!hideIndicator && (
                      <div
                        className={cn(
                          'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                          {
                            'h-2.5 w-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-1 border-[1.5px] border-dashed bg-transparent':
                              indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          }
                        )}
                        style={
                          {
                            '--color-bg': color || item.fill || item.color,
                            '--color-border': color || item.fill || item.color,
                          } as React.CSSProperties
                        }
                      />
                    )}
                    <div className="flex flex-1 justify-between leading-none items-center">
                      <span className="text-muted-foreground">
                        {item.name || item.dataKey}
                      </span>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {typeof valueFormatter === 'function' ? valueFormatter(item.value, item.name) : String(item.value)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {!hideIndicator && (
                      <div
                        className={cn(
                          'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                          {
                            'h-2.5 w-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-1 border-[1.5px] border-dashed bg-transparent':
                              indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          }
                        )}
                        style={
                          {
                            '--color-bg': indicatorColor,
                            '--color-border': indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )}
                    <div
                      className={cn(
                        'flex flex-1 justify-between leading-none',
                        nestLabel ? 'items-end' : 'items-center'
                      )}
                    >
                      <div className="grid gap-1.5">
                        <span className="text-muted-foreground">
                          {itemConfig?.label ?? item.name}
                        </span>
                        {nestLabel ? tooltipLabel : null}
                      </div>
                      {item.value !== undefined && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {typeof item.value === 'number' 
                            ? item.value.toLocaleString() 
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = 'ChartTooltip'

// Chart config type
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<string, string> }
  )
>

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  // Re-export recharts primitives
  RechartsPrimitives,
}

