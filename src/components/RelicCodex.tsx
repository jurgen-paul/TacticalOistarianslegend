import React, { useState } from 'react';
import { useRelicStore } from '../lib/relicStore';
import { OpponentData } from '../services/fusionEngine';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';

export const RelicCodex: React.FC = () => {
  const { activeRelic, relicCodex, evolveActiveRelic, setActiveRelic } = useRelicStore();
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateBattle = () => {
    if (!activeRelic) return;
    setIsSimulating(true);
    soundManager.play('ready', 0.5);

    const mockupHistory: OpponentData[] = [
      { name: "Nyla Sera", faction: "Oistarian", usedRelicType: "Crystal" },
      { name: "Vanguard Sentinel", faction: "Vanguard", usedRelicType: "Steel" }
    ];

    setTimeout(() => {
      evolveActiveRelic(mockupHistory);
      setIsSimulating(false);
      soundManager.play('objective', 0.6);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 w-full font-mono">
      <div className="flex justify-between items-end border-b border-cyan-500/20 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Relic Codex</h2>
          <p className="text-[10px] text-cyan-400/50 uppercase tracking-widest">Tactical Artifact Evolution Archive</p>
        </div>
        <button 
          onClick={simulateBattle}
          disabled={isSimulating || !activeRelic}
          className={`px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all ${
            isSimulating 
            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse' 
            : 'bg-black border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-black shadow-[0_0_15px_rgba(34,211,238,0.1)]'
          }`}
        >
          {isSimulating ? 'Evolving...' : 'Simulate Battle Evolution'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Relic Detail */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {activeRelic ? (
            <motion.div 
              key={activeRelic.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-cyan-500/5 border border-cyan-500/20 p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 text-[40px] font-black text-cyan-500/5 select-none pointer-events-none">
                {activeRelic.glyphArtifact}
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[8px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-1">{activeRelic.faction} Tier {activeRelic.tier}</div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{activeRelic.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-bold text-cyan-700 uppercase">Power Equilibrium</div>
                  <div className="text-2xl font-black text-cyan-400">{activeRelic.powerLevel}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-[9px] font-bold text-cyan-900 uppercase mb-2">Adaptive Traits</div>
                  <div className="flex flex-wrap gap-2">
                    {activeRelic.traits.map(trait => (
                      <span key={trait} className="px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/30 text-[9px] text-cyan-400 font-bold uppercase">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-cyan-900 uppercase mb-2">Molecular Mutation</div>
                  <div className="text-xs text-white font-bold">{activeRelic.mutation || 'NONE'}</div>
                  <div className="w-full h-1 bg-cyan-950 mt-1">
                    <div className="h-full bg-cyan-500" style={{ width: `${activeRelic.stats.mutationEffect}%` }} />
                  </div>
                </div>
              </div>

              <div className="border-t border-cyan-500/10 pt-4">
                <div className="text-[9px] font-bold text-cyan-900 uppercase mb-2 italic flex items-center gap-2">
                  <div className="w-1 h-1 bg-cyan-500 animate-pulse rounded-full" />
                  Chronicle of the Rift
                </div>
                <div className="text-[11px] text-cyan-100/60 leading-relaxed whitespace-pre-line font-accent italic">
                  {activeRelic.lore || "This artifact holds no memories. Yet."}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed border-cyan-500/20 text-cyan-900 text-xs">
              NO ACTIVE RELIC SELECTED
            </div>
          )}
        </div>

        {/* Codex List */}
        <div className="flex flex-col gap-4">
          <div className="text-[10px] font-black text-cyan-700 uppercase tracking-widest px-2">Archived Artifacts ({relicCodex.length})</div>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
            {relicCodex.map(relic => (
              <button
                key={relic.id}
                onClick={() => {
                  setActiveRelic(relic);
                  soundManager.play('objective', 0.4);
                }}
                className={`p-3 border text-left transition-all ${
                  activeRelic?.id === relic.id
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                  : 'bg-black/40 border-cyan-900/30 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-bold text-cyan-700 uppercase tracking-tighter">{relic.faction}</span>
                  <span className="text-[8px] font-black text-cyan-400">PWR {relic.powerLevel}</span>
                </div>
                <div className="text-xs font-black text-white uppercase">{relic.name}</div>
                <div className="text-[8px] text-cyan-600/50 mt-1 truncate">{relic.traits.join(" • ")}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
