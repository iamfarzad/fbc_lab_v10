import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LiveClientWS } from '../client';
import { WEBSOCKET_CONFIG } from 'src/config/constants';

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  readyState = WebSocket.CONNECTING;
  send = vi.fn();
  close = vi.fn();
  bufferedAmount = 0;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }
}

// Global WebSocket mock
let mockWebSocketInstances: MockWebSocket[] = [];
const WebSocketMockFactory = vi.fn((url: string) => {
  const instance = new MockWebSocket(url);
  mockWebSocketInstances.push(instance);
  return instance;
});
(global as any).WebSocket = WebSocketMockFactory as any;
(global as any).WebSocket.CONNECTING = 0;
(global as any).WebSocket.OPEN = 1;
(global as any).WebSocket.CLOSING = 2;
(global as any).WebSocket.CLOSED = 3;

describe('LiveClientWS', () => {
  let client: LiveClientWS;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWebSocketInstances = []; // Reset instances before each test
    WebSocketMockFactory.mockClear();
    // Reset singleton if it exists
    if (typeof window !== 'undefined') {
        delete (window as any).__fbc_liveClient;
    }
    client = new LiveClientWS();
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
  });

  describe('Connection', () => {
    it('should connect to WebSocket URL', async () => {
      client.connect();
      
      expect(WebSocketMockFactory).toHaveBeenCalledWith(WEBSOCKET_CONFIG.URL);
      expect(client.isConnected()).toBe(true); // Connecting counts as connected
    });

    it('should handle connection open', () => {
      const onOpenSpy = vi.fn();
      client.on('open', onOpenSpy);
      
      client.connect();
      
      // Fast-forward timers to trigger mock open (advance by small amount to avoid infinite loops)
      vi.advanceTimersByTime(10);
      
      expect(onOpenSpy).toHaveBeenCalled();
      expect(client.getConnectionState()).toBe('open');
    });

    it('should reconnect on unexpected close', () => {
      const initialCallCount = WebSocketMockFactory.mock.calls.length;
      client.connect();
      vi.advanceTimersByTime(10); // Open connection
      
      // Simulate unexpected close
      const mockWsInstance = mockWebSocketInstances[0];
      if (!mockWsInstance) throw new Error('Mock WebSocket instance not found');
      mockWsInstance.onclose({ code: 1006, reason: 'Abnormal Closure' });
      
      // Should schedule reconnect
      expect(client.isConnected()).toBe(false);
      
      // Reconnect timer should be active (check implicitly via timer advancement)
      // We expect a new WebSocket connection after delay
      vi.advanceTimersByTime(WEBSOCKET_CONFIG.RECONNECT_DELAY + 100); // Advance past reconnect delay
      
      // Should have tried to connect again (total 2 calls: initial + reconnect)
      expect(WebSocketMockFactory).toHaveBeenCalledTimes(initialCallCount + 2);
    });

    it('should NOT reconnect on manual disconnect', () => {
      const initialCallCount = WebSocketMockFactory.mock.calls.length;
      client.connect();
      vi.advanceTimersByTime(10);
      
      client.disconnect();
      
      vi.advanceTimersByTime(WEBSOCKET_CONFIG.RECONNECT_DELAY + 100);
      
      // Should not have tried to connect again
      expect(WebSocketMockFactory).toHaveBeenCalledTimes(initialCallCount + 1); // Only initial connection
    });
  });

  describe('Messaging', () => {
    it('should send text message', () => {
      client.connect();
      vi.advanceTimersByTime(10);
      
      const mockWsInstance = mockWebSocketInstances[0];
      if (!mockWsInstance) throw new Error('Mock WebSocket instance not found');
      client.sendText('Hello');
      
      expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('REALTIME_INPUT'));
      expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('Hello'));
    });

    it('should route received events', () => {
      client.connect();
      vi.advanceTimersByTime(10);
      
      const mockWsInstance = mockWebSocketInstances[0];
      if (!mockWsInstance) throw new Error('Mock WebSocket instance not found');
      const onTextSpy = vi.fn();
      client.on('text', onTextSpy);
      
      // Simulate receiving a message
      mockWsInstance.onmessage({
        data: JSON.stringify({
          type: 'text',
          payload: { content: 'Hello from server' }
        })
      });
      
      expect(onTextSpy).toHaveBeenCalledWith('Hello from server');
    });

    it('should handle session_started event', () => {
      client.connect();
      vi.advanceTimersByTime(10);
      
      const mockWsInstance = mockWebSocketInstances[0];
      if (!mockWsInstance) throw new Error('Mock WebSocket instance not found');
      const onSessionStartedSpy = vi.fn();
      client.on('session_started', onSessionStartedSpy);
      
      const payload = { connectionId: 'conn-123' };
      mockWsInstance.onmessage({
        data: JSON.stringify({
          type: 'session_started',
          payload
        })
      });
      
      expect(onSessionStartedSpy).toHaveBeenCalledWith(payload);
      expect(client.getSessionActive()).toBe(true);
      expect(client.getConnectionId()).toBe('conn-123');
    });
  });

  describe('Heartbeat', () => {
    it('should send ping at interval', () => {
        client.connect();
        vi.advanceTimersByTime(10);
        
        const mockWsInstance = mockWebSocketInstances[0];
        if (!mockWsInstance) throw new Error('Mock WebSocket instance not found');
        mockWsInstance.send.mockClear();
        
        // Advance time by heartbeat interval
        vi.advanceTimersByTime(WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL + 100);
        
        expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('"type":"ping"'));
    });
    
    it('should emit heartbeat event on receiving heartbeat', () => {
        client.connect();
        vi.advanceTimersByTime(10);
        
        const mockWsInstance = mockWebSocketInstances[0];
        if (!mockWsInstance) throw new Error('Mock WebSocket instance not found');
        const onHeartbeatSpy = vi.fn();
        client.on('heartbeat', onHeartbeatSpy);
        
        const timestamp = Date.now();
        mockWsInstance.onmessage({
            data: JSON.stringify({
                type: 'heartbeat',
                payload: { timestamp }
            })
        });
        
        expect(onHeartbeatSpy).toHaveBeenCalledWith(timestamp);
        // Should auto-ack
        expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('"type":"heartbeat_ack"'));
    });
  });
});
