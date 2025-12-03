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
global.WebSocket = MockWebSocket as any;
global.WebSocket.CONNECTING = 0;
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSING = 2;
global.WebSocket.CLOSED = 3;

describe('LiveClientWS', () => {
  let client: LiveClientWS;

  beforeEach(() => {
    vi.useFakeTimers();
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
      const connectSpy = vi.spyOn(global, 'WebSocket');
      client.connect();
      
      expect(connectSpy).toHaveBeenCalledWith(WEBSOCKET_CONFIG.URL);
      expect(client.isConnected()).toBe(true); // Connecting counts as connected
    });

    it('should handle connection open', () => {
      const onOpenSpy = vi.fn();
      client.on('open', onOpenSpy);
      
      client.connect();
      
      // Fast-forward timers to trigger mock open
      vi.runAllTimers();
      
      expect(onOpenSpy).toHaveBeenCalled();
      expect(client.getConnectionState()).toBe('open');
    });

    it('should reconnect on unexpected close', () => {
      client.connect();
      vi.runAllTimers(); // Open connection
      
      // Simulate unexpected close
      // Access private socket through casting or public methods if available
      // For testing, we can simulate the onClose behavior directly via private method exposure or event triggering
      // Since we can't access private methods easily, we'll simulate the effect by mocking the socket instance behavior
      
      // More reliable approach: Use the fact that we mocked WebSocket globally
      const mockWsInstance = (WebSocket as any).mock.results[0].value;
      mockWsInstance.onclose({ code: 1006, reason: 'Abnormal Closure' });
      
      // Should schedule reconnect
      expect(client.isConnected()).toBe(false);
      
      // Reconnect timer should be active (check implicitly via timer advancement)
      // We expect a new WebSocket connection after delay
      const connectSpy = vi.spyOn(global, 'WebSocket');
      vi.runAllTimers(); // Advance past reconnect delay
      
      // Should have tried to connect again (total 2 calls: initial + reconnect)
      expect(connectSpy).toHaveBeenCalledTimes(2);
    });

    it('should NOT reconnect on manual disconnect', () => {
      client.connect();
      vi.runAllTimers();
      
      client.disconnect();
      const connectSpy = vi.spyOn(global, 'WebSocket');
      
      vi.runAllTimers();
      
      // Should not have tried to connect again
      expect(connectSpy).toHaveBeenCalledTimes(1); // Only initial connection
    });
  });

  describe('Messaging', () => {
    it('should send text message', () => {
      client.connect();
      vi.runAllTimers();
      
      const mockWsInstance = (WebSocket as any).mock.results[0].value;
      client.sendText('Hello');
      
      expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('REALTIME_INPUT'));
      expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('Hello'));
    });

    it('should route received events', () => {
      client.connect();
      vi.runAllTimers();
      
      const mockWsInstance = (WebSocket as any).mock.results[0].value;
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
      vi.runAllTimers();
      
      const mockWsInstance = (WebSocket as any).mock.results[0].value;
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
        vi.runAllTimers();
        
        const mockWsInstance = (WebSocket as any).mock.results[0].value;
        mockWsInstance.send.mockClear();
        
        // Advance time by heartbeat interval
        vi.advanceTimersByTime(WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL + 100);
        
        expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('"type":"ping"'));
    });
    
    it('should emit heartbeat event on receiving heartbeat', () => {
        client.connect();
        vi.runAllTimers();
        
        const mockWsInstance = (WebSocket as any).mock.results[0].value;
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
