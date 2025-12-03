import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MultimodalContextManager, createInitialContext, makeTextEntry, makeVisualEntry } from '../multimodal-context';
import { ContextStorage } from '../context-storage';
import { vercelCache } from 'src/lib/vercel-cache';
import { walLog } from '../write-ahead-log';
import { auditLog } from 'src/core/security/audit-logger';
import { logger } from 'src/lib/logger-client';
import { GEMINI_CONFIG } from 'src/config/constants';

// Mock dependencies
vi.mock('../context-storage', () => {
  return {
    ContextStorage: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('src/lib/vercel-cache', () => ({
  vercelCache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../write-ahead-log', () => ({
  walLog: {
    logOperation: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('src/core/security/audit-logger', () => ({
  auditLog: {
    logPIIDetection: vi.fn().mockResolvedValue(undefined),
    logContextArchived: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('src/core/context/context-intelligence', () => ({
  extractEntities: vi.fn().mockReturnValue([]),
  extractTopics: vi.fn().mockReturnValue([]),
  analyzeSentiment: vi.fn().mockReturnValue('neutral'),
  calculateComplexity: vi.fn().mockReturnValue('simple'),
  calculateBusinessValue: vi.fn().mockReturnValue('low'),
  calculatePriority: vi.fn().mockReturnValue('low'),
  mergeEntities: vi.fn().mockReturnValue([]),
  mergeTopics: vi.fn().mockReturnValue([]),
}));

vi.mock('src/core/embeddings/gemini', () => ({
  embedTexts: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
}));

vi.mock('src/core/embeddings/query', () => ({
  queryTopK: vi.fn().mockResolvedValue([]),
  upsertEmbeddings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('src/lib/logger-client', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('MultimodalContextManager', () => {
  let contextManager: MultimodalContextManager;
  const sessionId = 'test-session-id';

  beforeEach(() => {
    vi.clearAllMocks();
    contextManager = new MultimodalContextManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize a session with default context', () => {
      const context = contextManager.initializeSession(sessionId);
      expect(context.sessionId).toBe(sessionId);
      expect(context.conversationHistory).toEqual([]);
      expect(context.visualContext).toEqual([]);
      expect(context.leadContext).toEqual({ name: '', email: '', company: '' });
    });

    it('should initialize a session with lead context', () => {
      const leadContext = { name: 'John Doe', email: 'john@example.com', company: 'Acme Inc' };
      const context = contextManager.initializeSession(sessionId, leadContext);
      expect(context.leadContext).toEqual(leadContext);
    });
  });

  describe('Adding Messages', () => {
    it('should add a text message', async () => {
      await contextManager.addTextMessage(sessionId, 'Hello world');
      const context = await contextManager.getContext(sessionId);
      expect(context?.conversationHistory).toHaveLength(1);
      expect(context?.conversationHistory[0].content).toBe('Hello world');
      expect(context?.conversationHistory[0].modality).toBe('text');
    });

    it('should add a voice message and transcript', async () => {
      await contextManager.addVoiceMessage(sessionId, 'Hello voice', 5);
      const context = await contextManager.getContext(sessionId);
      
      // Checks conversation history
      expect(context?.conversationHistory).toHaveLength(1);
      expect(context?.conversationHistory[0].content).toBe('Hello voice');
      expect(context?.conversationHistory[0].modality).toBe('audio');
      
      // Checks audio context
      expect(context?.audioContext).toHaveLength(1);
      expect(context?.audioContext[0].data.transcript).toBe('Hello voice');
    });

    it('should add visual analysis', async () => {
      await contextManager.addVisualAnalysis(sessionId, 'A picture of a cat', 'webcam');
      const context = await contextManager.getContext(sessionId);
      
      // Checks conversation history
      expect(context?.conversationHistory).toHaveLength(1);
      expect(context?.conversationHistory[0].content).toBe('A picture of a cat');
      expect(context?.conversationHistory[0].modality).toBe('image');
      
      // Checks visual context
      expect(context?.visualContext).toHaveLength(1);
      expect(context?.visualContext[0].analysis).toBe('A picture of a cat');
      expect(context?.visualContext[0].type).toBe('webcam');
    });
  });

  describe('Context Retrieval', () => {
    it('should retrieve conversation history', async () => {
      await contextManager.addTextMessage(sessionId, 'Message 1');
      await contextManager.addTextMessage(sessionId, 'Message 2');
      
      const history = await contextManager.getConversationHistory(sessionId);
      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Message 1');
      expect(history[1].content).toBe('Message 2');
    });

    it('should respect limit in retrieving conversation history', async () => {
      await contextManager.addTextMessage(sessionId, 'Message 1');
      await contextManager.addTextMessage(sessionId, 'Message 2');
      await contextManager.addTextMessage(sessionId, 'Message 3');
      
      const history = await contextManager.getConversationHistory(sessionId, 2);
      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Message 2');
      expect(history[1].content).toBe('Message 3');
    });
  });

  describe('Chat Preparation', () => {
    it('should prepare chat context with system prompt', async () => {
      const chatContext = await contextManager.prepareChatContext(sessionId);
      expect(chatContext.systemPrompt).toContain(GEMINI_CONFIG.SYSTEM_PROMPT);
      expect(chatContext.multimodalContext.hasRecentImages).toBe(false);
      expect(chatContext.multimodalContext.hasRecentAudio).toBe(false);
    });

    it('should include recent visual analysis in prompt', async () => {
      await contextManager.addVisualAnalysis(sessionId, 'Test analysis', 'webcam');
      const chatContext = await contextManager.prepareChatContext(sessionId);
      
      expect(chatContext.multimodalContext.hasRecentImages).toBe(true);
      expect(chatContext.systemPrompt).toContain('Recent visual analyses');
      expect(chatContext.systemPrompt).toContain('Test analysis');
    });
  });

  describe('Persistence', () => {
    it('should save context to Vercel Cache', async () => {
      process.env.KV_REST_API_URL = 'https://test-kv.vercel-storage.com';
      process.env.KV_REST_API_TOKEN = 'test-token';
      
      await contextManager.addTextMessage(sessionId, 'Persist me');
      expect(vercelCache.set).toHaveBeenCalledWith('multimodal', sessionId, expect.anything(), expect.anything());
      
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it('should archive context to storage', async () => {
        // Mock context to ensure min messages check passes
        const ctx = contextManager.initializeSession(sessionId);
        for(let i=0; i<5; i++) ctx.conversationHistory.push(makeTextEntry('msg'));
        
        await contextManager.archiveConversation(sessionId);
        
        // We need to verify that ContextStorage.store was called
        // Since we're accessing a private instance, we can verify indirectly or check the mock on the class
        // However, contextStorage is a property of contextManager.
        // Let's cheat slightly and cast to any to access private property for testing
        const storageMock = (contextManager as any).contextStorage;
        expect(storageMock.store).toHaveBeenCalled();
    });
  });
});

