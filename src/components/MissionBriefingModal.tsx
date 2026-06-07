import React from 'react';
import { motion } from 'motion/react';
import { 
  X, Shield, Swords, Flame, AlertTriangle, Cpu, Crosshair, 
  BookOpen, Terminal, Sparkles, Navigation, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { useGameStore } from '../store';
import { soundManager } from '../lib/sounds';

interface MissionBriefingModalProps {
  onClose: () => void;
  onDeploy: () => void;
}

export const MissionBriefingModal: React.FC<MissionBriefingModalProps> = ({ onClose, onDeploy }) => {
  const currentMission = useGameStore(state => state.currentMission);
  const selectedLegend = useGameStore(state => state.selectedLegend);
  const selectedWeapon = useGameStore(state => state.selectedWeapon);

  if (!currentMission) return null;

  // Sound effects of click
  const handleDeploy = () => {
    soundManager.play('ready', 0.5);
    onDeploy();
  };

  const handleAbort = () => {
    soundManager.play('hover', 0.4);
    onClose();
  };

  // Get threat rating index based on enemies array length
  const enemyCount = currentMission.enemies?.length || 1;
  const threatMeter = enemyCount <= 2 ? 'MED' : enemyCount === 3 ? 'HIGH' : 'CRITICAL';
  const threatColor = threatMeter === 'MED' ? 'text-yellow-400' : threatMeter === 'HIGH' ? 'text-red-400' : 'text-purple-400 animate-pulse';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md text-white select-none overflow-y-auto"
    >
      {/* Decorative Blueprint/Grid element */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <motion.div 
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="w-full max-w-2xl bg-neutral-950 border border-neutral-900 rounded-sm overflow-hidden relative shadow-[0_0_60px_rgba(34,211,238,0.1)] flex flex-col my-auto"
      >
        {/* Glowing Status Line Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-cyan-800 to-purple-600 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />

        {/* Modal Banner Title */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-neutral-900/60 to-transparent border-b border-neutral-900 flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-[9px] text-cyan-400 font-extrabold uppercase tracking-[0.25em]">
              <Terminal size={10} className="animate-pulse" /> Command Network Briefing Feed
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display flex items-center gap-2">
              <Navigation className="text-cyan-400 rotate-45" size={18} />
              {currentMission.title}
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wide mt-0.5">
              TARGET SECTOR: {currentMission.location || `ZONE-${currentMission.region}`}
            </p>
          </div>

          <button 
            onClick={handleAbort}
            className="p-1.5 border border-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-900/50 rounded-full transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content Details List */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col gap-5 overflow-y-auto max-h-[60vh] font-mono">
          
          {/* Section 1: Objective descriptions */}
          <div className="border-l-2 border-cyan-500/40 pl-3">
            <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">OPERATIONAL PARAMETERS</span>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic mt-1 font-mono">
              "{currentMission.description}"
            </p>
          </div>

          {/* Grid: Objectives List vs Hazards Alert */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-1">
            
            {/* L1: Left box: Objectives Checklist */}
            <div className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-sm">
              <h3 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Primary Objectives
              </h3>
              
              <div className="flex flex-col gap-2.5">
                {currentMission.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] leading-relaxed group">
                    <div className="w-4 h-4 rounded-xs border border-cyan-500/30 flex items-center justify-center mt-0.5 group-hover:border-cyan-400 transition-all shrink-0 bg-neutral-950">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-55 scale-75 group-hover:scale-100 group-hover:opacity-100 transition-all" />
                    </div>
                    <span className="text-zinc-300 group-hover:text-white transition-colors">{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* L2: Right box: Hazards alert & Enemy info */}
            <div className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-sm flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-red-500" /> Hazard Matrix Alert
                </h3>

                {/* Hazards tags selection list */}
                {currentMission.hazards && currentMission.hazards.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {currentMission.hazards.map((haz, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-red-400/90 font-bold bg-red-950/20 border border-red-500/10 px-2 py-1 rounded-xs">
                        <span className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
                        <span className="uppercase tracking-wide">{haz}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-500 uppercase italic">
                    No explicit environmental feedback traps detected in scouting files.
                  </div>
                )}
              </div>

              {/* Threat assessment details */}
              <div className="border-t border-neutral-900/60 pt-3 text-[10px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-500 font-bold uppercase">Estimated Hostiles</span>
                  <span className="text-white hover:text-cyan-400 cursor-help flex items-center gap-0.5">
                    {currentMission.enemies?.join(' / ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold uppercase">Threat Level</span>
                  <span className={`font-black uppercase tracking-wider ${threatColor}`}>
                    [{threatMeter}]
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Operator Loadout Deployment Commendation */}
          <div className="bg-neutral-950/90 border border-neutral-900 p-3.5 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 flex items-center justify-center text-cyan-400 shadow-inner shrink-0 leading-none">
                <Cpu size={20} />
              </div>
              <div className="text-left">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">COMMENDED SQUAD MEMBER</span>
                <div className="text-xs font-black uppercase text-white mt-0.5">
                  {selectedLegend.name}
                </div>
                <div className="text-[9px] text-cyan-400/70 uppercase">
                  Specialization: {selectedLegend.specialization.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right flex flex-col">
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">DEPLOYED FIREPOWER MATRIX</span>
              <div className="text-xs font-extrabold uppercase text-zinc-300 mt-0.5">
                {selectedWeapon.name}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase">
                Base damage: {selectedWeapon.baseDamage} AP / fire rate: {selectedWeapon.fireRate}s
              </div>
            </div>
          </div>

          {/* Environment brief parameters */}
          <div className="text-neutral-500 text-[10px] leading-relaxed flex items-center gap-2 border-t border-neutral-900/40 pt-1.5 font-mono">
            <span>ENVIRONMENT MATRIX SUMMARY:</span>
            <span className="text-zinc-300 font-bold uppercase">{currentMission.environment}</span>
          </div>
        </div>

        {/* Modal Controls Actions Bar */}
        <div className="p-5 sm:p-6 bg-neutral-950/70 border-t border-neutral-900 flex flex-col sm:flex-row gap-3">
          <button
            id="abort-deployment-button"
            onClick={handleAbort}
            className="sm:w-1/3 py-3.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-[0.2em] rounded-sm transition-all cursor-pointer font-display"
          >
            ABORT DEPLOYMENT
          </button>
          
          <button
            id="launch-deployment-button"
            onClick={handleDeploy}
            className="flex-1 py-3.5 bg-cyan-500 text-black text-xs font-black uppercase tracking-[0.3em] rounded-sm hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2 font-display cursor-pointer"
          >
            CONFIRM & START SIMULATION
            <ChevronRight size={14} className="stroke-[3]" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
