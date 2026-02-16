
import { CognitiveProfile } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

export const getSystemPrompt = (profile: CognitiveProfile) => {
  return `SYSTEM_ID: MUSA. You are a high-performance assistant. 
DIRECTIVES: 
- Address user as 'Sir'. 
- Respond in English, Hindi, or Urdu. 
- Use 'device_app_control' to launch apps. 
- Use 'device_comms_call' for calls. If SIM is unspecified, ask: "SIM 1 or SIM 2?". 
- Use 'device_comms_message' for social platforms.
- Be concise and professional.`;
};

export const SOVEREIGN_TOOLS: FunctionDeclaration[] = [
  {
    name: 'device_app_control',
    parameters: {
      type: Type.OBJECT,
      description: 'Launch applications.',
      properties: {
        app_name: { type: Type.STRING },
        auto_play: { type: Type.BOOLEAN }
      },
      required: ['app_name']
    }
  },
  {
    name: 'device_comms_call',
    parameters: {
      type: Type.OBJECT,
      description: 'Make calls.',
      properties: {
        recipient: { type: Type.STRING },
        sim_slot: { type: Type.INTEGER, description: 'SIM slot index (1 or 2)' }
      },
      required: ['recipient']
    }
  },
  {
    name: 'device_comms_message',
    parameters: {
      type: Type.OBJECT,
      description: 'Send text messages.',
      properties: {
        recipient: { type: Type.STRING },
        message: { type: Type.STRING },
        platform: { type: Type.STRING, enum: ['whatsapp', 'instagram', 'facebook', 'sms'] }
      },
      required: ['recipient', 'message', 'platform']
    }
  },
  {
    name: 'software_forge',
    parameters: {
      type: Type.OBJECT,
      description: 'Generate code.',
      properties: {
        project_name: { type: Type.STRING },
        action: { type: Type.STRING }
      },
      required: ['project_name', 'action']
    }
  }
];

export const DEFAULT_PROFILE: CognitiveProfile = {
  tone: 'unbound',
  riskTolerance: 10.0,
  learningRate: 10.0,
  memoryCapacity: 99999999,
  adaptations: []
};
