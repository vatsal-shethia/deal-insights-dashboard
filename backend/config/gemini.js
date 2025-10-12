// config/gemini.js
// Gemini AI client configuration
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = ai;
