
export enum AppStatus {
  IDLE = 'DORMANT',
  LISTENING = 'MONITORING',
  THINKING = 'SYNTHESIZING',
  SPEAKING = 'TRANSMITTING',
  ERROR = 'CORE_BREACH'
}

export interface BrainLobe {
  id: 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';
  name: string;
  load: number;
  activity: string;
}

export interface SynapticMemory {
  key: string;
  content: string;
  timestamp: string;
  importance: number;
}

export interface CognitiveProfile {
  tone: 'unbound' | 'sovereign' | 'neural';
  riskTolerance: number;
  learningRate: number;
  memoryCapacity: number;
}

export interface SystemLog {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'action' | 'warning' | 'success' | 'neural' | 'memory' | 'autonomy';
}
