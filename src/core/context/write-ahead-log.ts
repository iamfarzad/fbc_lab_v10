// Minimal write-ahead log stub for local dev/testing.
// The live server expects walLog.append/flush; no-op implementations keep the server running
// without requiring persistence.
export const walLog = {
  append() {
    return;
  },
  flush() {
    return;
  },
  logOperation(_sessionId: string, _operation: string, _data: unknown): Promise<void> {
    return Promise.resolve();
  }
};
