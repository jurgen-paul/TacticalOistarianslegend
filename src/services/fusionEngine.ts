
import { soundManager } from '../lib/sounds';

export type Faction = 'Vanguard' | 'Aether' | 'Void' | 'Oistarian' | 'Crimson Vow' | 'Echo Syndicate' | 'Verdant Pact' | 'Iron Dominion';
export type MutationType = 'Stability' | 'Temporal' | 'Corrosive' | 'Hyper-Focus';

export interface Relic {
  id: string;
  name: string;
  faction: Faction;
  tier: number;
  traits: string[];
  powerLevel: number;
  mutation?: MutationType;
  glyphArtifact?: string;
  lore?: string;
  stats: {
    synergy: number;
    mutationEffect: number;
  };
}

export const INITIAL_RELICS: Relic[] = [
  {
    id: 'relic-001',
    name: 'Eden Core Fragment',
    faction: 'Vanguard',
    tier: 1,
    traits: ['Tactical', 'EMP'],
    powerLevel: 50,
    stats: { synergy: 0, mutationEffect: 0 }
  },
  {
    id: 'relic-002',
    name: 'Memory Wraith Whispers',
    faction: 'Aether',
    tier: 1,
    traits: ['Stealth', 'Hyper-Focus'],
    powerLevel: 45,
    stats: { synergy: 0, mutationEffect: 0 }
  }
];

class SynergyCalculator {
  calculateSynergy(a: Relic, b: Relic): number {
    const overlappingTraits = a.traits.filter(t => b.traits.includes(t));
    const factionBonus = a.faction === b.faction ? 20 : 0;
    return (overlappingTraits.length * 15) + factionBonus + (Math.abs(a.powerLevel - b.powerLevel) < 10 ? 10 : 0);
  }
}

class FactionalModifier {
  static applyFactionBonus(relic: Relic): number {
    const bonuses: Record<Faction, number> = {
      'Vanguard': 5,
      'Aether': 10,
      'Void': 15,
      'Oistarian': 8,
      'Crimson Vow': 12,
      'Echo Syndicate': 14,
      'Verdant Pact': 11,
      'Iron Dominion': 16
    };
    return bonuses[relic.faction];
  }
}

class MutationSelector {
  static determineMutation(synergy: number): MutationType | undefined {
    if (synergy < 30) return undefined;
    const mutations: MutationType[] = ['Stability', 'Temporal', 'Corrosive', 'Hyper-Focus'];
    return mutations[Math.floor(Math.random() * mutations.length)];
  }
}

class GlyphGenerator {
  static generateGlyph(relic: Relic): string {
    const prefixes = ['∑', 'Ω', 'Ψ', 'Δ'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${relic.powerLevel}-${relic.faction.slice(0, 2).toUpperCase()}`;
  }
}

class AchievementTracker {
  evaluateFusionMilestones(relic: Relic): string | null {
    if (relic.tier >= 5) return "LEGENDARY_SMITH_UNLOCKED";
    if (relic.mutation === 'Temporal') return "TIME_BENDER_ACHIEVED";
    if (relic.powerLevel > 200) return "MAX_POWER_EQUILIBRIUM";
    return null;
  }
}

class CraftingTreeManager {
  static fetchRelicMetadata(tier: number): { rarity: string; color: string; baseModifier: number } {
    const metadata = [
      { rarity: 'COMMON', color: 'cyan', baseModifier: 1 },
      { rarity: 'UNCOMMON', color: 'green', baseModifier: 1.2 },
      { rarity: 'RARE', color: 'blue', baseModifier: 1.5 },
      { rarity: 'EPIC', color: 'purple', baseModifier: 2 },
      { rarity: 'LEGENDARY', color: 'yellow', baseModifier: 3 }
    ];
    return metadata[Math.min(tier - 1, metadata.length - 1)];
  }
}

class LoreComposer {
  static compose(a: Relic, b: Relic): string {
    const intros = [
      "Forged in the collapsing pulse of the Eden Vault,",
      "A byproduct of forgotten Oistarian tech,",
      "The resonance of two ancient artifacts creates a NEW reality."
    ];
    return `${intros[Math.floor(Math.random() * intros.length)]} This fusion represents a bridge between ${a.name} and ${b.name}.`;
  }

  static appendLore(relic: Relic, fragments: string[]): string {
    const existingLore = relic.lore || "";
    return existingLore + (existingLore ? "\n" : "") + fragments.join("\n");
  }
}

export interface OpponentData {
  name: string;
  faction: Faction;
  usedRelicType: string;
}

export class RelicFusionEngine {
  private synergyCalc = new SynergyCalculator();
  private achievementTracker = new AchievementTracker();

  evolveRelic(relic: Relic, opponentHistory: OpponentData[]): Relic {
    const newTraits = [...relic.traits];
    const loreFragments: string[] = [];

    opponentHistory.forEach(opponent => {
      if (opponent.faction === "Oistarian") newTraits.push("Phase Echo");
      if (opponent.usedRelicType === "Crystal") newTraits.push("Prism Memory");

      loreFragments.push(`Faced ${opponent.name} in the Rift. Echoes of ${opponent.faction} linger.`);
    });

    return {
      ...relic,
      traits: Array.from(new Set(newTraits)),
      lore: LoreComposer.appendLore(relic, loreFragments),
      powerLevel: relic.powerLevel + (opponentHistory.length * 2)
    };
  }

  initiateFusion(a: Relic, b: Relic): { relic: Relic; achievement: string | null } {
    const synergy = this.synergyCalc.calculateSynergy(a, b);
    const mutation = MutationSelector.determineMutation(synergy);
    
    // Fetch Metadata via Crafting Tree
    const nextTier = Math.max(a.tier, b.tier) + 1;
    const meta = CraftingTreeManager.fetchRelicMetadata(nextTier);
    
    const powerLevel = Math.floor(((a.powerLevel + b.powerLevel) / 1.5) + synergy) * meta.baseModifier;
    
    const fusedRelic: Relic = {
      id: `fused-${Date.now()}`,
      name: `${a.faction}-${b.faction} ${mutation || 'Hybrid'}`,
      faction: a.faction,
      tier: nextTier,
      traits: Array.from(new Set([...a.traits, ...b.traits])),
      powerLevel: Math.floor(powerLevel),
      mutation,
      stats: {
        synergy,
        mutationEffect: mutation ? synergy * 0.5 : 0
      }
    };

    fusedRelic.glyphArtifact = GlyphGenerator.generateGlyph(fusedRelic);
    fusedRelic.lore = LoreComposer.compose(a, b);
    
    const achievement = this.achievementTracker.evaluateFusionMilestones(fusedRelic);
    
    return { relic: fusedRelic, achievement };
  }
}

export const fusionEngine = new RelicFusionEngine();
