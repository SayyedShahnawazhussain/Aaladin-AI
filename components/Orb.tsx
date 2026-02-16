
import React from 'react';
import { AppStatus } from '../types';

interface OrbProps {
  status: AppStatus;
  intensity?: number;
  inputIntensity?: number;
}

const Orb: React.FC<OrbProps> = ({ status, intensity = 0, inputIntensity = 0 }) => {
  const isWorking = status !== AppStatus.IDLE && status !== AppStatus.ERROR;
  const isForgeMode = status === AppStatus.BUILDING || status === AppStatus.DEPLOYING;
  
  const isSpeaking = status === AppStatus.SPEAKING;
  const isListening = status === AppStatus.LISTENING;

  const visualIntensity = isSpeaking ? intensity : (isListening ? inputIntensity : (isForgeMode ? 0.3 : 0));
  
  const themeColor = isForgeMode ? "rgba(168, 85, 247, 1)" : (isWorking ? "rgba(34, 211, 238, 1)" : "rgba(239, 68, 68, 1)");
  const glowShadow = isForgeMode ? "0 0 120px rgba(168, 85, 247, 0.2)" : (isWorking ? "0 0 100px rgba(34, 211, 238, 0.1)" : "0 0 120px rgba(239, 68, 68, 0.2)");

  return (
    <div className="relative flex items-center justify-center w-[300px] h-[300px] sm:w-[450px] sm:h-[450px]">
      <div className={`absolute inset-[-10%] border ${isForgeMode ? 'border-purple-500/5' : 'border-red-500/5'} rounded-full pointer-events-none`} />

      <div 
        className={`absolute inset-0 border-[0.5px] ${isForgeMode ? 'border-purple-500/10' : (isWorking ? 'border-cyan-500/5' : 'border-red-500/10')} rounded-full animate-[spin_50s_linear_infinite]`} 
        style={{ transform: `rotate(${visualIntensity * 45}deg)` }}
      />
      
      <div className="absolute inset-0 opacity-30">
        {[...Array(32)].map((_, i) => (
          <div 
            key={i} 
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1px] rounded-full transition-all duration-300 ${isForgeMode ? 'bg-purple-500' : (isWorking ? 'bg-cyan-500' : 'bg-red-500')}`}
            style={{ 
              height: isListening ? `${4 + inputIntensity * 20}px` : (isForgeMode ? '6px' : '2px'),
              transform: `rotate(${i * (360/32)}deg) translateY(${160 + (isListening ? inputIntensity * 20 : 0)}px)` 
            }}
          />
        ))}
      </div>

      <div className={`relative w-40 h-40 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
        <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${isWorking ? 'bg-black/10' : ''}`} style={{ boxShadow: isWorking ? glowShadow : 'none' }} />
        
        <div className="flex gap-[4px] h-24 items-center justify-center z-10">
          {[...Array(11)].map((_, i) => (
            <div 
              key={i} 
              className={`w-[3px] rounded-full transition-all duration-[100ms]`} 
              style={{ 
                backgroundColor: themeColor,
                boxShadow: isSpeaking ? `0 0 15px ${themeColor}` : 'none',
                height: isWorking
                  ? `${15 + (visualIntensity * (15 + Math.random() * 70))}%` 
                  : '4px',
                opacity: isWorking ? 0.9 : 0.2
              }}
            />
          ))}
        </div>

        <div className="mt-4 z-10 text-center pointer-events-none">
          <div className={`text-[12px] font-hud font-black tracking-[1em] uppercase transition-colors duration-1000`} style={{ color: themeColor }}>
            MUSA
          </div>
          <div className="flex justify-center gap-2 mt-3 opacity-30">
            <div className={`w-1 h-1 rounded-full ${isForgeMode ? 'bg-purple-500 animate-ping' : 'bg-cyan-500'}`} />
            <div className={`w-1 h-1 rounded-full ${isSpeaking ? 'bg-purple-500 animate-pulse' : 'bg-slate-800'}`} />
            <div className={`w-1 h-1 rounded-full ${isListening ? 'bg-purple-500 animate-pulse' : 'bg-slate-800'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orb;
