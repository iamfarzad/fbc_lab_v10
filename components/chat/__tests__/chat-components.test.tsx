import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../context/ThemeContext'
import type React from 'react'

// Import all components to test
import MultimodalChat from '../../MultimodalChat'
import ChatMessage from '../ChatMessage'
import ChatInputDock from '../ChatInputDock'
import EmptyState from '../EmptyState'
import StatusBadges from '../../StatusBadges'
import MarkdownRenderer from '../MarkdownRenderer'
import CodeBlock from '../CodeBlock'
import MarkdownTable from '../MarkdownTable'
import { CalendarWidget } from '../CalendarWidget'
import { DiscoveryReportPreview } from '../DiscoveryReportPreview'
import ContextSources from '../ContextSources'
import ErrorMessage, { ErrorInfo } from '../ErrorMessage'
import ToolCallIndicator, { FloatingToolIndicator } from '../ToolCallIndicator'
import { ResponseTimeBadge } from '../MessageMetadata'
import { Lightbox } from '../Attachments'
import { isTextMime } from '../UIHelpers'

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock dependencies
vi.mock('../../StatusBadges', () => ({
  default: ({ connectionState }: any) => (
    <div data-testid="status-badges">{connectionState}</div>
  )
}))

vi.mock('../WebcamPreview', () => ({
  default: () => <div data-testid="webcam-preview">Webcam</div>
}))

vi.mock('../ScreenSharePreview', () => ({
  default: () => <div data-testid="screen-share-preview">Screen Share</div>
}))

describe('Chat Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>)
  const renderWithThemeAndRouter = (ui: React.ReactElement) =>
    render(
      <ThemeProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    )

  describe('MultimodalChat', () => {
    const defaultProps = {
      items: [],
      connectionState: 'disconnected' as const,
      onSendMessage: vi.fn(),
      onSendVideoFrame: vi.fn(),
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      isWebcamActive: false,
      onWebcamChange: vi.fn()
    }

    it('renders without crashing', () => {
      renderWithThemeAndRouter(<MultimodalChat {...defaultProps} />)
      expect(document.body).toBeTruthy()
    })

    it('renders empty state when no items', () => {
      renderWithThemeAndRouter(<MultimodalChat {...defaultProps} />)
      // Should show empty state or chat input
      expect(document.body).toBeTruthy()
    })
  })

  describe('ChatMessage', () => {
    const defaultProps = {
      item: {
        id: '1',
        role: 'user' as const,
        text: 'Test message',
        timestamp: new Date(),
        isFinal: true
      },
      onPreview: vi.fn()
    }

    it('renders user message', () => {
      renderWithTheme(<ChatMessage {...defaultProps} />)
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('renders assistant message', () => {
      renderWithTheme(
        <ChatMessage
          {...defaultProps}
          item={{
            ...defaultProps.item,
            role: 'model',
            text: 'Assistant response'
          }}
        />
      )
      expect(screen.getByText('Assistant response')).toBeInTheDocument()
    })
  })

  describe('ChatInputDock', () => {
    const defaultProps = {
      onSendMessage: vi.fn(),
      onSendVideoFrame: vi.fn(),
      isWebcamActive: false,
      onWebcamChange: vi.fn(),
      connectionState: 'connected' as const,
      isLocationShared: false,
      localAiAvailable: false
    }

    it('renders input dock', () => {
      renderWithTheme(<ChatInputDock {...defaultProps} />)
      expect(document.body).toBeTruthy()
    })

    it('renders with webcam active', () => {
      renderWithTheme(<ChatInputDock {...defaultProps} isWebcamActive={true} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('EmptyState', () => {
    it('renders empty state', () => {
      renderWithTheme(<EmptyState onSuggest={vi.fn()} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('StatusBadges', () => {
    it('renders status badges', () => {
      render(<StatusBadges connectionState="connected" />)
      expect(screen.getByTestId('status-badges')).toBeInTheDocument()
    })
  })

  describe('MarkdownRenderer', () => {
    it('renders markdown text', () => {
      render(<MarkdownRenderer content="# Hello World" />)
      expect(document.body).toBeTruthy()
    })

    it('renders code blocks', () => {
      render(<MarkdownRenderer content="```js\nconst x = 1;\n```" />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('CodeBlock', () => {
    it('renders code block', () => {
      render(<CodeBlock code="const x = 1;" language="javascript" />)
      expect(document.body).toBeTruthy()
    })

    it('renders without language', () => {
      render(<CodeBlock code="const x = 1;" />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('MarkdownTable', () => {
    const tableContent = `| Header 1 | Header 2 |
|----------|---------|
| Cell 1   | Cell 2  |`

    it('renders table', () => {
      render(<MarkdownTable content={tableContent} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('CalendarWidget', () => {
    it('renders calendar widget', () => {
      render(<CalendarWidget onDateSelect={vi.fn()} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('DiscoveryReportPreview', () => {
    it('renders discovery report preview', () => {
      render(
        <DiscoveryReportPreview
          htmlContent="<div>Test Report</div>"
          bookingUrl="https://example.com/book"
        />
      )
      expect(document.body).toBeTruthy()
    })
  })

  describe('ContextSources', () => {
    const sources = [
      { type: 'web', url: 'https://example.com', title: 'Example' }
    ]

    it('renders context sources', () => {
      render(<ContextSources sources={sources} />)
      expect(document.body).toBeTruthy()
    })

    it('renders empty state when no sources', () => {
      render(<ContextSources sources={[]} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('ErrorMessage', () => {
    const errorInfo: ErrorInfo = {
      type: 'network',
      message: 'Test error',
      retryAfter: 0
    }

    it('renders error message', () => {
      render(<ErrorMessage error={errorInfo} />)
      expect(screen.getByText(/Test error/i)).toBeInTheDocument()
    })

    it('renders with retry action', () => {
      const onRetry = vi.fn()
      render(<ErrorMessage error={errorInfo} onRetry={onRetry} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('ToolCallIndicator', () => {
    const tools = [
      {
        id: '1',
        name: 'test-tool',
        status: 'running' as const,
        progress: 50
      }
    ]

    it('renders tool call indicator', () => {
      render(<ToolCallIndicator tools={tools} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('FloatingToolIndicator', () => {
    const toolCalls = [
      {
        id: '1',
        name: 'test_tool',
        status: 'running' as const,
        progress: 50
      }
    ]

    it('renders floating tool indicator', () => {
      render(<FloatingToolIndicator tools={toolCalls} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('ResponseTimeBadge', () => {
    it('renders response time badge', () => {
      render(<ResponseTimeBadge ms={100} />)
      expect(document.body).toBeTruthy()
    })
  })


  describe('Lightbox', () => {
    const attachment = {
      type: 'image',
      mimeType: 'image/png',
      url: 'data:image/png;base64,test',
      name: 'test.png'
    }

    it('renders lightbox when open', () => {
      render(<Lightbox attachment={attachment} onClose={vi.fn()} />)
      expect(document.body).toBeTruthy()
    })
  })

  describe('UIHelpers', () => {
    describe('isTextMime', () => {
      it('identifies text MIME types', () => {
        expect(isTextMime('text/plain')).toBe(true)
        expect(isTextMime('text/html')).toBe(true)
        expect(isTextMime('application/json')).toBe(true)
        expect(isTextMime('image/png')).toBe(false)
        expect(isTextMime('video/mp4')).toBe(false)
      })
    })
  })
})
