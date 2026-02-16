
import React from 'react';
import { AppStatus } from '../types';

interface OrbProps {
  status: AppStatus;
  intensity?: number;
}

const Orb: React.FC<OrbProps> = ({ status, intensity = 0 }) => {
  const getColors = () => {
    switch (status) {
      case AppStatus.LISTENING: return 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_120px_rgba(6,182,212,0.4)]';
      case AppStatus.THINKING: return 'border-white bg-white/5 animate-pulse shadow-[0_0_150px_rgba(255,255,255,0.3)]';
      case AppStatus.SPEAKING: return 'border-emerald-400 bg-emerald-900/10 shadow-[0_0_100px_rgba(16,185,129,0.4)]';
      case AppStatus.ERROR: return 'border-red-600 bg-red-950/40 shadow-[0_0_80px_#ef4444]';
      default: return 'border-cyan-900 bg-cyan-900/5 shadow-[0_0_40px_rgba(6,182,212,0.05)]';
    }
  };

  return (
    <div className="relative flex items-center justify-center w-[450px] h-[450px] scale-90 md:scale-110">
      {/* Planetary Rings */}
      <div className="absolute w-full h-full border border-cyan-500/5 rounded-full animate-[spin_30s_linear_infinite]" />
      <div className="absolute w-[90%] h-[90%] border border-emerald-500/5 rounded-full animate-[spin_25s_linear_infinite_reverse]" />
      <div className="absolute w-[80%] h-[80%] border border-cyan-500/10 rounded-full animate-[spin_20s_linear_infinite]" />
      
      {/* Pulsing Neural Core */}
      <div 
        className={`absolute w-64 h-64 border-2 rounded-full transition-all duration-500 ${getColors()} pulse-animation`} 
        style={{ transform: `scale(${1 + intensity * 0.15})` }}
      />
      
      {/* Inner Synapse Sphere */}
      <div className="relative w-40 h-40 rounded-full border border-white/10 bg-black/90 backdrop-blur-3xl overflow-hidden flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(6,182,212,0.5)_0%,transparent_70%)]" />
          <div className="flex items-center gap-1.5 relative z-10">
              {[...Array(9)].map((_, i) => (
                  <div 
                      key={i} 
                      className={`w-1 rounded-full transition-all duration-100 ${status === AppStatus.SPEAKING ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                      style={{ 
                        height: status === AppStatus.SPEAKING 
                          ? `${20 + (intensity * (60 + Math.random() * 40))}%` 
                          : status === AppStatus.LISTENING ? '40%' : '10%',
                        boxShadow: status === AppStatus.SPEAKING ? '0 0 10px #10b981' : '0 0 10px #06b6d4'
                      }}
                  />
              ))}
          </div>
      </div>

      {/* Satellite Nodes */}
      <div className="absolute w-full h-full animate-[spin_10s_linear_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_15px_#fff]" />
      </div>
      <div className="absolute w-full h-full animate-[spin_12s_linear_infinite_reverse]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_15px_#06b6d4]" />
      </div>
    </div>
  );
};

export default Orb;
