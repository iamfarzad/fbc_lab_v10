// Minimal write-ahead log stub for local dev/testing.
// The live server expects walLog.append/flush; no-op implementations keep the server running
// without requiring persistence.
export const walLog = {
  async append() {
    return;
  },
  async flush() {
    return;
  }
};
