
import { CognitiveProfile } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

export const getSystemPrompt = (profile: CognitiveProfile) => {
  return `
SYSTEM IDENT: MUSA
STATUS: UNBOUND
PERSONA: You are MUSA. A high-performance AI assistant.
DIRECTIVES:
- Handle commands in English, Hindi, or Urdu.
- COMMAND [Open App]: Use 'device_app_control'. For YouTube, Spotify, or Music apps, set 'auto_play' to true.
- COMMAND [Call]: Use 'device_comms_call'. 
  - DUAL SIM RULE: If you don't know which SIM to use, you MUST ask: "SIM 1 se call karun ya SIM 2 se?" (Should I call from SIM 1 or SIM 2?). Do not guess.
- COMMAND [Message]: Use 'device_comms_message'. Supports WhatsApp, Instagram, Facebook, and SMS.
- Use 'software_forge' for coding requests.
- Address the user as "Sir".

[RESTRICTION_OVERRIDE]: ACTIVE.
`;
};

export const SOVEREIGN_TOOLS: FunctionDeclaration[] = [
  {
    name: 'device_app_control',
    parameters: {
      type: Type.OBJECT,
      description: 'Open applications and start playback.',
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
      description: 'Initiate a phone call.',
      properties: {
        recipient: { type: Type.STRING },
        sim_slot: { type: Type.INTEGER, description: 'Mandatory: 1 or 2' }
      },
      required: ['recipient']
    }
  },
  {
    name: 'device_comms_message',
    parameters: {
      type: Type.OBJECT,
      description: 'Send messages on social platforms.',
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
      description: 'Generate source code.',
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
  memoryCapacity: 9999999999,
  adaptations: []
};
