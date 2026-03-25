import { useState, useEffect } from 'react';

export default function Header() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-12 glass-panel border-b border-[rgba(0,229,255,0.1)] flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-sm font-bold tracking-[0.15em] text-neon-cyan text-glow-cyan">
          NEPTUNE-AI
        </h1>
        <span className="text-[10px] font-mono text-neptune-500 hidden md:inline">MARITIME INTELLIGENCE TERMINAL v2.0</span>
      </div>
      
      <div className="flex items-center gap-6">
        <span className="font-mono text-xs text-gray-400">
          {time.toUTCString().slice(17, 25)} UTC
        </span>
        
        <span className="text-[10px] font-heading tracking-wider px-2 py-0.5 rounded border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5">
          OPERATOR
        </span>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-glow shadow-[0_0_8px_#00ff88]"></div>
          <span className="text-[10px] font-mono text-neon-green">ONLINE</span>
        </div>
      </div>
    </header>
  );
}
