export const AppConfig = {
    api: {
        models: {
            live: 'gemini-2.5-flash-native-audio-preview-09-2025',
            default: 'gemini-3-pro-preview', // For reasoning/complex tasks
            flash: 'gemini-2.5-flash', // For speed/maps
            flashLite: 'gemini-2.5-flash-lite', // For quick actions
        },
        audio: {
            inputSampleRate: 16000,
            outputSampleRate: 24000,
            bufferSize: 4096,
        }
    },
    ui: {
        sidebar: {
            minWidth: 300,
            maxWidth: 800,
            defaultWidth: 450,
        }
    }
};
