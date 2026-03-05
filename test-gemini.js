import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function testOCR() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log('Testing with gemini-2.5-flash...');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: 'Hello, respond with ONLY the word "OK" if you can hear me.' }] }]
        });
        console.log('Response:', response.text);
    } catch (error) {
        console.error('Error in test:', error);
    }
}

testOCR();
