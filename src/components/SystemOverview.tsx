import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Flag, Code, Cog, Shield, MapPin, Users, Zap, Layout, Terminal, Activity, Cpu, Database, Network } from 'lucide-react';
import { useGameStore, MISSIONS } from '../store';

interface MindmapNodeProps {
  label: string;
  icon?: React.ReactNode;
  children?: string[];
  isRoot?: boolean;
  side?: 'left' | 'right';
  delay?: number;
}

const MindmapNode: React.FC<MindmapNodeProps> = ({ label, icon, children, isRoot, side, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: side === 'left' ? 50 : -50 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className={`relative flex flex-col ${side === 'left' ? 'items-end' : 'items-start'}`}
    >
      <div className={`
        px-6 py-3 rounded-sm border-2 flex items-center gap-3 transition-all duration-300 group
        ${isRoot 
          ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]' 
          : 'bg-black/80 text-cyan-400 border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]'}
      `}>
        {icon && <span className={`${isRoot ? 'text-black' : 'text-cyan-500 group-hover:text-cyan-400'}`}>{icon}</span>}
        <span className={`uppercase font-black tracking-widest ${isRoot ? 'text-lg' : 'text-xs'}`}>{label}</span>
      </div>

      {children && (
        <div className={`mt-4 flex flex-col gap-2 ${side === 'left' ? 'items-end pr-4 border-r-2' : 'items-start pl-4 border-l-2'} border-cyan-500/10`}>
          {children.map((child, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: side === 'left' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 + (idx * 0.1) }}
              className="text-[10px] text-cyan-200/50 uppercase font-bold tracking-tighter hover:text-cyan-400 transition-colors cursor-default"
            >
              {child}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export const SystemOverview: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const score = useGameStore(state => state.score);
  const trustScore = useGameStore(state => state.trustScore);
  const currentMission = useGameStore(state => state.currentMission);
  const squad = useGameStore(state => state.squad);

  const squadMorale = useMemo(() => {
    return Math.floor(squad.reduce((acc, m) => acc + m.morale, 0) / squad.length);
  }, [squad]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,#22d3ee_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl relative z-10 flex flex-col gap-8 h-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 bg-black/40 border border-cyan-500/10"
      >
        <div className="flex w-full justify-between items-center px-4">
          <div className="flex flex-col">
            <h2 className="text-cyan-400 font-display font-black text-2xl tracking-[0.3em] uppercase">Architecture Hub</h2>
            <p className="text-cyan-900 text-[10px] font-black tracking-widest uppercase italic">System Intelligence & Core Logic Mapping</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border border-cyan-500/20 text-cyan-500 hover:bg-cyan-500/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Real-time System Stats */}
          <div className="bg-cyan-950/20 border border-cyan-500/10 p-6 space-y-6">
            <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b border-cyan-500/20 pb-2">
              <Activity size={14} /> Real-time System Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-cyan-700">
                  <span>Neural Efficiency</span>
                  <span className="text-cyan-400">{(score / 1000).toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-cyan-900 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, score / 100)}%` }}
                    className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-cyan-700">
                  <span>Squad Resonance</span>
                  <span className="text-cyan-400">{squadMorale}%</span>
                </div>
                <div className="h-1 bg-cyan-900 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${squadMorale}%` }}
                    className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-cyan-700">
                  <span>Nexus Integrity</span>
                  <span className="text-cyan-400">{trustScore}%</span>
                </div>
                <div className="h-1 bg-cyan-900 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${trustScore}%` }}
                    className={`h-full ${trustScore < 60 ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_10px_#10b981]'}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-black/60 p-3 border border-cyan-500/5 items-center flex flex-col text-center">
                <Cpu size={16} className="text-cyan-500 mb-2" />
                <span className="text-[8px] text-cyan-800 uppercase font-black">Process Load</span>
                <span className="text-[12px] text-cyan-400 font-display">12.4ms</span>
              </div>
              <div className="bg-black/60 p-3 border border-cyan-500/5 items-center flex flex-col text-center">
                <Database size={16} className="text-cyan-500 mb-2" />
                <span className="text-[8px] text-cyan-800 uppercase font-black">Cache Link</span>
                <span className="text-[12px] text-cyan-400 font-display">SYNCED</span>
              </div>
            </div>
          </div>

          {/* Architecture Mapping (Center) */}
          <div className="lg:col-span-2 bg-black/40 border border-cyan-500/10 p-6">
            <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-8">
              <Network size={14} /> System Dependency Mapping
            </h3>
            
            <div className="relative flex items-center justify-center gap-12 py-8 overflow-hidden h-[400px]">
              {/* Left Side */}
              <div className="flex flex-col gap-8 scale-75 lg:scale-100">
                <MindmapNode 
                  label="Combat" 
                  icon={<Shield size={14} />} 
                  side="left" 
                  delay={0.4}
                  children={["Physics", "Damage"]}
                />
                <MindmapNode 
                  label="AI Logic" 
                  icon={<Terminal size={14} />} 
                  side="left" 
                  delay={0.6}
                  children={["Patrols", "Pathfinding"]}
                />
              </div>

              {/* Root */}
              <div className="relative scale-90 lg:scale-125">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 1, 0, -1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <MindmapNode label="Tactical Legends" icon={<Flag size={20} />} isRoot delay={0.2} />
                </motion.div>
                
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none -z-10">
                  <path d="M 300 200 L 150 100 M 300 200 L 150 300 M 300 200 L 450 100 M 300 200 L 450 300" stroke="rgba(34,211,238,0.2)" strokeWidth="1" fill="none" />
                </svg>
              </div>

              {/* Right Side */}
              <div className="flex flex-col gap-8 scale-75 lg:scale-100">
                <MindmapNode 
                  label="Characters" 
                  icon={<Users size={14} />} 
                  side="right" 
                  delay={0.4}
                  children={["Squad", "Abilities"]}
                />
                <MindmapNode 
                  label="Mission Engine" 
                  icon={<MapPin size={14} />} 
                  side="right" 
                  delay={0.6}
                  children={["Objectives", "Rewards"]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mission Dependency Map */}
        <div className="bg-cyan-950/10 border border-cyan-500/10 p-6">
          <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-6">
            <MapPin size={14} /> Mission Convergence Map
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {MISSIONS.map((mission, idx) => {
              const isActive = currentMission?.id === mission.id;
              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={`relative p-4 border transition-all duration-300 ${
                    isActive 
                      ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]' 
                      : 'bg-black/60 text-cyan-500/60 border-cyan-500/20 hover:border-cyan-500'
                  }`}
                >
                  <div className="text-[8px] font-black uppercase tracking-tighter mb-1 opacity-60">{mission.region}</div>
                  <div className="text-[10px] font-black uppercase truncate">{mission.title}</div>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" 
                    />
                  )}
                  
                  {/* Decorative Connection Line */}
                  {idx < MISSIONS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-6 w-6 h-px bg-cyan-500/20" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-12 border-t border-cyan-500/10 pt-12 w-full justify-center">
            <div className="flex flex-col items-center">
                <span className="text-[8px] text-cyan-500/30 uppercase tracking-[0.5em] mb-2 font-black">Status</span>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest">Nexus Core Live</span>
                </div>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[8px] text-cyan-500/30 uppercase tracking-[0.5em] mb-2 font-black">Optimization</span>
                <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest">98.4% Resilience</span>
            </div>
        </div>
      </motion.div>
    </div>
  );
};
