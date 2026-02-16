
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { getSystemPrompt, DEFAULT_PROFILE } from "../constants";

// Fix: Use process.env.API_KEY directly to initialize GoogleGenAI per guidelines.
// Moved AI initialization inside the function to ensure the most up-to-date API key is used for each request.
export const getGeminiResponse = async (
  prompt: string, 
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        // Use the system prompt function with default profile as a fallback
        systemInstruction: getSystemPrompt(DEFAULT_PROFILE),
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 1024,
      },
    });

    // Access the .text property directly (it is a getter, not a method)
    return response.text || "Communication relay failure. Please re-synchronize.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Neural core link interrupted. Please check API credentials.";
  }
};

// Simple utility to parse custom [ACTION] tags from AI response
export const parseActions = (text: string) => {
  const actionRegex = /\[ACTION: ([A-Z_]+)\((.*?)\)\]/g;
  const actions: { command: string; args: string }[] = [];
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({ command: match[1], args: match[2] });
  }
  return actions;
};
