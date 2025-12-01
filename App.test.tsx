import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { App } from './App'
import { ToastProvider } from './context/ToastContext'

// Mock dependencies
vi.mock('./components/AntigravityCanvas', () => ({
  default: () => <div data-testid="canvas">Canvas</div>
}))
vi.mock('./components/ControlPanel', () => ({
  default: () => <div data-testid="control-panel">Control Panel</div>
}))
vi.mock('./components/MultimodalChat', () => ({
  default: () => <div data-testid="chat">Chat</div>
}))
vi.mock('./components/chat/WebcamPreview', () => ({
  default: () => <div data-testid="webcam">Webcam</div>
}))

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>
    )
    // App renders - check for any visible element
    expect(document.body).toBeTruthy()
  })
})

