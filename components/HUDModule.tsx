
import React from 'react';

interface HUDModuleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const HUDModule: React.FC<HUDModuleProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`border border-emerald-500/20 bg-black/60 backdrop-blur-md p-4 relative overflow-hidden group transition-all duration-500 ease-out hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:scale-[1.01] ${className}`}>
      {/* Interactive Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-400/40 transition-all duration-300 group-hover:border-emerald-400 group-hover:scale-125 group-hover:translate-x-[-1px] group-hover:translate-y-[-1px]" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-400/40 transition-all duration-300 group-hover:border-emerald-400 group-hover:scale-125 group-hover:translate-x-[1px] group-hover:translate-y-[-1px]" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-emerald-400/40 transition-all duration-300 group-hover:border-emerald-400 group-hover:scale-125 group-hover:translate-x-[-1px] group-hover:translate-y-[1px]" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-emerald-400/40 transition-all duration-300 group-hover:border-emerald-400 group-hover:scale-125 group-hover:translate-x-[1px] group-hover:translate-y-[1px]" />
      
      {/* Background Glint */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-3 border-b border-emerald-500/10 pb-1 relative z-10">
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse group-hover:scale-150 transition-transform duration-300" />
        <h3 className="text-[9px] tracking-[0.3em] uppercase font-black text-emerald-400/60 group-hover:text-emerald-400 transition-colors duration-300">{title}</h3>
      </div>
      
      <div className="text-xs text-emerald-100/90 leading-relaxed font-mono relative z-10 transition-colors duration-300 group-hover:text-white">
        {children}
      </div>
    </div>
  );
};

export default HUDModule;
