import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/components/ui/card'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import { ScrollArea } from 'src/components/ui/scroll-area'
import { Activity, Play, Square, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { isRecord } from 'src/lib/guards'
import { logger } from 'src/lib/logger-client'

// Type events and guard WS payloads
type ActivityEvent = {
  id: string
  type: string
  ts: string
  timestamp?: string
  message?: string
  payload?: Record<string, unknown>
  details?: Record<string, unknown>
}

// useEvent helper for stable callbacks
function useEvent<T extends (...a: unknown[]) => unknown>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback(((...a) => ref.current(...a)) as T, [])
}

export function RealTimeActivitySection() {
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useEvent(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setError(null)
    setIsConnected(true)

    const eventSource = new EventSource('/api/admin/real-time-activity', {
      withCredentials: true,
    })

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const raw: unknown = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data))
        
        // Guard WS payloads with isRecord
        if (!isRecord(raw)) return
        
        const type = typeof raw.type === 'string' ? raw.type : undefined
        
        if (type === 'connected') {
          logger.debug('Connected to real-time activity stream')
        } else if (type === 'activity') {
          // Guard payload fields before reading
          const activityData = isRecord(raw.data) ? raw.data : raw
          
          const timestampValue = typeof activityData.timestamp === 'string' ? activityData.timestamp : undefined
          const messageValue = typeof activityData.message === 'string' ? activityData.message : undefined
          const payloadValue = isRecord(activityData.payload) ? activityData.payload : undefined
          const detailsValue = isRecord(activityData.details) ? activityData.details : undefined
          
          const ev: ActivityEvent = {
            id: typeof activityData.id === 'string' ? activityData.id : crypto.randomUUID(),
            type: typeof activityData.type === 'string' ? activityData.type : 'system',
            ts: typeof activityData.ts === 'string' ? activityData.ts : timestampValue || new Date().toISOString(),
            ...(timestampValue !== undefined && { timestamp: timestampValue }),
            ...(messageValue !== undefined && { message: messageValue }),
            ...(payloadValue !== undefined && { payload: payloadValue }),
            ...(detailsValue !== undefined && { details: detailsValue }),
          }
          
          setActivities((prev) => {
            // Add new activity, keep only last 200
            const updated = [ev, ...prev].slice(0, 200)
            return updated
          })

          // Auto-scroll to top (newest)
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
              if (viewport) {
                viewport.scrollTop = 0
              }
            }
          }, 50)
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
      setIsConnected(false)
      setError('Connection lost. Click connect to retry.')
      eventSource.close()
    }

    eventSourceRef.current = eventSource
  })

  const disconnect = useEvent(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  })

  // Fetch initial activities - convert handlers to useEvent
  const fetchInitialActivities = useEvent(async () => {
    try {
      const response = await fetch('/api/admin/real-time-activity?limit=50')
      if (response.ok) {
        const dataRaw = (await response.json()) as unknown
        // Guard WS payloads
        if (isRecord(dataRaw) && Array.isArray(dataRaw.activities)) {
          const activities = dataRaw.activities
            .filter((a): a is ActivityEvent => isRecord(a) && typeof a.id === 'string')
            .map(a => {
              const timestampValue = typeof a.timestamp === 'string' ? a.timestamp : undefined
              const messageValue = typeof a.message === 'string' ? a.message : undefined
              const payloadValue = isRecord(a.payload) ? a.payload : undefined
              const detailsValue = isRecord(a.details) ? a.details : undefined
              
              const event: ActivityEvent = {
                id: typeof a.id === 'string' ? a.id : crypto.randomUUID(),
                type: typeof a.type === 'string' ? a.type : 'system',
                ts: typeof a.ts === 'string' ? a.ts : timestampValue || new Date().toISOString(),
              }
              
              if (timestampValue !== undefined) event.timestamp = timestampValue
              if (messageValue !== undefined) event.message = messageValue
              if (payloadValue !== undefined) event.payload = payloadValue
              if (detailsValue !== undefined) event.details = detailsValue
              
              return event
            })
          setActivities(activities)
        }
      }
    } catch (err) {
      console.error('Failed to fetch initial activities:', err)
    }
  })

  useEffect(() => {
    void fetchInitialActivities()

    return () => {
      disconnect()
    }
  }, [fetchInitialActivities, disconnect])

  const getActivityBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'error':
        return 'destructive'
      case 'api_call':
        return 'default'
      case 'conversation':
        return 'secondary'
      case 'tool_execution':
        return 'outline'
      case 'system':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-6" />
                Real-Time Activity Monitor
              </CardTitle>
              <CardDescription>
                Live system activity feed
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {!isConnected ? (
                <Button variant="outline" size="sm" onClick={connect}>
                  <Play className="mr-2 size-4" />
                  Connect
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={disconnect}>
                  <Square className="mr-2 size-4" />
                  Disconnect
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { void fetchInitialActivities() }}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <ScrollArea className="h-[600px] w-full rounded-md border" ref={scrollAreaRef}>
            <div className="space-y-2 p-4">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No activity yet. Click Connect to start monitoring.
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <Badge variant={getActivityBadgeVariant(activity.type)} className="shrink-0">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{activity.message || 'No message'}</div>
                      {(activity.details || activity.payload) && Object.keys(activity.details || activity.payload || {}).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {JSON.stringify(activity.details || activity.payload, null, 2).substring(0, 100)}
                          {JSON.stringify(activity.details || activity.payload).length > 100 ? '...' : ''}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp || activity.ts), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{activities.length} activities</span>
            <span>Auto-refresh: {isConnected ? 'Enabled' : 'Disabled'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

