
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { getSystemPrompt, DEFAULT_PROFILE } from "../constants";

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
        systemInstruction: getSystemPrompt(DEFAULT_PROFILE),
        temperature: 0.1, // Reduced temperature for faster, more deterministic output
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 512, // Reduced token limit for faster response generation
        thinkingConfig: { thinkingBudget: 0 } // Optimization: Zero thinking budget for unary calls
      },
    });

    return response.text || "Link failure.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Core interrupted.";
  }
};

export const parseActions = (text: string) => {
  const actionRegex = /\[ACTION: ([A-Z_]+)\((.*?)\)\]/g;
  const actions: { command: string; args: string }[] = [];
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({ command: match[1], args: match[2] });
  }
  return actions;
};
