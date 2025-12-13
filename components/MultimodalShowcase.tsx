import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { VisualState } from 'types';
import { VisualShape } from 'types';
import AntigravityCanvas from './AntigravityCanvas';
import { useTheme } from '../context/ThemeContext';
import type { LucideIcon } from 'lucide-react';
import {
  Camera,
  FileText,
  Globe2,
  MessageSquare,
  Mic,
  Monitor,
  Network,
} from 'lucide-react';

interface MultimodalFeature {
  id: string;
  title: string;
  description: string;
  shape: VisualShape;
  icon: LucideIcon;
  colorClassName: string;
  animation: {
    duration: number;
    style?: 'dissolve' | 'flow' | 'spiral';
    textContent?: string;
  };
  details: string[];
}

const MULTIMODAL_FEATURES: MultimodalFeature[] = [
  {
    id: 'text',
    title: 'Text Intelligence',
    description: 'Natural language processing with multi-agent orchestration',
    shape: 'brain',
    icon: MessageSquare,
    colorClassName: 'text-blue-500',
    animation: {
      duration: 2000,
      style: 'dissolve',
      textContent: 'Natural Language Processing & Reasoning'
    },
    details: [
      'Multi-agent conversation orchestration',
      'Real-time context awareness',
      'Semantic search & memory',
      'Personality-driven responses'
    ]
  },
  {
    id: 'voice',
    title: 'Voice Interaction',
    description: 'Sub-100ms latency voice chat with emotion recognition',
    shape: 'wave',
    icon: Mic,
    colorClassName: 'text-green-500',
    animation: {
      duration: 1500,
      style: 'flow',
    },
    details: [
      'Under 100ms audio processing latency',
      'Real-time speech-to-text',
      'Emotion & tone analysis',
      'Multi-language support'
    ]
  },
  {
    id: 'webcam',
    title: 'Visual Intelligence',
    description: 'Real-time webcam analysis with face detection & gesture recognition',
    shape: 'face',
    icon: Camera,
    colorClassName: 'text-purple-500',
    animation: {
      duration: 1800,
      style: 'dissolve',
    },
    details: [
      'Real-time face detection & tracking',
      'Gesture recognition',
      'Emotion analysis',
      'Object identification'
    ]
  },
  {
    id: 'screenshare',
    title: 'Screen Intelligence',
    description: 'Screen capture analysis for collaborative problem-solving',
    shape: 'chart',
    icon: Monitor,
    colorClassName: 'text-orange-500',
    animation: {
      duration: 2200,
      style: 'spiral',
    },
    details: [
      'Live screen capture analysis',
      'Code & document understanding',
      'Collaborative debugging',
      'Visual content recognition'
    ]
  },
  {
    id: 'agents',
    title: 'Multi-Agent System',
    description: 'Orchestrated AI agents working together for complex tasks',
    shape: 'constellation',
    icon: Network,
    colorClassName: 'text-cyan-500',
    animation: {
      duration: 2500,
      style: 'dissolve',
    },
    details: [
      'Specialized agent orchestration',
      'Task decomposition',
      'Context sharing between agents',
      'Dynamic agent selection'
    ]
  },
  {
    id: 'context',
    title: 'Context Intelligence',
    description: 'Persistent memory & cross-session context management',
    shape: 'globe',
    icon: Globe2,
    colorClassName: 'text-indigo-500',
    animation: {
      duration: 2000,
      style: 'flow',
    },
    details: [
      'Long-term conversation memory',
      'Cross-session context',
      'Personalized interactions',
      'Intelligent context retrieval'
    ]
  },
  {
    id: 'pdf',
    title: 'Document Intelligence',
    description: 'PDF generation, analysis & intelligent summarization',
    shape: 'dna',
    icon: FileText,
    colorClassName: 'text-red-500',
    animation: {
      duration: 1800,
      style: 'spiral',
    },
    details: [
      'Automated report generation',
      'Document analysis & extraction',
      'Intelligent summarization',
      'Multi-format export'
    ]
  }
];

interface MultimodalShowcaseProps {
  onShapeChange?: (shape: VisualShape) => void;
}

