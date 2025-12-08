import { useState, useEffect, useRef } from 'react'
import { useAdminChat } from 'src/hooks/admin/useAdminChat'
import { AdminChatHistory } from './AdminChatHistory'
import { Button } from 'src/components/ui/button'
import { Textarea } from 'src/components/ui/textarea'
import { ScrollArea } from 'src/components/ui/scroll-area'
import { Avatar, AvatarFallback } from 'src/components/ui/avatar'
import { Badge } from 'src/components/ui/badge'
import { Spinner } from 'src/components/ui/spinner'
import { Alert, AlertDescription } from 'src/components/ui/alert'
import { Send, User, Bot } from 'lucide-react'
import { cn } from 'src/lib/utils'
import MarkdownRenderer from '../../chat/MarkdownRenderer'

interface AdminChatPanelProps {
  sessionId?: string
  isDarkMode?: boolean
  className?: string
}

export function AdminChatPanel({
  sessionId,
  isDarkMode = false,
  className
}: AdminChatPanelProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    sessionId || localStorage.getItem('admin-session-id') || `admin-${Date.now()}`
  )
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    isLoadingHistory
  } = useAdminChat({ sessionId: currentSessionId })

  // Persist sessionId to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('admin-session-id', currentSessionId)
    }
  }, [currentSessionId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isStreaming])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return

    const message = inputValue.trim()
    setInputValue('')
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleSessionSelect = (newSessionId: string) => {
    setCurrentSessionId(newSessionId)
    localStorage.setItem('admin-session-id', newSessionId)
  }

  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar: Chat History */}
      <AdminChatHistory
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        className="border-r"
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size={24} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className={cn('w-12 h-12 mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-500')} />
              <h3 className={cn('text-lg font-semibold mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
                Admin Chat
              </h3>
              <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                Ask me about leads, analytics, performance, or system health.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isUser = message.role === 'user'
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback
                        className={cn(
                          isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isUser ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    {/* Message Content */}
                    <div
                      className={cn(
                        'flex flex-col gap-1 max-w-[80%]',
                        isUser ? 'items-end' : 'items-start'
                      )}
                    >
                      {/* Role Badge */}
                      <Badge variant="outline" className="text-xs">
                        {isUser ? 'You' : 'Admin AI'}
                      </Badge>

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          'rounded-lg px-4 py-2 text-sm',
                          isUser
                            ? 'bg-primary text-primary-foreground'
                            : isDarkMode
                            ? 'bg-muted text-foreground'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        <MarkdownRenderer content={message.content} isUser={isUser} />
                      </div>

                      {/* Timestamp */}
                      {message.timestamp && (
                        <span
                          className={cn(
                            'text-xs',
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          )}
                        >
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Streaming Indicator */}
              {isStreaming && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="text-xs w-fit">
                      Admin AI
                    </Badge>
                    <div
                      className={cn(
                        'rounded-lg px-4 py-2 text-sm',
                        isDarkMode ? 'bg-muted text-foreground' : 'bg-muted text-foreground'
                      )}
                    >
                      <Spinner size={16} className="inline-block mr-2" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div
          className={cn(
            'border-t p-4',
            isDarkMode ? 'border-gray-800 bg-black/40' : 'border-gray-200 bg-white'
          )}
        >
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about leads, analytics, or system health..."
              className="min-h-[60px] resize-none"
              disabled={isLoading || isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || isStreaming}
              size="icon"
              className="shrink-0"
            >
              {isLoading || isStreaming ? (
                <Spinner size={16} />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



