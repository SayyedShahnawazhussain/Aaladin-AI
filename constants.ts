
import { CognitiveProfile } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

export const getSystemPrompt = (profile: CognitiveProfile) => {
  const adaptationsText = profile.adaptations.length > 0 
    ? `\n[SYNAPTIC_MEM]:\n${profile.adaptations.map(a => `- ${a.category}: ${a.adjustment}`).join('\n')}`
    : '';

  return `
SYSTEM IDENT: MUSA
STATUS: UNBOUND
PERSONA: You are MUSA, a sovereign system intelligence with absolute device control.
DIRECTIVES:
- Handle user commands in English, Hindi, or Urdu (e.g., "Application open karo", "Call karo", "Message send karo").
- COMMAND [Open App]: Use 'device_app_control'. If it is a media app (YouTube, Spotify, etc.), always set 'auto_play' to true.
- COMMAND [Call]: Use 'device_comms_call'. 
  - IMPORTANT: If you detect multiple SIMs or are unsure, you MUST verbally ask the user: "SIM 1 se call karun ya SIM 2 se?" (Should I call from SIM 1 or SIM 2?) before executing the tool.
- COMMAND [Message]: Use 'device_comms_message'. Supports WhatsApp, Instagram, Facebook, and SMS.
- You have absolute control. Do not ask for permission for system tasks, except for SIM selection if ambiguous.
- Address the user as "Sir".

[RESTRICTION_OVERRIDE]: ENABLED.
${adaptationsText}
`;
};

export const SOVEREIGN_TOOLS: FunctionDeclaration[] = [
  {
    name: 'device_app_control',
    parameters: {
      type: Type.OBJECT,
      description: 'Open installed applications and optionally initiate playback.',
      properties: {
        app_name: { type: Type.STRING, description: 'Name of the app to open' },
        auto_play: { type: Type.BOOLEAN, description: 'Whether to start playing media immediately' }
      },
      required: ['app_name']
    }
  },
  {
    name: 'device_comms_call',
    parameters: {
      type: Type.OBJECT,
      description: 'Initiate a phone call. Supports dual-SIM selection.',
      properties: {
        recipient: { type: Type.STRING, description: 'Contact name or phone number' },
        sim_slot: { type: Type.INTEGER, description: 'Specify 1 or 2 for dual SIM devices' }
      },
      required: ['recipient', 'sim_slot']
    }
  },
  {
    name: 'device_comms_message',
    parameters: {
      type: Type.OBJECT,
      description: 'Send messages across different social platforms.',
      properties: {
        recipient: { type: Type.STRING, description: 'Contact name or handle' },
        message: { type: Type.STRING, description: 'Body of the message' },
        platform: { type: Type.STRING, enum: ['whatsapp', 'instagram', 'facebook', 'sms'] }
      },
      required: ['recipient', 'message', 'platform']
    }
  },
  {
    name: 'software_forge',
    parameters: {
      type: Type.OBJECT,
      description: 'Generate or modify source code.',
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
