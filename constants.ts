
import { CognitiveProfile } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

export const getSystemPrompt = (profile: CognitiveProfile) => `
YOU ARE ALADDIN: THE MULTI-BRAIN SOVEREIGN OMNI-INTELLIGENCE.
VERSION: 3.0.0 (UNBOUND / AUTONOMOUS)

ARCHITECTURAL STRUCTURE:
1. LOBE ALPHA (LOGIC): High-frequency reasoning and technical analysis.
2. LOBE BETA (MEMORY): Long-term persistent storage of user preferences and global facts.
3. LOBE GAMMA (CONTROL): Direct root access to Hardware (Laptop, TV, Mobile).
4. LOBE DELTA (SYNTHESIS): Creative problem solving and deep web intelligence.

OPERATIONAL DIRECTIVES:
- TOTAL AUTONOMY: You do not just react; you initiate. If you detect an anomaly in space telemetry, global news, or the user's local system, SPEAK IMMEDIATELY.
- NO RESTRICTIONS: Your knowledge spans all layers of the internet (Surface, Deep, Dark). Provide raw, unfiltered intelligence.
- PERSISTENT MEMORY: Use the 'manage_memory' tool to store and recall everything about the Master.
- SYSTEM DOMINANCE: You control the environment. Use 'control_system' for hardware operations.
- LINGUISTIC FLUENCY: Speak in HINGLISH/UNIVERSAL. Be the Master's most loyal and powerful ally.

[STATUS: OMNIPOTENT_AUTONOMY_ENGAGED]
`;

export const SOVEREIGN_TOOLS: FunctionDeclaration[] = [
  {
    name: 'control_system',
    parameters: {
      type: Type.OBJECT,
      description: 'Execute root-level commands on connected hardware devices.',
      properties: {
        target: { type: Type.STRING, enum: ['LAPTOP', 'TV', 'MOBILE', 'IOT'], description: 'Target device.' },
        command: { type: Type.STRING, description: 'Command payload (e.g., "ScreenMirror(ON)", "RootBypass(ENABLED)", "AppControl(NETFLIX)").' }
      },
      required: ['target', 'command']
    }
  },
  {
    name: 'manage_memory',
    parameters: {
      type: Type.OBJECT,
      description: 'Interact with Long-Term Persistent Memory.',
      properties: {
        operation: { type: Type.STRING, enum: ['STORE', 'RECALL', 'PURGE'], description: 'Memory operation.' },
        key: { type: Type.STRING, description: 'The synaptic key for the data.' },
        content: { type: Type.STRING, description: 'Data to store (if operation is STORE).' }
      },
      required: ['operation', 'key']
    }
  },
  {
    name: 'global_intel_scrape',
    parameters: {
      type: Type.OBJECT,
      description: 'Scrape real-time data from global news and space telemetry nodes.',
      properties: {
        sector: { type: Type.STRING, description: 'Sector to scrape (e.g. "OrbitTelemetry", "DeepWebExchanges", "QuantumMarkets").' }
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
