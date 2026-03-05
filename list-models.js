import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const list = await ai.models.list();
        const flashModels = [];
        for await (const model of list) {
            if (model.name.toLowerCase().includes('flash') &&
                model.supportedActions.includes('generateContent')) {
                flashModels.push({ name: model.name, version: model.version });
            }
        }
        console.log(JSON.stringify(flashModels, null, 2));
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
