import { GEMINI_MODELS } from './src/config/constants';

export const AppConfig = {
    api: {
        models: {
            live: GEMINI_MODELS.DEFAULT_VOICE,
            default: GEMINI_MODELS.DEFAULT_CHAT, // For reasoning/complex tasks
            flash: GEMINI_MODELS.FLASH_2025_09, // For speed/maps
            flashLite: GEMINI_MODELS.FLASH_LITE_2025_09, // For quick actions
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
