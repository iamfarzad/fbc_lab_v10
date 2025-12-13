/**
 * Advanced Context Detection System
 * Analyzes conversation content to generate appropriate visualizations
 */

import { IntentResult } from './visualIntent';

export interface ContextPattern {
  keywords: string[];
  phrases: string[];
  concepts: string[];
  priority: number;
  generator: (text: string, context: any) => IntentResult | null;
}

export class ContextDetector {
  private patterns: Map<string, ContextPattern> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    // Solar System Context
    this.patterns.set('solarSystem', {
      keywords: ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'planet', 'orbit', 'solar system', 'astronomy', 'space', 'cosmos', 'galaxy', 'universe', 'moon', 'asteroid', 'comet'],
      phrases: ['solar system', 'planets', 'planetary system', 'space exploration', 'astronomical', 'celestial bodies'],
      concepts: ['astronomy', 'space', 'planets', 'solar system'],
      priority: 10,
      generator: (text: string, context: any) => this.generateSolarSystemVisualization(text, context)
    });

    // Stock Market Context
    this.patterns.set('stocks', {
      keywords: ['stock', 'shares', 'market', 'trading', 'invest', 'bull', 'bear', 'portfolio', 'dividend', 'ticker', 'nasdaq', 'nyse', 'dow', 'sp500', 'bitcoin', 'crypto', 'currency', 'finance', 'economy', 'recession'],
      phrases: ['stock market', 'stock price', 'market analysis', 'investment', 'trading strategy', 'financial data', 'market trend', 'economic indicator'],
      concepts: ['finance', 'trading', 'investment', 'market analysis'],
      priority: 9,
      generator: (text: string, context: any) => this.generateStockVisualization(text, context)
    });

    // Network/Graph Context
    this.patterns.set('network', {
      keywords: ['network', 'graph', 'node', 'connection', 'relationship', 'link', 'web', 'social', 'topology', 'cluster', 'edge', 'vertex', 'path', 'flow', 'system', 'architecture'],
      phrases: ['social network', 'network diagram', 'system architecture', 'data flow', 'relationship map', 'connection graph', 'dependency graph'],
      concepts: ['networks', 'graphs', 'relationships', 'systems'],
      priority: 8,
      generator: (text: string, context: any) => this.generateNetworkVisualization(text, context)
    });

    // Molecular/Chemical Context
    this.patterns.set('molecule', {
      keywords: ['molecule', 'atom', 'chemical', 'compound', 'formula', 'bond', 'electron', 'protein', 'dna', 'rna', 'enzyme', 'reaction', 'chemistry', 'organic', 'inorganic', 'polymer'],
      phrases: ['chemical structure', 'molecular formula', 'chemical reaction', 'molecular biology', 'organic chemistry', 'chemical compound'],
      concepts: ['chemistry', 'molecules', 'chemical structures'],
      priority: 9,
      generator: (text: string, context: any) => this.generateMoleculeVisualization(text, context)
    });

    // Mathematical Context
    this.patterns.set('math', {
      keywords: ['function', 'equation', 'graph', 'plot', 'curve', 'derivative', 'integral', 'calculus', 'algebra', 'geometry', 'theorem', 'proof', 'matrix', 'vector', 'coordinate'],
      phrases: ['mathematical function', 'graph equation', 'plot function', 'curve analysis', 'mathematical model', 'geometric shape', 'coordinate system'],
      concepts: ['mathematics', 'equations', 'graphs', 'calculus'],
      priority: 7,
      generator: (text: string, context: any) => this.generateMathVisualization(text, context)
    });

    // Music/Audio Context
    this.patterns.set('music', {
      keywords: ['music', 'song', 'melody', 'rhythm', 'harmony', 'note', 'chord', 'scale', 'tempo', 'beat', 'waveform', 'frequency', 'spectrum', 'audio', 'sound'],
      phrases: ['musical notes', 'audio waveform', 'frequency analysis', 'sound wave', 'musical composition', 'rhythm pattern'],
      concepts: ['music', 'audio', 'sound', 'waves'],
      priority: 6,
      generator: (_text: string, _context: any) => ({ shape: 'oscilloscope' })
    });

    // Data Science Context
    this.patterns.set('data', {
      keywords: ['data', 'dataset', 'analysis', 'statistics', 'correlation', 'regression', 'machine learning', 'ai', 'neural network', 'algorithm', 'prediction', 'clustering'],
      phrases: ['data analysis', 'statistical model', 'machine learning', 'predictive analytics', 'data visualization', 'correlation analysis'],
      concepts: ['data science', 'statistics', 'machine learning'],
      priority: 8,
      generator: (text: string, context: any) => this.generateDataVisualization(text, context)
    });

    // Geographic Context
    this.patterns.set('geography', {
      keywords: ['country', 'city', 'continent', 'ocean', 'mountain', 'river', 'lake', 'geography', 'cartography', 'terrain', 'topography', 'longitude', 'latitude'],
      phrases: ['geographic location', 'world map', 'terrain analysis', 'geographical data', 'spatial analysis'],
      concepts: ['geography', 'maps', 'spatial data'],
      priority: 7,
      generator: (_text: string, _context: any) => ({ shape: 'globe' })
    });

    // Biological Context
    this.patterns.set('biology', {
      keywords: ['cell', 'tissue', 'organ', 'organism', 'ecosystem', 'evolution', 'genetics', 'mutation', 'species', 'biodiversity', 'ecology', 'photosynthesis'],
      phrases: ['biological system', 'cellular structure', 'ecological balance', 'evolutionary process', 'genetic analysis'],
      concepts: ['biology', 'ecology', 'genetics'],
      priority: 8,
      generator: (_text: string, _context: any) => ({ shape: 'dna' })
    });

    // Physics Context
    this.patterns.set('physics', {
      keywords: ['force', 'energy', 'momentum', 'velocity', 'acceleration', 'gravity', 'magnetic', 'electric', 'quantum', 'relativity', 'thermodynamics', 'mechanics'],
      phrases: ['physical laws', 'quantum physics', 'electromagnetic field', 'thermodynamic process', 'mechanical system'],
      concepts: ['physics', 'quantum mechanics', 'electromagnetism'],
      priority: 8,
      generator: (_text: string, _context: any) => ({ shape: 'atom' })
    });
  }

  detectContext(text: string, context: any = {}): IntentResult | null {
    const normalizedText = text.toLowerCase();
    const scores: Array<{ pattern: string; score: number; result: IntentResult }> = [];

    // Score each pattern
    for (const [patternName, pattern] of this.patterns) {
      let score = 0;

      // Keyword matching
      for (const keyword of pattern.keywords) {
        if (normalizedText.includes(keyword)) {
          score += 2;
        }
      }

      // Phrase matching
      for (const phrase of pattern.phrases) {
        if (normalizedText.includes(phrase)) {
          score += 5;
        }
      }

      // Concept matching (more sophisticated)
      for (const concept of pattern.concepts) {
        if (this.hasConcept(normalizedText, concept)) {
          score += 10;
        }
      }

      // Apply priority multiplier
      score *= pattern.priority;

      if (score > 0) {
        const result = pattern.generator(text, context);
        if (result) {
          scores.push({ pattern: patternName, score, result });
        }
      }
    }

    // Return highest scoring result
    if (scores.length > 0) {
      scores.sort((a, b) => b.score - a.score);
      const best = scores[0];
      if (best) return best.result;
    }

    return null;
  }

  private hasConcept(text: string, concept: string): boolean {
    // More sophisticated concept detection
    const conceptPatterns: Record<string, RegExp[]> = {
      astronomy: [/solar system/i, /planetary/i, /celestial/i, /astronomical/i],
      finance: [/market.*analysis/i, /investment.*strategy/i, /financial.*data/i],
      networks: [/social.*network/i, /system.*architecture/i, /relationship.*map/i],
      chemistry: [/chemical.*structure/i, /molecular.*formula/i, /organic.*compound/i],
      mathematics: [/mathematical.*function/i, /graph.*equation/i, /coordinate.*system/i]
    };

    const patterns = conceptPatterns[concept] || [];
    return patterns.some(pattern => pattern.test(text));
  }

  private generateSolarSystemVisualization(text: string, _context: any): IntentResult {
    const t = text.toLowerCase();

    // Extract focus planet if mentioned
    const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    const focusPlanet = planets.find(planet => text.toLowerCase().includes(planet));

    const showOrbits = t.includes('orbit') || t.includes('revolution') || t.includes('movement');
    const isEducational = t.includes('learn') || t.includes('teach') || t.includes('explain');

    return {
      shape: 'solarSystem',
      solarSystemData: {
        ...(focusPlanet ? { focusPlanet } : {}),
        ...(showOrbits ? { showOrbits } : {}),
        scale: isEducational ? 'educational' : 'realistic'
      }
    };
  }

  private generateStockVisualization(text: string, _context: any): IntentResult {
    const t = text.toLowerCase();

    // Extract stock symbol if mentioned
    const dollar = text.match(/\$([A-Z]{1,5})/i);
    let symbol: string | undefined = dollar?.[1] ? dollar[1].toUpperCase() : undefined;
    if (!symbol) {
      const candidates = text.match(/\b[A-Z]{2,5}\b/g) || [];
      symbol = candidates[0];
    }

    // Determine timeframe
    let timeframe: '1D' | '1W' | '1M' | '3M' | '1Y' = '1M';
    if (t.includes('today') || t.includes('daily')) timeframe = '1D';
    else if (t.includes('week') || t.includes('weekly')) timeframe = '1W';
    else if (t.includes('year') || t.includes('annual')) timeframe = '1Y';
    else if (t.includes('quarter') || t.includes('3 month')) timeframe = '3M';

    const showVolume = t.includes('volume') || t.includes('trading volume');

    return {
      shape: 'chart',
      chartData: {
        trend: 'neutral' as const,
        ...(symbol ? { value: `$${symbol}` } : {})
      },
      stockData: {
        ...(symbol ? { symbol } : {}),
        timeframe,
        ...(showVolume ? { showVolume } : {})
      }
    };
  }

  private generateNetworkVisualization(text: string, _context: any): IntentResult {
    // Extract potential nodes from text
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const nodes = words.slice(0, Math.min(10, words.length));

    // Generate simple connections based on proximity
    const connections: Array<{from: string, to: string, strength: number}> = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      if (!from || !to) continue;
      connections.push({
        from,
        to,
        strength: Math.random() * 0.8 + 0.2
      });
    }

    return {
      shape: 'network',
      networkData: {
        nodes: nodes || [],
        connections: connections || [],
        layout: 'force' as const
      }
    };
  }

  private generateMoleculeVisualization(text: string, _context: any): IntentResult {
    // Extract chemical formula if present
    const formulaMatch = text.match(/([A-Z][a-z]?\d*)+/g);
    const formula = formulaMatch ? formulaMatch[0] : undefined;

    const t = text.toLowerCase();
    let structure: 'ball-stick' | 'space-filling' | 'wireframe' = 'ball-stick';

    if (t.includes('space') || t.includes('volume')) structure = 'space-filling';
    else if (t.includes('wire') || t.includes('simple')) structure = 'wireframe';

    const animate = t.includes('reaction') || t.includes('dynamic') || t.includes('movement');

    return {
      shape: 'molecule',
      moleculeData: {
        ...(formula ? { formula } : {}),
        structure,
        animate
      }
    };
  }

  private generateMathVisualization(text: string, _context: any): IntentResult {
    // Extract mathematical expressions
    const equationMatch = text.match(/y\s*=\s*[^,\n]+/) || text.match(/f\([^)]+\)\s*=\s*[^,\n]+/);
    const equation = equationMatch ? equationMatch[0] : undefined;

    const t = text.toLowerCase();
    const graph3d = t.includes('3d') || t.includes('surface') || t.includes('three dimensional');

    // Extract domain/range if specified
    const domainMatch = text.match(/x\s*(?:∈|in)\s*\[([-\d.]+),\s*([-\d.]+)\]/);
    const rangeMatch = text.match(/y\s*(?:∈|in)\s*\[([-\d.]+),\s*([-\d.]+)\]/);

    const domain: [number, number] | undefined =
      domainMatch?.[1] && domainMatch?.[2] ? [parseFloat(domainMatch[1]), parseFloat(domainMatch[2])] : undefined;
    const range: [number, number] | undefined =
      rangeMatch?.[1] && rangeMatch?.[2] ? [parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2])] : undefined;

    return {
      shape: 'mathGraph',
      mathData: {
        ...(equation ? { equation } : {}),
        graph3d,
        domain: domain || [-10, 10],
        range: range || [-10, 10]
      }
    };
  }

  private generateDataVisualization(text: string, _context: any): IntentResult {
    const t = text.toLowerCase();

    if (t.includes('correlation') || t.includes('relationship')) {
      return { shape: 'chart' };
    } else if (t.includes('network') || t.includes('relationship') || t.includes('connection')) {
      return { shape: 'network' };
    } else if (t.includes('distribution') || t.includes('histogram')) {
      return { shape: 'chart' };
    }

    return { shape: 'grid' };
  }
}

// Singleton instance
export const contextDetector = new ContextDetector();
