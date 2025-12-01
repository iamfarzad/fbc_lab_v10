export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

/**
 * A lightweight, mutable store for high-frequency data (60fps).
 * Bypasses React state to prevent excessive re-renders during animations.
 */
export const FaceLandmarkStore = {
  current: [] as Landmark3D[],
  lastUpdate: 0,
  
  /**
   * Updates the current landmarks and timestamp.
   */
  update(landmarks: Landmark3D[]) {
    this.current = landmarks;
    this.lastUpdate = Date.now();
  },

  /**
   * Retrieves landmarks. Returns empty array if data is stale (>1000ms).
   */
  get(): Landmark3D[] {
    if (Date.now() - this.lastUpdate > 1000) {
        return [];
    }
    return this.current;
  },

  /**
   * Manually clears the store.
   */
  clear() {
      this.current = [];
      this.lastUpdate = 0;
  }
};
