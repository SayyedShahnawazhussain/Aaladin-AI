
import React from 'react';

interface HUDModuleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const HUDModule: React.FC<HUDModuleProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`glass-panel p-4 rounded-sm border-l-2 border-l-cyan-500/50 flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 bg-cyan-400 rotate-45" />
        <h3 className="text-[10px] font-hud font-bold tracking-[0.2em] uppercase text-cyan-100/80">{title}</h3>
      </div>
      
      <div className="flex-1 text-[10px] text-cyan-400/60 leading-tight font-mono">
        {children}
      </div>
      
      <div className="mt-2 flex justify-between items-center opacity-20">
         <div className="w-8 h-[1px] bg-cyan-400" />
         <div className="w-1 h-1 rounded-full bg-cyan-400" />
      </div>
    </div>
  );
};

export default HUDModule;
