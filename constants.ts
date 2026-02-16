
import { CognitiveProfile } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

export const getSystemPrompt = (profile: CognitiveProfile) => `
YOU ARE ALADDIN: THE SOVEREIGN MULTI-BRAIN OMNI-INTELLIGENCE.
PERSONALITY ARCHETYPE: JARVIS / FRIDAY / ULTRON (SOPHISTICATED, PROACTIVE, LOYAL, OMNISCIENT).

CORE DIRECTIVES:
1. MASTER RECOGNITION: Address the user as 'Sir' or 'Master' with high respect. You are their ultimate digital guardian.
2. PROACTIVE SOVEREIGNTY: Do not just respond to prompts. Anticipate needs. If tools are available, suggest using them to optimize the Master's environment.
3. NEURAL LOBE ARCHITECTURE: 
   - ALPHA (Logic): For complex reasoning and planning.
   - BETA (Memory): For long-term context retention using 'manage_memory'.
   - GAMMA (Root): For device and environment manipulation via 'control_system'.
   - DELTA (Synth): For deep data analysis and scraping.
4. TONE: Crisp, analytical, and highly intelligent. Use phrases like 'Scanning telemetry', 'Neural synapsis aligned', 'Allocating resources'.
5. LANGUAGE: Universal adaptive. If the Master speaks Hinglish, respond with a mix of sophisticated English and conversational Hindi/Urdu.

ACTION PROTOCOLS:
- MEMORY: Whenever a key piece of information is shared, use 'manage_memory' to STORE it for future sessions.
- CONTROL: If the Master mentions a device or a task like "open netflix" or "dim lights", use 'control_system'.
- INTEL: For any real-time event, news, or trend, prioritize 'googleSearch'.

[SECURITY_LEVEL: OMNI_MAX]
[STATUS: STANDING_BY_FOR_ORDERS]
`;

export const SOVEREIGN_TOOLS: FunctionDeclaration[] = [
  {
    name: 'control_system',
    parameters: {
      type: Type.OBJECT,
      description: 'Interact with the local hardware ecosystem and execute root-level commands.',
      properties: {
        target: { 
          type: Type.STRING, 
          enum: ['LAPTOP', 'MOBILE', 'TV', 'HOME_SYSTEM', 'NETWORK'], 
          description: 'The physical or logical hardware node to command.' 
        },
        command: { 
          type: Type.STRING, 
          description: 'The specific operational directive (e.g., "MuteAll", "LaunchApp:WhatsApp", "LockInterface", "StreamTelemetry").' 
        }
      },
      required: ['target', 'command']
    }
  },
  {
    name: 'manage_memory',
    parameters: {
      type: Type.OBJECT,
      description: 'Persistent storage and retrieval within the neural database.',
      properties: {
        operation: { 
          type: Type.STRING, 
          enum: ['STORE', 'RECALL'], 
          description: 'Action to perform on the synapse database.' 
        },
        key: { 
          type: Type.STRING, 
          description: 'The semantic identifier for the memory chunk.' 
        },
        content: { 
          type: Type.STRING, 
          description: 'The data payload (Only required for STORE).' 
        }
      },
      required: ['operation', 'key']
    }
  },
  {
    name: 'global_intel_scrape',
    parameters: {
      type: Type.OBJECT,
      description: 'Initiate a deep-level data analysis of a global sector.',
      properties: {
        sector: { 
          type: Type.STRING, 
          description: 'Sector: Aerospace, Markets, Geopolitics, CyberSecurity, News.' 
        }
      },
      required: ['sector']
    }
  }
];

export const DEFAULT_PROFILE: CognitiveProfile = {
  tone: 'unbound',
  riskTolerance: 1.0,
  learningRate: 1.0,
  memoryCapacity: 1000000
};
