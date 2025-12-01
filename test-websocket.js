// Quick test script to verify WebSocket server can start
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('✅ WebSocket connection established');
  ws.on('message', (data) => {
    console.log('📨 Received:', data.toString());
    ws.send(JSON.stringify({ type: 'pong', data: 'Server is working!' }));
  });
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
});

server.listen(PORT, () => {
  console.log(`✅ WebSocket server listening on port ${PORT}`);
  console.log(`   Test with: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  wss.close();
  server.close();
});
