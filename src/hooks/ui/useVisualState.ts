import { useState, useRef, useEffect, useCallback } from 'react';
import { VisualState, VisualShape, TranscriptItem } from '../../../types';
import { ModelRoute } from '../../logic/smartRouting'; // Or where ModelRoute is defined, likely App.tsx or types
import { detectVisualIntent } from '../../logic/visualIntent';
import { shapeMorpher } from '../../../utils/visuals/shapeMorpher';

// Need to match ModelRoute definition from App.tsx/types
// Ideally ModelRoute should be in types.ts, but for now assuming it's passed in 

interface UseVisualStateProps {
    transcript: TranscriptItem[];
    activeRoute: ModelRoute;
    isWebcamActiveRef: React.MutableRefObject<boolean>;
}

export function useVisualState({ transcript, activeRoute, isWebcamActiveRef }: UseVisualStateProps) {
    const [visualState, setVisualState] = useState<VisualState>({
        isActive: false,
        audioLevel: 0,
        mode: 'idle',
        shape: 'wave'
    });

    const semanticShapeRef = useRef<VisualShape>('wave');
    const weatherDataRef = useRef<VisualState['weatherData']>(undefined);
    const chartDataRef = useRef<VisualState['chartData']>(undefined);
    const mapDataRef = useRef<VisualState['mapData']>(undefined);
    const textContentRef = useRef<string | undefined>(undefined);
    const morphProgressRef = useRef<number>(0);
    const researchDataRef = useRef<VisualState['researchData']>(undefined);
    const toolCallDataRef = useRef<VisualState['toolCallData']>(undefined);

    // React to transcript changes
    useEffect(() => {
        const last = transcript[transcript.length - 1];

        // Detect research activity
        const hasResearchIntent = last?.text?.toLowerCase().includes('research') ||
                                 last?.text?.toLowerCase().includes('search') ||
                                 last?.text?.toLowerCase().includes('find') ||
                                 last?.text?.toLowerCase().includes('look up');

        if (hasResearchIntent && !researchDataRef.current?.activeQueries) {
            researchDataRef.current = {
                activeQueries: 1,
                intensity: 0.5
            };
        }

        // Detect tool calls
        if (last?.tools && last.tools.length > 0) {
            const activeTool = last.tools.find(t => t.state === 'running');
            if (activeTool) {
                toolCallDataRef.current = {
                    name: activeTool.name,
                    progress: 0.5, // Default progress
                    state: activeTool.state || 'running'
                };
            }
        }

        if (last?.role === 'model' && last?.reasoning && (last.status === 'streaming' || !last.isFinal)) {
            if (semanticShapeRef.current !== 'constellation') {
                semanticShapeRef.current = 'constellation';
                setVisualState(prev => ({ ...prev, shape: 'constellation' }));
            }
        }
        else if (last?.role === 'model' && last?.isFinal) {
            const result = detectVisualIntent(last.text);
            if (result && result.shape) {
                semanticShapeRef.current = result.shape;
                
                // Update refs with extracted data
                if (result.textContent) textContentRef.current = result.textContent;
                if (result.weatherData) weatherDataRef.current = result.weatherData;
                if (result.chartData) chartDataRef.current = result.chartData;
                if (result.mapData) mapDataRef.current = result.mapData;

                const newShape = result.shape!;
                const currentShape = semanticShapeRef.current;

                // Start morphing if shape is different and morphing is enabled
                if (newShape !== currentShape && visualState.morphingTo !== newShape) {
                  shapeMorpher.morph(currentShape, newShape);
                }

                setVisualState(prev => {
                    const update: Partial<VisualState> = {
                        ...prev,
                        shape: newShape,
                        mode: 'speaking',
                        morphingTo: shapeMorpher.isActive() ? newShape : null,
                        morphProgress: shapeMorpher.getProgress()
                    };

                    if (textContentRef.current !== undefined) update.textContent = textContentRef.current;
                    if (weatherDataRef.current !== undefined) update.weatherData = weatherDataRef.current;
                    if (chartDataRef.current !== undefined) update.chartData = chartDataRef.current;
                    if (mapDataRef.current !== undefined) update.mapData = mapDataRef.current;
                    if (researchDataRef.current !== undefined) update.researchData = researchDataRef.current;
                    if (toolCallDataRef.current !== undefined) update.toolCallData = toolCallDataRef.current;

                    return update as VisualState;
                });
            }
        }
    }, [transcript]);

    // Update morphing progress
    useEffect(() => {
        const updateMorphing = () => {
            shapeMorpher.update();
            const progress = shapeMorpher.getProgress();

            if (progress !== morphProgressRef.current) {
                morphProgressRef.current = progress;
                setVisualState(prev => ({
                    ...prev,
                    morphProgress: progress,
                    // Clear morphingTo when complete
                    ...(progress >= 1 && { morphingTo: null })
                }));
            }

            if (shapeMorpher.isActive()) {
                requestAnimationFrame(updateMorphing);
            }
        };

        if (shapeMorpher.isActive()) {
            updateMorphing();
        }
    }, []);

    const handleVolumeChange = useCallback((inputVol: number, outputVol: number) => {
        setVisualState(prev => {
            const micLevel = Math.min(inputVol * 3.0, 1.0);
            const speakerLevel = Math.min(outputVol * 3.0, 1.0);

            let mode: 'idle' | 'listening' | 'thinking' | 'speaking' = prev.mode;
            let activeLevel = 0;

            if (!prev.isActive) {
                mode = 'idle';
                activeLevel = 0;
            } else if (speakerLevel > 0.01) {
                mode = 'speaking';
                activeLevel = speakerLevel;
            } else if (micLevel > 0.02) {
                mode = 'listening';
                activeLevel = micLevel;
            } else {
                mode = 'thinking';
                activeLevel = 0.1;
            }

            let shape: VisualShape = semanticShapeRef.current;

            if (isWebcamActiveRef.current) {
                shape = 'face';
            } else if (activeRoute.id.includes('nano')) {
                shape = 'shield';
            } else if (mode === 'speaking') {
                if (['orb', 'wave', 'brain', 'idle'].includes(prev.shape) || prev.shape === semanticShapeRef.current) {
                    shape = 'wave';
                }
            } else if (mode === 'listening') {
                if (['wave', 'brain'].includes(prev.shape)) {
                    shape = 'orb';
                }
            } else if (mode === 'thinking') {
                if (['orb', 'wave'].includes(prev.shape)) {
                    shape = 'brain';
                }
            }

            return {
                ...prev,
                audioLevel: activeLevel,
                mode: mode,
                shape: shape,
                ...(textContentRef.current !== undefined && { textContent: textContentRef.current }),
                ...(weatherDataRef.current !== undefined && { weatherData: weatherDataRef.current }),
                ...(chartDataRef.current !== undefined && { chartData: chartDataRef.current }),
                ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current })
            };
        });
    }, [activeRoute, isWebcamActiveRef]);

    return {
        visualState,
        setVisualState,
        semanticShapeRef,
        handleVolumeChange,
        mapDataRef, // Exposed for external updates (e.g. from handleTranscript)
        weatherDataRef,
        chartDataRef,
        textContentRef
    };
}