const MultimodalShowcase: React.FC<MultimodalShowcaseProps> = ({ onShapeChange }) => {
  const { isDarkMode } = useTheme();
  const [activeFeature, setActiveFeature] = useState<MultimodalFeature | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [narrativeMode, setNarrativeMode] = useState(false);
  const [narrativeText, setNarrativeText] = useState<string | undefined>(undefined);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoSequenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrativeSequenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Narrative sequence that tells FBC's multimodal story
  const runNarrativeSequence = () => {
    setNarrativeMode(true);
    setNarrativeText(undefined);
    let step = 0;

    const narrativeSteps = [
      { feature: MULTIMODAL_FEATURES[0], text: "F.B/c begins with intelligent text processing..." },
      { feature: MULTIMODAL_FEATURES[1], text: "Adding real-time voice capabilities..." },
      { feature: MULTIMODAL_FEATURES[2], text: "Integrating visual intelligence..." },
      { feature: MULTIMODAL_FEATURES[3], text: "Enabling collaborative screen sharing..." },
      { feature: MULTIMODAL_FEATURES[4], text: "Orchestrating multiple AI agents..." },
      { feature: MULTIMODAL_FEATURES[5], text: "Building persistent context awareness..." },
      { feature: MULTIMODAL_FEATURES[6], text: "Delivering intelligent document insights..." },
      { feature: null, text: "Creating the ultimate multimodal AI experience!" }
    ];

    const nextStep = () => {
      if (step >= narrativeSteps.length) {
        setNarrativeMode(false);
        setNarrativeText(undefined);
        return;
      }

      const narrativeStep = narrativeSteps[step];
      if (!narrativeStep) {
        setNarrativeMode(false);
        setNarrativeText(undefined);
        return;
      }

      if (narrativeStep.feature) {
        activateFeature(narrativeStep.feature);
        setNarrativeText(narrativeStep.text);
      }

      step++;
      narrativeSequenceRef.current = setTimeout(nextStep, step === narrativeSteps.length - 1 ? 3000 : 2500);
    };

    nextStep();
  };

  // Auto-demo sequence
  useEffect(() => {
    let currentIndex = 0;

    const runDemoSequence = () => {
      if (narrativeMode) return; // Pause demo during narrative

      const feature = MULTIMODAL_FEATURES[currentIndex];
      if (!feature) return;
      activateFeature(feature);

      currentIndex = (currentIndex + 1) % MULTIMODAL_FEATURES.length;

      demoSequenceRef.current = setTimeout(runDemoSequence, 4000); // 4 seconds per feature
    };

    // Start demo after initial delay
    demoSequenceRef.current = setTimeout(runDemoSequence, 2000);

    return () => {
      if (demoSequenceRef.current) clearTimeout(demoSequenceRef.current);
      if (narrativeSequenceRef.current) clearTimeout(narrativeSequenceRef.current);
    };
  }, [narrativeMode]);

  const activateFeature = (feature: MultimodalFeature) => {
    if (isAnimating) return;

    setActiveFeature(feature);
    setIsAnimating(true);
    setNarrativeText(undefined);

    // Trigger particle morphing
    if (onShapeChange) {
      onShapeChange(feature.shape);
    }

    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Schedule animation end
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, feature.animation.duration);
  };

  const handleFeatureClick = (feature: MultimodalFeature) => {
    // Clear auto-demo when user interacts
    if (demoSequenceRef.current) {
      clearTimeout(demoSequenceRef.current);
    }
    activateFeature(feature);
  };

  // Get current visual state for particles
  const visualState = useMemo<VisualState>(() => {
    const base: VisualState = {
      isActive: true,
      audioLevel: 0.12,
      mode: 'idle',
      shape: 'orb',
    };
    if (!activeFeature) return base;

    const mode: VisualState['mode'] = isAnimating || narrativeMode ? 'speaking' : 'idle';
    const textContent = narrativeText ?? activeFeature.animation.textContent;

    const baseState: VisualState = {
      ...base,
      shape: activeFeature.shape,
      mode,
      audioLevel: narrativeMode ? 0.45 : (isAnimating ? 0.28 : 0.12),
      trailsEnabled: true,
      bloomEnabled: true,
      bloomIntensity: narrativeMode ? 1.4 : 1.15,
      bloomRadius: narrativeMode ? 12 : 8,
      reasoningComplexity: narrativeMode ? 0.6 : 0.25,
      citationCount: narrativeMode ? 2 : 0,
      researchActive: narrativeMode,
      sourceCount: narrativeMode ? 2 : 0,
      ...(textContent ? { textContent } : {}),
    };

    // Add dynamic behaviors based on feature type
    switch (activeFeature.id) {
      case 'voice':
        return {
          ...baseState,
          audioLevel: narrativeMode ? 0.75 : 0.35,
          mode: 'speaking' as const,
        };
      case 'webcam':
        return {
          ...baseState,
          mode: (narrativeMode ? 'speaking' : 'thinking'),
        };
      case 'screenshare':
        return {
          ...baseState,
          chartData: { trend: 'up' as const, numericValue: Math.round(Math.random() * 100), label: 'Signal' },
          mode: (narrativeMode ? 'speaking' : 'thinking'),
        };
      case 'agents':
        return {
          ...baseState,
          reasoningComplexity: 0.8,
          sourceCount: narrativeMode ? 3 : 1,
        };
      case 'context':
        return narrativeMode
          ? {
              ...baseState,
              weatherData: { condition: 'sunny', temperature: '22°C', temperatureValue: 22 },
            }
          : baseState;
      default:
        return baseState;
    }
  }, [activeFeature, isAnimating, narrativeMode, narrativeText]);

  return (
    <section className={`w-full py-24 px-6 md:px-12 relative overflow-hidden backdrop-blur-xl border-t ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/40 border-white/20'}`}>
      {/* Background Particle Canvas */}
      <div className="absolute inset-0">
        <AntigravityCanvas
          visualState={visualState}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isDarkMode ? 'bg-orange-400' : 'bg-orange-600'}`} />
            <span className={`text-[10px] font-mono tracking-[0.3em] uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Multimodal AI Experience
            </span>
          </div>

          <h2 className={`text-4xl md:text-6xl font-bold tracking-tight mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            SEE THE <span className="font-matrix text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-500">MULTIMODAL</span> FUTURE
          </h2>

          <p className={`text-lg md:text-xl font-light leading-relaxed max-w-3xl mx-auto ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Experience F.B/c's revolutionary multimodal AI through interactive particle visualization.
            Watch as our system seamlessly integrates text, voice, vision, and context into a unified intelligence experience.
          </p>

          <div className={`inline-flex items-center gap-3 mt-6 px-6 py-3 backdrop-blur-md border rounded-full text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white/40 border-white/40 text-slate-600'}`}>
            <div className="flex gap-1">
              <span className={`w-2 h-2 rounded-full ${narrativeMode ? 'bg-orange-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
              <span className={`w-2 h-2 rounded-full ${activeFeature ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'} animation-delay-200`} />
              <span className={`w-2 h-2 rounded-full ${isAnimating ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'} animation-delay-400`} />
            </div>
            <span>{narrativeMode ? 'Narrative Mode Active' : 'Interactive Demo Running'}</span>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {MULTIMODAL_FEATURES.map((feature) => (
            <div
              key={feature.id}
              onClick={() => handleFeatureClick(feature)}
              className={`
                group relative p-6 backdrop-blur-md border rounded-2xl transition-all duration-500 cursor-pointer
                hover:scale-105 hover:shadow-2xl hover:-translate-y-2
                ${isDarkMode
                  ? 'bg-white/5 border-white/10 hover:border-white/20'
                  : 'bg-white/60 border-white/40 hover:border-white/60'
                }
                ${activeFeature?.id === feature.id
                  ? 'ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/20'
                  : ''
                }
              `}
            >
              {/* Icon */}
              <div className="flex items-center justify-center mb-4">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                  group-hover:scale-110 group-hover:rotate-12
                  ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}
                  ${activeFeature?.id === feature.id ? feature.colorClassName : 'text-slate-500'}
                `}>
                  <feature.icon className="w-6 h-6" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <h3 className={`text-lg font-bold mb-2 transition-colors ${isDarkMode ? 'text-white group-hover:text-orange-400' : 'text-slate-900 group-hover:text-orange-700'}`}>
                  {feature.title}
                </h3>
                <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {feature.description}
                </p>

                {/* Details */}
                <ul className="text-left space-y-1">
                  {feature.details.slice(0, 2).map((detail, i) => (
                    <li key={i} className="text-[11px] flex items-start gap-2 text-slate-500">
                      <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${activeFeature?.id === feature.id ? 'bg-orange-400' : 'bg-slate-400'}`} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Active Indicator */}
              {activeFeature?.id === feature.id && (
                <div className="absolute inset-0 border-2 border-orange-500/30 rounded-2xl animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Current Feature Display */}
        {activeFeature && (
          <div className="text-center animate-fade-in-up space-y-4">
            <div className={`inline-flex items-center gap-3 px-6 py-3 backdrop-blur-md border rounded-full ${isDarkMode ? 'bg-white/10 border-white/10' : 'bg-white/40 border-white/40'}`}>
              <activeFeature.icon className={`w-5 h-5 ${activeFeature.colorClassName}`} />
              <div className="text-left">
                <div className={`text-sm font-bold ${activeFeature.colorClassName}`}>
                  {activeFeature.title}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {narrativeMode ? 'Narrating F.B/c story...' : 'Particles morphing to visualize capability'}
                </div>
              </div>
            </div>

            {/* Narrative Progress Indicator */}
            {narrativeMode && (
              <div className="flex justify-center gap-2">
                {MULTIMODAL_FEATURES.map((feature, index) => (
                  <div
                    key={feature.id}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeFeature.id === feature.id
                        ? 'bg-orange-500 scale-125'
                        : index < MULTIMODAL_FEATURES.findIndex(f => f.id === activeFeature.id)
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16 space-y-6">
          {/* Narrative Button */}
          <button
            onClick={runNarrativeSequence}
            disabled={narrativeMode}
            className={`px-8 py-4 rounded-full font-medium text-sm tracking-wide transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              narrativeMode
                ? 'bg-orange-500 text-white animate-pulse'
                : isDarkMode
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                  : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            {narrativeMode ? '🎭 Telling F.B/c Story...' : '📖 Tell the F.B/c Story'}
          </button>

          {/* Main CTA */}
          <div className={`inline-block p-8 backdrop-blur-md border rounded-[32px] shadow-2xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/40 border-white/60'}`}>
            <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Ready to Experience the Future?
            </h3>
            <p className={`text-lg font-light leading-relaxed mb-6 max-w-2xl mx-auto ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              This is just a glimpse of F.B/c's multimodal AI capabilities. Start a conversation to see the full experience in action.
            </p>
            <button className={`px-8 py-4 rounded-full font-medium text-sm tracking-wide transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 ${isDarkMode ? 'bg-white text-slate-900 hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              START MULTIMODAL CHAT
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MultimodalShowcase;
