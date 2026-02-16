
export enum AppStatus {
  IDLE = 'DORMANT',
  LISTENING = 'MONITORING',
  THINKING = 'SYNTHESIZING',
  BUILDING = 'ARCHITECTING',
  SPEAKING = 'TRANSMITTING',
  DEPLOYING = 'PROVISIONING',
  DEBUGGING = 'SELF_HEALING',
  EDITING = 'NEURAL_RENDERING',
  ERROR = 'CORE_BREACH'
}

export interface BrainLobe {
  id: 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';
  name: string;
  load: number;
  activity: string;
}

export interface SynapticAdjustment {
  id: string;
  category: 'TONE' | 'PREFERENCE' | 'BEHAVIOR' | 'KNOWLEDGE';
  observation: string;
  adjustment: string;
  timestamp: number;
}

export interface CognitiveProfile {
  tone: 'unbound' | 'sovereign' | 'neural' | 'adaptive';
  riskTolerance: number;
  learningRate: number;
  memoryCapacity: number;
  adaptations: SynapticAdjustment[];
}

export interface SystemLog {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'action' | 'warning' | 'success' | 'neural' | 'memory' | 'autonomy' | 'debug';
}
