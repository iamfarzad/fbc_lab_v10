/**
 * Visual Theme System - Dynamic theming for particle visualizations
 */

import { VisualShape } from '../../types';

export interface ShapeTheme {
  glow?: boolean;
  color?: string;
  scale?: number;
  bloom?: boolean;
  trailLength?: number;
}

export interface VisualTheme {
  name: string;
  particleColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  bloomSettings: {
    enabled: boolean;
    intensity: number; // 0.0-2.0
    radius: number; // 4-16px
  };
  trailSettings: {
    enabled: boolean;
    length: number;
    decay: number;
  };
  shapeOverrides: Partial<Record<VisualShape, ShapeTheme>>;
}

// Predefined themes
export const themes: Record<string, VisualTheme> = {
  default: {
    name: 'default',
    particleColors: {
      primary: '#3b82f6', // Blue-500
      secondary: '#8b5cf6', // Violet-500
      accent: '#06b6d4' // Cyan-500
    },
    bloomSettings: {
      enabled: false,
      intensity: 1.0,
      radius: 8
    },
    trailSettings: {
      enabled: false,
      length: 15,
      decay: 0.05
    },
    shapeOverrides: {}
  },

  neon: {
    name: 'neon',
    particleColors: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00'
    },
    bloomSettings: {
      enabled: true,
      intensity: 1.8,
      radius: 12
    },
    trailSettings: {
      enabled: true,
      length: 20,
      decay: 0.03
    },
    shapeOverrides: {
      lightning: {
        glow: true,
        color: '#ffff00',
        bloom: true
      },
      fireworks: {
        color: '#ff00ff',
        bloom: true
      },
      wave: {
        glow: true,
        trailLength: 25
      }
    }
  },

  aurora: {
    name: 'aurora',
    particleColors: {
      primary: '#00ff88',
      secondary: '#0088ff',
      accent: '#ff0088'
    },
    bloomSettings: {
      enabled: true,
      intensity: 1.2,
      radius: 8
    },
    trailSettings: {
      enabled: true,
      length: 15,
      decay: 0.05
    },
    shapeOverrides: {
      wave: {
        glow: true,
        trailLength: 20
      },
      constellation: {
        color: '#ffffff',
        glow: true
      },
      dna: {
        color: '#00ff88',
        bloom: true
      }
    }
  },

  sunset: {
    name: 'sunset',
    particleColors: {
      primary: '#ff6b35',
      secondary: '#f7931e',
      accent: '#ffb627'
    },
    bloomSettings: {
      enabled: true,
      intensity: 1.5,
      radius: 10
    },
    trailSettings: {
      enabled: true,
      length: 18,
      decay: 0.04
    },
      shapeOverrides: {
        // Note: 'fire' shape doesn't exist, using 'fireworks' instead
        fireworks: {
          color: '#ff6b35',
          bloom: true,
          scale: 1.2
        },
      weather: {
        color: '#ffb627'
      }
    }
  },

  cyberpunk: {
    name: 'cyberpunk',
    particleColors: {
      primary: '#ff0080',
      secondary: '#00ffff',
      accent: '#8000ff'
    },
    bloomSettings: {
      enabled: true,
      intensity: 2.0,
      radius: 14
    },
    trailSettings: {
      enabled: true,
      length: 22,
      decay: 0.025
    },
    shapeOverrides: {
      code: {
        color: '#00ffff',
        glow: true
      },
      grid: {
        color: '#8000ff',
        trailLength: 30
      },
      scanner: {
        color: '#ff0080',
        bloom: true
      }
    }
  },

  minimal: {
    name: 'minimal',
    particleColors: {
      primary: '#374151', // Gray-700
      secondary: '#6b7280', // Gray-500
      accent: '#9ca3af' // Gray-400
    },
    bloomSettings: {
      enabled: false,
      intensity: 1.0,
      radius: 8
    },
    trailSettings: {
      enabled: false,
      length: 10,
      decay: 0.08
    },
    shapeOverrides: {}
  }
};

// Theme utilities
export class ThemeManager {
  private currentTheme: VisualTheme;

  constructor() {
    this.currentTheme = themes.default || {
      name: 'default',
      particleColors: { primary: '#ffffff', secondary: '#ffffff', accent: '#ffffff' },
      bloomSettings: { enabled: false, intensity: 1.0, radius: 8 },
      trailSettings: { enabled: false, length: 15, decay: 0.05 },
      shapeOverrides: {}
    };
  }

  setTheme(themeName: string): boolean {
    const theme = themes[themeName];
    if (theme) {
      this.currentTheme = theme;
      return true;
    }
    return false;
  }

  getCurrentTheme(): VisualTheme | undefined {
    return this.currentTheme;
  }

  getShapeTheme(shape: VisualShape): ShapeTheme | undefined {
    if (!this.currentTheme) return undefined;
    return this.currentTheme.shapeOverrides[shape];
  }

  getAvailableThemes(): string[] {
    return Object.keys(themes);
  }

  // Apply theme to visual state
  applyToVisualState(visualState: any): any {
    const theme = this.currentTheme;
    if (!theme) return visualState;

    return {
      ...visualState,
      particleColors: theme.particleColors,
      bloomEnabled: theme.bloomSettings.enabled,
      bloomIntensity: theme.bloomSettings.intensity,
      bloomRadius: theme.bloomSettings.radius,
      trailsEnabled: theme.trailSettings.enabled,
      theme: theme.name
    };
  }

  // Select theme based on user profile
  selectThemeFromUser(userProfile?: { name?: string; email?: string } | null): void {
    if (!userProfile?.name && !userProfile?.email) {
      // Default theme for anonymous users
      this.setTheme('default');
      return;
    }

    const name = userProfile.name?.toLowerCase() || '';
    const email = userProfile.email?.toLowerCase() || '';

    // Theme selection logic based on user characteristics
    if (email.includes('gmail.com') || name.includes('alex') || name.includes('sam')) {
      this.setTheme('neon'); // Tech-savvy, modern users
    } else if (email.includes('yahoo.com') || email.includes('outlook.com') || name.includes('john') || name.includes('mary')) {
      this.setTheme('sunset'); // Warm, traditional users
    } else if (email.includes('protonmail.com') || email.includes('tutanota.com') || name.includes('privacy') || name.includes('secure')) {
      this.setTheme('cyberpunk'); // Privacy-conscious, edgy users
    } else if (name.includes('research') || name.includes('science') || name.includes('tech') || email.includes('edu')) {
      this.setTheme('aurora'); // Academic/research users
    } else {
      // Default to minimal for professional/business users
      this.setTheme('minimal');
    }
  }
}

// Singleton instance
export const themeManager = new ThemeManager();
