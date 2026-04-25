import { create } from 'zustand';
import { Relic, INITIAL_RELICS, fusionEngine, OpponentData } from '../services/fusionEngine';

interface RelicStore {
  activeRelic: Relic | null;
  relicCodex: Relic[];
  squadRelics: Relic[];
  synergyBonus: number;
  
  setActiveRelic: (relic: Relic) => void;
  fuseRelics: (relicA: Relic, relicB: Relic) => void;
  evolveActiveRelic: (opponets: OpponentData[]) => void;
  syncSquad: (members: Relic[]) => void;
}

export const useRelicStore = create<RelicStore>((set, get) => ({
  activeRelic: INITIAL_RELICS[0],
  relicCodex: INITIAL_RELICS,
  squadRelics: [],
  synergyBonus: 0,

  setActiveRelic: (activeRelic) => set({ activeRelic }),

  fuseRelics: (a, b) => {
    const result = fusionEngine.initiateFusion(a, b);
    set((state) => ({
      activeRelic: result.relic,
      relicCodex: [...state.relicCodex, result.relic]
    }));
  },

  evolveActiveRelic: (opponents) => {
    const current = get().activeRelic;
    if (!current) return;
    const evolved = fusionEngine.evolveRelic(current, opponents);
    set((state) => ({
      activeRelic: evolved,
      relicCodex: state.relicCodex.map(r => r.id === current.id ? evolved : r)
    }));
  },

  syncSquad: (members) => {
    const active = get().activeRelic;
    if (!active) return;
    
    let totalSynergy = 0;
    members.forEach(m => {
      // Calculate real synergy based on engine math
      totalSynergy += active.traits.filter(t => m.traits.includes(t)).length * 10;
      if (active.faction === m.faction) totalSynergy += 20;
    });

    set({ squadRelics: members, synergyBonus: totalSynergy });
  }
}));
