/**
 * Test script to verify SSE streaming works
 * 
 * Usage: 
 *   pnpm tsx scripts/test-streaming.ts
 *   or
 *   API_URL=http://localhost:3002 pnpm tsx scripts/test-streaming.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3002';

async function testStreaming() {
  console.log('🧪 Testing SSE Streaming...\n');
  console.log(`📡 API URL: ${API_URL}\n`);

  const testMessage = {
    messages: [
      {
        role: 'user',
        content: 'Tell me about AI automation for small businesses. Be detailed.'
      }
    ],
    sessionId: `test-${Date.now()}`,
    stream: true
  };

  try {
    console.log('📤 Sending request with stream: true...\n');

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      console.error('❌ Response is not SSE stream!');
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    console.log('✅ SSE stream received!\n');
    console.log('📊 Streaming events:\n');
    console.log('─'.repeat(60));

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let metadataCount = 0;
    let accumulatedText = '';
    let startTime = Date.now();

    if (!reader) {
      throw new Error('No reader available');
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataText = line.slice(6).trim();
          if (dataText && dataText !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataText);
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

              if (parsed.type === 'content') {
                chunkCount++;
                accumulatedText = parsed.content || '';
                const preview = accumulatedText.substring(0, 50).replace(/\n/g, ' ');
                console.log(`[${elapsed}s] 📝 Chunk #${chunkCount} (${accumulatedText.length} chars): "${preview}..."`);
              } else if (parsed.type === 'meta') {
                metadataCount++;
                console.log(`[${elapsed}s] 🔧 Metadata #${metadataCount}:`, {
                  type: parsed.type,
                  hasToolCall: !!parsed.toolCall,
                  hasReasoning: !!parsed.reasoning,
                  ...(parsed.toolCall && { toolCall: parsed.toolCall })
                });
              } else if (parsed.type === 'done') {
                console.log(`[${elapsed}s] ✅ Done:`, {
                  agent: parsed.agent,
                  model: parsed.model,
                  metadataKeys: parsed.metadata ? Object.keys(parsed.metadata) : []
                });
              } else if (parsed.type === 'error') {
                console.error(`[${elapsed}s] ❌ Error:`, parsed.error);
              }
            } catch (parseError) {
              console.warn('⚠️  Failed to parse SSE message:', parseError);
            }
          } else if (dataText === '[DONE]') {
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log('\n' + '─'.repeat(60));
            console.log('📊 Summary:');
            console.log(`   Total time: ${totalTime}s`);
            console.log(`   Content chunks: ${chunkCount}`);
            console.log(`   Metadata events: ${metadataCount}`);
            console.log(`   Final text length: ${accumulatedText.length} chars`);
            console.log(`   Average chunk size: ${chunkCount > 0 ? (accumulatedText.length / chunkCount).toFixed(1) : 0} chars`);
            console.log('─'.repeat(60));
            console.log('\n✅ Streaming test complete!');
            return;
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run test
testStreaming().catch(console.error);

