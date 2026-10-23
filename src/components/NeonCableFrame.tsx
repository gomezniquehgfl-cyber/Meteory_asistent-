import React from 'react';

interface NeonCableFrameProps {
  children: React.ReactNode;
}

export const NeonCableFrame: React.FC<NeonCableFrameProps> = ({ children }) => {
  return (
    <div className="relative w-full min-h-screen bg-[#020617] text-slate-100 flex flex-col justify-between overflow-x-hidden select-none">
      {/* =========================================================================
          HIGH-VISIBILITY PROMINENT NEON CABLE BORDER (Glowing Fiber-Optic Conduit)
         ========================================================================= */}
      
      {/* TOP CABLE (Thick 5px conduit with moving plasma light stream) */}
      <div className="fixed top-0 left-0 right-0 h-[6px] z-50 pointer-events-none overflow-hidden bg-slate-950/90 border-b border-cyan-500/40 shadow-[0_2px_12px_rgba(0,229,255,0.4)]">
        {/* Constant ambient electric wire core */}
        <div className="absolute inset-0 bg-cyan-950/70" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-cyan-400/40" />
        {/* Intense Moving Plasma Laser Packet */}
        <div className="relative w-full h-full bg-gradient-to-r from-transparent via-cyan-400 via-white to-transparent shadow-[0_0_20px_#00e5ff,0_0_35px_#00e5ff,0_0_50px_#38bdf8] animate-[neon-flow-x_2.4s_ease-in-out_infinite]" />
      </div>

      {/* BOTTOM CABLE (Thick 6px conduit with reverse moving plasma light stream) */}
      <div className="fixed bottom-0 left-0 right-0 h-[6px] z-50 pointer-events-none overflow-hidden bg-slate-950/90 border-t border-cyan-500/40 shadow-[0_-2px_12px_rgba(0,229,255,0.4)]">
        <div className="absolute inset-0 bg-cyan-950/70" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-cyan-400/40" />
        <div className="relative w-full h-full bg-gradient-to-r from-transparent via-cyan-400 via-white to-transparent shadow-[0_0_20px_#00e5ff,0_0_35px_#00e5ff,0_0_50px_#38bdf8] animate-[neon-flow-x-reverse_2.4s_ease-in-out_infinite]" />
      </div>

      {/* LEFT CABLE (Thick 6px vertical conduit with downward plasma stream) */}
      <div className="fixed top-0 bottom-0 left-0 w-[6px] z-50 pointer-events-none overflow-hidden bg-slate-950/90 border-r border-cyan-500/40 shadow-[2px_0_12px_rgba(0,229,255,0.4)]">
        <div className="absolute inset-0 bg-cyan-950/70" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-cyan-400/40" />
        <div className="relative w-full h-full bg-gradient-to-b from-transparent via-cyan-400 via-white to-transparent shadow-[0_0_20px_#00e5ff,0_0_35px_#00e5ff,0_0_50px_#38bdf8] animate-[neon-flow-y_2.4s_ease-in-out_infinite]" />
      </div>

      {/* RIGHT CABLE (Thick 6px vertical conduit with upward plasma stream) */}
      <div className="fixed top-0 bottom-0 right-0 w-[6px] z-50 pointer-events-none overflow-hidden bg-slate-950/90 border-l border-cyan-500/40 shadow-[-2px_0_12px_rgba(0,229,255,0.4)]">
        <div className="absolute inset-0 bg-cyan-950/70" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-cyan-400/40" />
        <div className="relative w-full h-full bg-gradient-to-b from-transparent via-cyan-400 via-white to-transparent shadow-[0_0_20px_#00e5ff,0_0_35px_#00e5ff,0_0_50px_#38bdf8] animate-[neon-flow-y-reverse_2.4s_ease-in-out_infinite]" />
      </div>

      {/* PROMINENT CYBERNETIC JUNCTION CORNER NODES */}
      {/* Top Left */}
      <div className="fixed top-0 left-0 w-5 h-5 rounded-full bg-black border border-cyan-400 shadow-[0_0_20px_#00e5ff] z-50 pointer-events-none flex items-center justify-center -translate-x-1 -translate-y-1">
        <div className="w-3 h-3 rounded-full border border-cyan-300/80 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
        </div>
      </div>
      {/* Top Right */}
      <div className="fixed top-0 right-0 w-5 h-5 rounded-full bg-black border border-cyan-400 shadow-[0_0_20px_#00e5ff] z-50 pointer-events-none flex items-center justify-center translate-x-1 -translate-y-1">
        <div className="w-3 h-3 rounded-full border border-cyan-300/80 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
        </div>
      </div>
      {/* Bottom Left */}
      <div className="fixed bottom-0 left-0 w-5 h-5 rounded-full bg-black border border-cyan-400 shadow-[0_0_20px_#00e5ff] z-50 pointer-events-none flex items-center justify-center -translate-x-1 translate-y-1">
        <div className="w-3 h-3 rounded-full border border-cyan-300/80 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
        </div>
      </div>
      {/* Bottom Right */}
      <div className="fixed bottom-0 right-0 w-5 h-5 rounded-full bg-black border border-cyan-400 shadow-[0_0_20px_#00e5ff] z-50 pointer-events-none flex items-center justify-center translate-x-1 translate-y-1">
        <div className="w-3 h-3 rounded-full border border-cyan-300/80 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
        </div>
      </div>

      {/* AMBIENT PERIMETER NEON GLOW REFLECTION */}
      <div className="fixed inset-0 pointer-events-none z-40 shadow-[inset_0_0_40px_rgba(0,229,255,0.22),inset_0_0_90px_rgba(2,132,199,0.12)]" />

      {/* Inner Application Content */}
      <div className="relative z-10 w-full flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};
