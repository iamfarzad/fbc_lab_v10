import { useState, useRef, useEffect, useCallback } from 'react';
import { VisualState, VisualShape, TranscriptItem } from '../../../types';
import { ModelRoute } from '../../logic/smartRouting'; // Or where ModelRoute is defined, likely App.tsx or types
import { detectVisualIntent } from '../../logic/visualIntent';

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

    // React to transcript changes
    useEffect(() => {
        const last = transcript[transcript.length - 1];

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

                setVisualState(prev => ({
                    ...prev,
                    shape: result.shape!,
                    mode: 'speaking',
                    ...(textContentRef.current !== undefined && { textContent: textContentRef.current }),
                    ...(weatherDataRef.current !== undefined && { weatherData: weatherDataRef.current }),
                    ...(chartDataRef.current !== undefined && { chartData: chartDataRef.current }),
                    ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current })
                }));
            }
        }
    }, [transcript]);

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
