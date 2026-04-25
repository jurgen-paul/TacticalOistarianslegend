/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

import { soundManager } from './lib/sounds';
import { Relic, INITIAL_RELICS, fusionEngine } from './services/fusionEngine';

export type GameState = 'menu' | 'playing' | 'gameover';
export type EntityState = 'active' | 'disabled';

export type EnemyType = 'scout' | 'tank' | 'sniper' | 'standard' | 'ghost';

export type MoraleLevel = "High" | "Neutral" | "Low" | "Broken";

export interface VoiceLine {
  id: string;
  speaker: string;
  line: string;
  timestamp: number;
}

export interface Trigger {
  condition: (state: GameStore) => boolean;
  effect: (state: GameStore) => Partial<GameStore> | void;
}

export interface SquadMember {
  name: string;
  morale: number;
  status: "Active" | "Wounded" | "Compromised";
}

export enum Region {
  MiddleEast = 'Middle East',
  Europe = 'Europe',
  SouthAmerica = 'South America',
  Gaza = 'Gaza',
  Israel = 'Israel'
}

export interface Trigger {
  condition: (state: GameStore) => boolean;
  effect: (state: GameStore) => void | Partial<GameStore>;
}

export interface Mission {
  id: string;
  title: string;
  region: Region;
  description: string;
  location?: string;
  objectives: string[];
  hazards?: string[];
  enemies: EnemyType[];
  environment: string;
  resonanceUnlocked?: boolean;
  triggers: Record<string, Trigger>;
}

export const MISSIONS: Mission[] = [
  {
    id: 'eden_surge',
    title: 'Vault Protocol: Eden Surge',
    region: Region.Israel,
    description: 'Navigate the pulse-reactive corridors of the Eden Vault and extract the Surge Protocol.',
    location: 'Eden Vault - Subterranean Memory Core',
    objectives: [
      'Infiltrate the Eden Vault undetected',
      'Extract the Surge Protocol from Core Node 7',
      'Avoid triggering emotional traps',
      'Ensure Echo Vanguard survives'
    ],
    hazards: ['emotional feedback loops', 'AI sentinels', 'memory wraiths'],
    enemies: ["ghost", "standard"],
    environment: "Pulse-reactive corridors",
    triggers: {
      flashback: {
        condition: (state) => Math.random() < 0.001 && state.playerState === 'active',
        effect: (state) => {
          state.addVoiceLine("FLASHBACK", "The corridor. The child. The silence.");
          state.addEvent("EMOTIONAL FEEDBACK: FLASHBACK DETECTED");
          return { 
            playerDisabledUntil: Date.now() + 10000, 
            playerState: 'disabled',
            moralityScore: Math.max(0, state.moralityScore - 5)
          };
        }
      },
      betrayal: {
        condition: (state) => state.trustScore < 60 && state.selectedLegend.specialization === 'ECHO_VANGUARD' && !state.events.some(e => e.message === "NEUROPULSE MODULE DISABLED"),
        effect: (state) => {
          state.addVoiceLine("ECHO VANGUARD", "I feel the pulse... It's reacting to us. Your instability is a risk.");
          state.addEvent("NEUROPULSE MODULE DISABLED");
          return { empCooldown: Date.now() + 99999999 };
        }
      },
      surge_unlock: {
        condition: (state) => state.moralityScore > 70 && state.selectedLegend.specialization === 'ECHO_VANGUARD' && !state.currentMission?.resonanceUnlocked,
        effect: (state) => {
          state.addVoiceLine("SYSTEM", "Molecular synergy detected. Tactical resonance gear available.");
          state.addEvent("EDEN SURGE PROTOCOL UNLOCKED");
          return { currentMission: { ...state.currentMission, resonanceUnlocked: true } };
        }
      }
    }
  },
  {
    id: "urban_ops_gaza",
    title: "URBAN OPS: SHADOW SECTOR",
    region: Region.Gaza,
    description: "High-density urban reconnaissance and asset extraction in the Shadow Sector.",
    objectives: ["Locate lost uplink", "Avoid civilian detection", "Exfiltrate via roof"],
    environment: "Dense Urban / Ruins",
    enemies: ["standard", "scout"],
    triggers: {}
  },
  {
    id: "desert_haze",
    title: "DESERT HAZE",
    region: Region.MiddleEast,
    description: "Long-range engagement in open desert terrain. Beware of sandstorms and extreme heat mirages.",
    objectives: ["Neutralize scout outposts", "Capture fuel relay"],
    environment: "Desert / Open Plains",
    enemies: ["sniper", "scout"],
    triggers: {}
  },
  {
    id: "jungle_extraction",
    title: "AMAZONIAN RECOVERY",
    region: Region.SouthAmerica,
    description: "Infiltrate deep jungle facility to recover bio-growth data.",
    objectives: ["Infiltrate facility", "Secure lab equipment"],
    environment: "Dense Rainforest",
    enemies: ["ghost", "tank"],
    triggers: {}
  }
];

export type Specialization = 
  | 'SNIPER' 
  | 'ASSAULT' 
  | 'MEDIC' 
  | 'ENGINEER' 
  | 'DEMOLITIONS' 
  | 'RECONNAISSANCE' 
  | 'COMMUNICATIONS' 
  | 'ANTI_ARMOR' 
  | 'HEAVY_WEAPONS' 
  | 'CYBER_WARFARE'
  | 'ECHO_VANGUARD';

export interface LegendStats {
  health: number;
  armor: number;
  speed: number;
  accuracy: number;
  stealth: number;
  leadership: number;
  emotionalDisruption?: boolean;
}

export interface LegendData {
  id: string;
  name: string;
  codename?: string;
  specialization: Specialization;
  description: string;
  stats: LegendStats;
  dashCooldown: number;
  abilityCooldown: number;
  abilityDuration?: number;
  specialAbility: 'emp' | 'overdrive' | 'stealth' | 'shield' | 'jamming' | 'breach' | 'echo_pulse';
  rarity: 'silver' | 'platinum';
}

export const LEGENDS: LegendData[] = [
  // --- PLATINUM ELITES (Top 25) ---
  {
    id: 'ghost',
    name: "Maya Cohen",
    codename: "ECHO VANGUARD",
    specialization: 'ECHO_VANGUARD',
    description: "Specialist in neuro-tactical infiltration and emotional disruption.",
    stats: { health: 90, armor: 40, speed: 75, accuracy: 98, stealth: 90, leadership: 85, emotionalDisruption: true },
    dashCooldown: 1200,
    abilityCooldown: 15000,
    abilityDuration: 8000,
    specialAbility: 'echo_pulse',
    rarity: 'platinum'
  },
  {
    id: 'storm',
    name: "Tal Levi",
    codename: "STORM",
    specialization: 'ASSAULT',
    description: "Front-line combatant specializing in close-quarters battle.",
    stats: { health: 120, armor: 80, speed: 85, accuracy: 90, stealth: 60, leadership: 88 },
    dashCooldown: 1000,
    abilityCooldown: 12000,
    abilityDuration: 5000,
    specialAbility: 'overdrive',
    rarity: 'platinum'
  },
  {
    id: 'angel',
    name: "Liora Goldberg",
    codename: "ANGEL",
    specialization: 'MEDIC',
    description: "Field medic with advanced trauma care training.",
    stats: { health: 95, armor: 60, speed: 82, accuracy: 78, stealth: 70, leadership: 95 },
    dashCooldown: 1500,
    abilityCooldown: 14000,
    abilityDuration: 6000,
    specialAbility: 'shield',
    rarity: 'platinum'
  },
  {
    id: 'tech',
    name: "Gal Rosenberg",
    codename: "TECH",
    specialization: 'ENGINEER',
    description: "Combat engineer skilled in fortifications and signal jamming.",
    stats: { health: 85, armor: 70, speed: 65, accuracy: 82, stealth: 75, leadership: 85 },
    dashCooldown: 2000,
    abilityCooldown: 15000,
    abilityDuration: 8000,
    specialAbility: 'jamming',
    rarity: 'platinum'
  },
  {
    id: 'boom',
    name: "Inbar Yakir",
    codename: "BOOM",
    specialization: 'DEMOLITIONS',
    description: "Explosives expert trained in lethal breaching maneuvers.",
    stats: { health: 100, armor: 85, speed: 70, accuracy: 88, stealth: 65, leadership: 80 },
    dashCooldown: 2200,
    abilityCooldown: 18000,
    abilityDuration: 4000,
    specialAbility: 'breach',
    rarity: 'platinum'
  },
  {
    id: 'scout_elite',
    name: "Hila Dahan",
    codename: "SCOUT",
    specialization: 'RECONNAISSANCE',
    description: "Scout specialist with advanced gathering experience.",
    stats: { health: 80, armor: 45, speed: 95, accuracy: 85, stealth: 98, leadership: 75 },
    dashCooldown: 800,
    abilityCooldown: 11000,
    abilityDuration: 8000,
    specialAbility: 'stealth',
    rarity: 'platinum'
  },
  {
    id: 'crusher_elite',
    name: "Vered Barak",
    codename: "CRUSHER",
    specialization: 'HEAVY_WEAPONS',
    description: "Heavy weapons operator specializing in suppressive fire.",
    stats: { health: 125, armor: 95, speed: 50, accuracy: 88, stealth: 40, leadership: 88 },
    dashCooldown: 3000,
    abilityCooldown: 20000,
    abilityDuration: 6000,
    specialAbility: 'shield',
    rarity: 'platinum'
  },
  {
    id: 'hacker_elite',
    name: "Noy Ashkenazi",
    codename: "HACKER",
    specialization: 'CYBER_WARFARE',
    description: "Cyber ops specialist with expertise in digital infiltration.",
    stats: { health: 75, armor: 35, speed: 85, accuracy: 75, stealth: 88, leadership: 90 },
    dashCooldown: 1400,
    abilityCooldown: 15000,
    abilityDuration: 8000,
    specialAbility: 'jamming',
    rarity: 'platinum'
  },
  {
    id: 'silence_elite',
    name: "Noa Roth",
    codename: "SILENCE",
    specialization: 'SNIPER',
    description: "Shadow operative trained in high-altitude precision.",
    stats: { health: 85, armor: 35, speed: 80, accuracy: 96, stealth: 92, leadership: 75 },
    dashCooldown: 1500,
    abilityCooldown: 16000,
    abilityDuration: 7000,
    specialAbility: 'stealth',
    rarity: 'platinum'
  },
  {
    id: 'thunder_elite',
    name: "Yael Katz",
    codename: "THUNDER",
    specialization: 'ASSAULT',
    description: "Heavy assault specialist with reinforced ballistic plating.",
    stats: { health: 115, armor: 75, speed: 88, accuracy: 87, stealth: 55, leadership: 85 },
    dashCooldown: 1200,
    abilityCooldown: 13000,
    abilityDuration: 6000,
    specialAbility: 'overdrive',
    rarity: 'platinum'
  },
  {
    id: 'lifeline_elite',
    name: "Michal Ben-David",
    codename: "LIFELINE",
    specialization: 'MEDIC',
    description: "Battlefield trauma lead with rapid extraction certifications.",
    stats: { health: 92, armor: 55, speed: 85, accuracy: 75, stealth: 68, leadership: 92 },
    dashCooldown: 1600,
    abilityCooldown: 15000,
    abilityDuration: 6000,
    specialAbility: 'shield',
    rarity: 'platinum'
  },
  {
    id: 'digital_elite',
    name: "Stav Mizrahi",
    codename: "DIGITAL",
    specialization: 'CYBER_WARFARE',
    description: "Digital infiltration specialist with adaptive firewall tech.",
    stats: { health: 78, armor: 38, speed: 88, accuracy: 78, stealth: 85, leadership: 88 },
    dashCooldown: 1400,
    abilityCooldown: 14000,
    abilityDuration: 8000,
    specialAbility: 'jamming',
    rarity: 'platinum'
  },
  {
    id: 'blitz_elite',
    name: "Adi Shamir",
    codename: "BLITZ",
    specialization: 'ASSAULT',
    description: "Rapid deployment specialist with enhanced dash capabilities.",
    stats: { health: 118, armor: 78, speed: 90, accuracy: 89, stealth: 58, leadership: 90 },
    dashCooldown: 800,
    abilityCooldown: 11000,
    abilityDuration: 5000,
    specialAbility: 'overdrive',
    rarity: 'platinum'
  },
  {
    id: 'phoenix_elite',
    name: "Hadar Klein",
    codename: "PHOENIX",
    specialization: 'MEDIC',
    description: "Combat rescue lead with field-regeneration protocols.",
    stats: { health: 98, armor: 58, speed: 80, accuracy: 80, stealth: 72, leadership: 88 },
    dashCooldown: 1800,
    abilityCooldown: 16000,
    abilityDuration: 8000,
    specialAbility: 'shield',
    rarity: 'platinum'
  },
  {
    id: 'blast_elite',
    name: "Keren Tzur",
    codename: "BLAST",
    specialization: 'DEMOLITIONS',
    description: "Shockwave demolitionist trained in area-denial blasts.",
    stats: { health: 105, armor: 82, speed: 68, accuracy: 90, stealth: 62, leadership: 78 },
    dashCooldown: 2400,
    abilityCooldown: 17000,
    abilityDuration: 4000,
    specialAbility: 'breach',
    rarity: 'platinum'
  },


  // --- SILVER VETERANS ---
  {
    id: 'rosenfeld_v',
    name: 'Hannah Rosenfeld',
    codename: 'OVERWATCH',
    specialization: 'SNIPER',
    description: 'Precision marksman specialized in waterline concealment.',
    stats: { health: 85, armor: 35, speed: 80, accuracy: 96, stealth: 92, leadership: 75 },
    dashCooldown: 2000,
    abilityCooldown: 16000,
    abilityDuration: 7000,
    specialAbility: 'stealth',
    rarity: 'silver'
  },
  {
    id: 'farouk_v',
    name: 'Leila Farouk',
    codename: 'SPOTTER',
    specialization: 'SNIPER',
    description: 'Precision shooter with advanced camouflage specialties.',
    stats: { health: 88, armor: 38, speed: 77, accuracy: 97, stealth: 90, leadership: 78 },
    dashCooldown: 2000,
    abilityCooldown: 16000,
    abilityDuration: 7000,
    specialAbility: 'stealth',
    rarity: 'silver'
  },
  {
    id: 'hadid_v',
    name: 'Noor Hadid',
    codename: 'BREACH',
    specialization: 'DEMOLITIONS',
    description: 'Diver & EOD Technician. Specialist in underwater breaching.',
    stats: { health: 105, armor: 82, speed: 68, accuracy: 90, stealth: 62, leadership: 78 },
    dashCooldown: 1700,
    abilityCooldown: 13000,
    abilityDuration: 4000,
    specialAbility: 'breach',
    rarity: 'silver'
  },
  {
    id: 'petrova_v',
    name: 'Anya Petrova',
    codename: 'GUARDIAN',
    specialization: 'ASSAULT',
    description: 'Former elite guard with enhanced defensive capabilities.',
    stats: { health: 110, armor: 90, speed: 70, accuracy: 85, stealth: 50, leadership: 80 },
    dashCooldown: 2000,
    abilityCooldown: 15000,
    abilityDuration: 5000,
    specialAbility: 'shield',
    rarity: 'silver'
  }
];

export interface EnemyData {
  id: string;
  position: [number, number, number];
  state: EntityState;
  disabledUntil: number;
  type: EnemyType;
  lastHitTime: number; // For visual hit flash
  health: number;
  maxHealth: number;
  isShielded?: boolean;
  isBoosting?: boolean;
}

export interface ProjectileData {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  ownerId: string;
  timestamp: number;
}

export interface PlayerData {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  state: EntityState;
  disabledUntil: number;
  score: number;
  color: string;
  health: number;
  maxHealth: number;
}

export interface LaserData {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  timestamp: number;
  color: string;
}

export interface ParticleData {
  id: string;
  position: [number, number, number];
  timestamp: number;
  color: string;
}

export interface GameEvent {
  id: string;
  message: string;
  timestamp: number;
}

export interface ObjectiveData {
  id: string;
  type: 'capture' | 'payload';
  position: [number, number, number];
  progress: number;
  isBeingCaptured: boolean;
  label: string;
  controlledBy?: 'player' | 'enemy' | 'none';
  timer?: number; // Remaining time for timed objectives
}

export interface HazardData {
  id: string;
  type: 'laser' | 'gas' | 'disruptor';
  position: [number, number, number];
  size: [number, number, number];
  isActive: boolean;
  lastToggleTime: number;
}

export type AttachmentType = 'scope' | 'grip' | 'barrel';
export type WeaponType = 'assault_rifle' | 'plasma_rifle';

export interface Weapon {
  id: WeaponType;
  name: string;
  description: string;
  type: 'auto' | 'charge_burst';
  baseDamage: number;
  fireRate: number; // ms delay
  recoil: number;
  chargeTime?: number;
  burstCount?: number;
  burstDelay?: number;
}

export const WEAPONS: Record<WeaponType, Weapon> = {
  assault_rifle: {
    id: 'assault_rifle',
    name: 'A-7 Vanguard',
    description: 'Reliable automatic rifle for standard deployment.',
    type: 'auto',
    baseDamage: 25,
    fireRate: 150,
    recoil: 0.4
  },
  plasma_rifle: {
    id: 'plasma_rifle',
    name: 'P-9 Pulse Nova',
    description: 'High-energy weapon requiring charge-up for devastating micro-bursts.',
    type: 'charge_burst',
    baseDamage: 45,
    fireRate: 800,
    recoil: 0.8,
    chargeTime: 800,
    burstCount: 3,
    burstDelay: 60
  }
};

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  description: string;
  stats: {
    recoilReduction?: number;
    fireRateBoost?: number;
    zoomFactor?: number;
    rangeBoost?: number;
  };
}

export const ATTACHMENTS: Record<AttachmentType, Attachment[]> = {
  scope: [
    { id: 'scope-none', name: 'Iron Sights', type: 'scope', description: 'Standard sights', stats: { zoomFactor: 1 } },
    { id: 'scope-holo', name: 'Holo Sight', type: 'scope', description: 'Clear holographic reticle', stats: { zoomFactor: 1.2 } },
    { id: 'scope-2x', name: '2x Combat Optic', type: 'scope', description: 'Medium range magnification', stats: { zoomFactor: 2 } },
  ],
  grip: [
    { id: 'grip-none', name: 'No Grip', type: 'grip', description: 'Standard handling', stats: { recoilReduction: 0 } },
    { id: 'grip-vertical', name: 'Vertical Grip', type: 'grip', description: 'Improved recoil control', stats: { recoilReduction: 0.3 } },
    { id: 'grip-angled', name: 'Angled Grip', type: 'grip', description: 'Faster stability recovery', stats: { recoilReduction: 0.15 } },
  ],
  barrel: [
    { id: 'barrel-none', name: 'Standard Barrel', type: 'barrel', description: 'Factory default', stats: { fireRateBoost: 0, rangeBoost: 0 } },
    { id: 'barrel-long', name: 'Extended Barrel', type: 'barrel', description: 'Increased effective range', stats: { rangeBoost: 50 } },
    { id: 'barrel-rapid', name: 'Rapid Fire Barrel', type: 'barrel', description: 'Increased cycling speed', stats: { fireRateBoost: 0.2 } },
  ],
};

interface GameStore {
  gameState: GameState;
  score: number;
  timeLeft: number;
  playerState: EntityState;
  playerDisabledUntil: number;
  enemies: EnemyData[];
  lasers: LaserData[];
  particles: ParticleData[];
  projectiles: ProjectileData[];
  events: GameEvent[];
  playerHealth: number;
  playerMaxHealth: number;
  lastHitTime: number; // Time when player hits an enemy
  lastDamageTime: number; // Time when player takes damage
  playerPosition: [number, number, number];
  playerRotation: number;
  
  // Abilities
  dashCooldown: number;
  empCooldown: number;
  empActiveUntil: number;
  dashReadyNotified: boolean;
  empReadyNotified: boolean;
  
  // Objectives
  objectives: ObjectiveData[];
  
  // Hazards
  hazards: HazardData[];
  
  // Multiplayer
  socket: Socket | null;
  otherPlayers: Record<string, PlayerData>;

  // Weapon Customization
  selectedWeapon: Weapon;
  setWeapon: (weapon: Weapon) => void;
  plasmaCharge: number;
  setPlasmaCharge: (charge: number) => void;
  weaponAttachments: {
    scope: Attachment;
    grip: Attachment;
    barrel: Attachment;
  };
  setAttachment: (type: AttachmentType, attachment: Attachment) => void;
  zoomSensitivity: number;
  setZoomSensitivity: (sensitivity: number) => void;

  // Relic Fusion System
  relics: Relic[];
  relicCodex: Relic[];
  fusionHistory: string[];
  addRelic: (relic: Relic) => void;
  fuseRelics: (idA: string, idB: string) => void;

  // Narrative / Tactical Systems
  trustScore: number;
  moralityScore: number;
  squad: SquadMember[];
  currentMission: Mission | null;
  activeRegion: Region;
  activeVoiceLines: VoiceLine[];
  setTrustScore: (score: number) => void;
  setMoralityScore: (score: number) => void;
  setActiveRegion: (region: Region) => void;
  addVoiceLine: (speaker: string, line: string) => void;
  checkTriggers: () => void;

  // Legends
  selectedLegend: LegendData;
  setSelectedLegend: (legend: LegendData) => void;
  overdriveActiveUntil: number;
  stealthActiveUntil: number;
  shieldActiveUntil: number;
  jammingActiveUntil: number;
  breachActiveUntil: number;

  startGame: () => void;
  endGame: () => void;
  leaveGame: () => void;
  updateTime: (delta: number) => void;
  hitPlayer: () => void;
  hitEnemy: (id: string, byPlayer?: boolean) => void;
  addLaser: (start: [number, number, number], end: [number, number, number], color: string) => void;
  addParticles: (position: [number, number, number], color: string) => void;
  addProjectile: (position: [number, number, number], velocity: [number, number, number], color: string, ownerId: string) => void;
  addEvent: (message: string) => void;
  updateEnemies: (time: number) => void;
  updateProjectiles: (delta: number) => void;
  setEnemyAbility: (id: string, ability: 'shield' | 'boost', active: boolean) => void;
  cleanupEffects: (time: number) => void;
  setPlayerState: (state: EntityState) => void;
  triggerDash: () => void;
  triggerEMP: () => void;
  updateObjectives: (delta: number) => void;
  updateHazards: (time: number) => void;
  
  // Multiplayer actions
  updatePlayerPosition: (position: [number, number, number], rotation: number) => void;

  // Mobile Controls
  mobileInput: {
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
    aiming: boolean;
  };
  setMobileInput: (input: Partial<{
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
    aiming: boolean;
  }>) => void;
}

export const ENEMY_SPAWN_POINTS = [
  { id: 'sp-1', position: [40, 0.1, 40] as [number, number, number], label: 'Alpha' },
  { id: 'sp-2', position: [-40, 0.1, 40] as [number, number, number], label: 'Bravo' },
  { id: 'sp-3', position: [40, 0.1, -40] as [number, number, number], label: 'Charlie' },
  { id: 'sp-4', position: [-40, 0.1, -40] as [number, number, number], label: 'Delta' },
  { id: 'sp-5', position: [0, 0.1, 60] as [number, number, number], label: 'Epsilon' },
  { id: 'sp-6', position: [0, 0.1, -60] as [number, number, number], label: 'Zeta' },
];

const INITIAL_ENEMIES: EnemyData[] = [
  { id: 'bot-1', position: [40, 1, 40], state: 'active', disabledUntil: 0, type: 'scout', lastHitTime: 0, health: 50, maxHealth: 50 },
  { id: 'bot-2', position: [-40, 1, 40], state: 'active', disabledUntil: 0, type: 'tank', lastHitTime: 0, health: 250, maxHealth: 250 },
  { id: 'bot-3', position: [40, 1, -40], state: 'active', disabledUntil: 0, type: 'sniper', lastHitTime: 0, health: 80, maxHealth: 80 },
  { id: 'bot-4', position: [-40, 1, -40], state: 'active', disabledUntil: 0, type: 'standard', lastHitTime: 0, health: 100, maxHealth: 100 },
  { id: 'bot-5', position: [0, 1, 60], state: 'active', disabledUntil: 0, type: 'ghost', lastHitTime: 0, health: 60, maxHealth: 60 },
  { id: 'bot-6', position: [0, 1, -60], state: 'active', disabledUntil: 0, type: 'ghost', lastHitTime: 0, health: 60, maxHealth: 60 },
];

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'menu',
  score: 0,
  timeLeft: 120, // 2 minutes
  playerState: 'active',
  playerDisabledUntil: 0,
  enemies: [],
  lasers: [],
  particles: [],
  projectiles: [],
  events: [],
  lastHitTime: 0,
  lastDamageTime: 0,
  playerHealth: 100,
  playerMaxHealth: 100,
  playerPosition: [0, 0, 0],
  playerRotation: 0,
  dashCooldown: 0,
  empCooldown: 0,
  empActiveUntil: 0,
  dashReadyNotified: true,
  empReadyNotified: true,
  
  objectives: [
    { id: 'obj-1', type: 'capture', position: [0, 0, 0], progress: 0, isBeingCaptured: false, label: 'Central Data Core', controlledBy: 'none' },
    { id: 'obj-2', type: 'capture', position: [50, 0, 50], progress: 0, isBeingCaptured: false, label: 'Alpha Node', controlledBy: 'none' },
    { id: 'obj-3', type: 'payload', position: [-50, 0, -50], progress: 0, isBeingCaptured: false, label: 'Tactical Payload', timer: 300 },
  ],
  
  hazards: [
    { id: 'h-1', type: 'laser', position: [20, 0, 0], size: [1, 5, 10], isActive: false, lastToggleTime: 0 },
    { id: 'h-2', type: 'laser', position: [-20, 0, 0], size: [1, 5, 10], isActive: false, lastToggleTime: 0 },
    { id: 'h-3', type: 'gas', position: [0, 0, 30], size: [10, 2, 10], isActive: true, lastToggleTime: 0 },
    { id: 'h-4', type: 'gas', position: [0, 0, -30], size: [10, 2, 10], isActive: true, lastToggleTime: 0 },
    { id: 'h-5', type: 'disruptor', position: [30, 0, -30], size: [4, 8, 4], isActive: true, lastToggleTime: 0 },
    { id: 'h-6', type: 'disruptor', position: [-30, 0, 30], size: [4, 8, 4], isActive: true, lastToggleTime: 0 },
  ],
  
  socket: null,
  otherPlayers: {},

  weaponAttachments: {
    scope: ATTACHMENTS.scope[0],
    grip: ATTACHMENTS.grip[0],
    barrel: ATTACHMENTS.barrel[0],
  },

  selectedWeapon: WEAPONS.assault_rifle,
  setWeapon: (selectedWeapon) => set({ selectedWeapon }),
  plasmaCharge: 0,
  setPlasmaCharge: (plasmaCharge) => set({ plasmaCharge }),

  zoomSensitivity: 0.5,

  relics: INITIAL_RELICS,
  relicCodex: INITIAL_RELICS,
  fusionHistory: [],

  addRelic: (relic) => set(state => ({
    relics: [...state.relics, relic],
    relicCodex: state.relicCodex.find(r => r.name === relic.name) ? state.relicCodex : [...state.relicCodex, relic]
  })),

  fuseRelics: (idA, idB) => set(state => {
    const a = state.relics.find(r => r.id === idA);
    const b = state.relics.find(r => r.id === idB);
    if (!a || !b) return state;

    const { relic: fused, achievement } = fusionEngine.initiateFusion(a, b);
    soundManager.play('ready', 0.8);
    
    const newEvents = [...state.events];
    newEvents.push({ id: Math.random().toString(), message: `NEW RELIC DISCOVERED: ${fused.name}`, timestamp: Date.now() });
    
    if (achievement) {
      newEvents.push({ id: Math.random().toString(), message: `🏆 ACHIEVEMENT UNLOCKED: ${achievement.replace(/_/g, ' ')}`, timestamp: Date.now() });
    }

    return {
      relics: state.relics.filter(r => r.id !== idA && r.id !== idB).concat(fused),
      relicCodex: state.relicCodex.some(r => r.name === fused.name) ? state.relicCodex : [...state.relicCodex, fused],
      fusionHistory: [`Fused ${a.name} + ${b.name} into ${fused.name}`, ...state.fusionHistory].slice(0, 5),
      events: newEvents
    };
  }),

  trustScore: 100,
  moralityScore: 50,
  squad: [
    { name: "Echo Vanguard", morale: 85, status: "Active" },
    { name: "Oistarian", morale: 90, status: "Active" }
  ],
  currentMission: MISSIONS[0],
  activeRegion: Region.Israel,
  activeVoiceLines: [],

  setTrustScore: (trustScore) => set({ trustScore }),
  setMoralityScore: (moralityScore) => set({ moralityScore }),
  setActiveRegion: (activeRegion) => set({ activeRegion }),
  
  addVoiceLine: (speaker, line) => set(state => ({
    activeVoiceLines: [{ id: Math.random().toString(), speaker, line, timestamp: Date.now() }, ...state.activeVoiceLines].slice(0, 3)
  })),

  checkTriggers: () => {
    const state = get();
    if (!state.currentMission) return;

    Object.entries(state.currentMission.triggers).forEach(([key, trigger]) => {
      if (trigger.condition(state)) {
        const result = trigger.effect(state);
        if (result) set(result);
      }
    });
  },

  selectedLegend: LEGENDS[0],
  setSelectedLegend: (selectedLegend) => set({ 
    selectedLegend,
    playerHealth: selectedLegend.stats.health,
    playerMaxHealth: selectedLegend.stats.health
  }),
  overdriveActiveUntil: 0,
  stealthActiveUntil: 0,
  shieldActiveUntil: 0,
  jammingActiveUntil: 0,
  breachActiveUntil: 0,

  setAttachment: (type, attachment) => set((state) => ({
    weaponAttachments: { ...state.weaponAttachments, [type]: attachment }
  })),

  setZoomSensitivity: (zoomSensitivity) => set({ zoomSensitivity }),

  mobileInput: {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    shooting: false,
    aiming: false
  },

  setMobileInput: (input) => set((state) => ({
    mobileInput: { ...state.mobileInput, ...input }
  })),

  startGame: () => {
    soundManager.enable();
    soundManager.play('alert', 0.3);
    const { socket } = get();

    setTimeout(() => {
      get().addVoiceLine("NEXUS ONE", "Mission parameters initialized. Eden Vault location confirmed. Proceed with caution.");
    }, 2000);
    
    if (socket) {
      socket.disconnect();
    }

    let newSocket: Socket | null = null;

    // Initialize multiplayer
    newSocket = io(window.location.origin);
    
    newSocket.on('connect', () => {
      newSocket!.emit('joinGame');
    });

    newSocket.on('gameError', (msg: string) => {
      alert(msg);
      get().leaveGame();
    });

    newSocket.on('gameJoined', (players: Record<string, PlayerData>) => {
      const otherPlayers = { ...players };
      delete otherPlayers[newSocket!.id!];
      set({ 
        otherPlayers,
        gameState: 'playing',
        timeLeft: 120,
        score: 0,
        enemies: INITIAL_ENEMIES.map(e => ({ ...e, state: 'active', disabledUntil: 0 }))
      });
    });

      newSocket.on('playerJoined', (player: PlayerData) => {
        set(state => ({
          otherPlayers: { ...state.otherPlayers, [player.id]: player },
          events: [...state.events, { id: Math.random().toString(), message: `${player.name} joined`, timestamp: Date.now() }]
        }));
      });

      newSocket.on('playerMoved', (data: { id: string, position: [number, number, number], rotation: number }) => {
        set(state => {
          if (!state.otherPlayers[data.id]) return state;
          return {
            otherPlayers: {
              ...state.otherPlayers,
              [data.id]: {
                ...state.otherPlayers[data.id],
                position: data.position,
                rotation: data.rotation
              }
            }
          };
        });
      });

      newSocket.on('playerShot', (data: { id: string, start: [number, number, number], end: [number, number, number], color: string }) => {
        set(state => ({
          lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start: data.start, end: data.end, timestamp: Date.now(), color: data.color }],
          particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position: data.end, timestamp: Date.now(), color: data.color }]
        }));
      });

      newSocket.on('playerHit', (data: { targetId: string, shooterId: string, targetDisabledUntil: number, shooterScore: number }) => {
        set(state => {
          const now = Date.now();
          const isLocalShooter = data.shooterId === newSocket!.id;
          const isLocalTarget = data.targetId === newSocket!.id;
          
          const shooterName = isLocalShooter ? 'You' : (state.otherPlayers[data.shooterId]?.name || 'Unknown');
          const targetName = isLocalTarget ? 'You' : (state.otherPlayers[data.targetId]?.name || 'Unknown');
          const eventMsg = `${shooterName} tagged ${targetName}`;
          const newEvent = { id: Math.random().toString(), message: eventMsg, timestamp: now };

          let newState: Partial<GameStore> = {
            events: [...state.events, newEvent]
          };

          if (isLocalTarget) {
            newState.playerState = 'disabled';
            newState.playerDisabledUntil = data.targetDisabledUntil;
          }

          if (isLocalShooter) {
            newState.score = data.shooterScore;
          }

          // Update other players' states
          const players = { ...state.otherPlayers };
          let playersChanged = false;

          if (!isLocalTarget && players[data.targetId]) {
            players[data.targetId] = {
              ...players[data.targetId],
              state: 'disabled',
              disabledUntil: data.targetDisabledUntil
            };
            playersChanged = true;
          }

          if (!isLocalShooter && players[data.shooterId]) {
            players[data.shooterId] = {
              ...players[data.shooterId],
              score: data.shooterScore
            };
            playersChanged = true;
          }

          if (playersChanged) {
            newState.otherPlayers = players;
          }

          return newState;
        });
      });

      newSocket.on('playerLeft', (id: string) => {
        set(state => {
          const players = { ...state.otherPlayers };
          const playerName = players[id]?.name || 'Unknown';
          delete players[id];
          return { 
            otherPlayers: players,
            events: [...state.events, { id: Math.random().toString(), message: `${playerName} left`, timestamp: Date.now() }]
          };
        });
      });
    set({
      gameState: 'playing',
      score: 0,
      timeLeft: 120,
      playerState: 'active',
      playerDisabledUntil: 0,
      playerHealth: get().selectedLegend.stats.health,
      playerMaxHealth: get().selectedLegend.stats.health,
      enemies: INITIAL_ENEMIES.map(e => ({ ...e, state: 'active', disabledUntil: 0, health: e.maxHealth })),
      lasers: [],
      particles: [],
      events: [],
      socket: newSocket,
      otherPlayers: {},
    });
  },

  endGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ gameState: 'gameover', socket: null });
  },

  leaveGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      gameState: 'menu',
      socket: null,
      otherPlayers: {},
      enemies: [],
      lasers: [],
      particles: [],
      events: [],
      score: 0,
      timeLeft: 120,
      playerState: 'active'
    });
  },

  updateTime: (delta) => set((state) => {
    if (state.gameState !== 'playing') return state;
    const now = Date.now();
    const newTime = state.timeLeft - delta;
    
    let dashReadyNotified = state.dashReadyNotified;
    let empReadyNotified = state.empReadyNotified;

    if (!dashReadyNotified && now >= state.dashCooldown) {
      soundManager.play('ready', 0.2);
      dashReadyNotified = true;
    }
    if (!empReadyNotified && now >= state.empCooldown) {
      soundManager.play('ready', 0.2);
      empReadyNotified = true;
    }

    if (newTime <= 0) {
      if (state.socket) state.socket.disconnect();
      return { timeLeft: 0, gameState: 'gameover', socket: null, roomId: null };
    }

    state.checkTriggers();
    
    // Cleanup old voice lines
    const activeVoiceLines = state.activeVoiceLines.filter(v => now - v.timestamp < 6000);

    return { timeLeft: newTime, dashReadyNotified, empReadyNotified, activeVoiceLines };
  }),

  hitPlayer: () => set((state) => {
    if (state.playerState === 'disabled' || state.gameState !== 'playing') return state;
    if (Date.now() < state.shieldActiveUntil) {
      soundManager.play('ready', 0.2); // Shield block sound
      return state;
    }
    soundManager.play('damage', 0.6);
    
    // Narrative consequence: Losing trust on failure
    const newTrust = Math.max(0, state.trustScore - 2);
    if (state.trustScore >= 60 && newTrust < 60) {
      setTimeout(() => state.addVoiceLine("ECHO VANGUARD", "Commander, your performance is... concerning. Recalibrating loyalty parameters."), 1000);
    }

    const damage = 20; // Standard damage
    const newHealth = Math.max(0, state.playerHealth - damage);

    if (newHealth <= 0) {
      return {
        playerHealth: 0,
        playerState: 'disabled',
        playerDisabledUntil: Date.now() + 3000,
        score: Math.max(0, state.score - 50),
        lastDamageTime: Date.now(),
        trustScore: newTrust
      };
    }

    return {
      playerHealth: newHealth,
      lastDamageTime: Date.now(),
      trustScore: newTrust
    };
  }),

  hitEnemy: (id, byPlayer = false) => set((state) => {
    if (state.gameState !== 'playing') return state;
    
    // Check if it's a multiplayer player (Binary hit system for multiplayer simplified)
    if (state.socket && state.otherPlayers[id]) {
      state.socket.emit('hitPlayer', id);
      return state;
    }

    let enemyKilled = false;
    const enemies = state.enemies.map(e => {
      if (e.id === id && e.state === 'active') {
        if (e.isShielded) {
          soundManager.play('shoot', 0.2); // Shield hit sound
          return e;
        }

        const damage = state.selectedWeapon.baseDamage;
        const newHealth = Math.max(0, e.health - damage);

        if (newHealth <= 0) {
          enemyKilled = true;
          soundManager.play('enemy_death', 0.4);
          let disableDuration = 3000;
          if (e.type === 'tank') disableDuration = 5000;
          if (e.type === 'scout') disableDuration = 2000;
          return { 
            ...e, 
            health: 0, 
            state: 'disabled' as EntityState, 
            disabledUntil: Date.now() + disableDuration, 
            lastHitTime: Date.now() 
          };
        }

        soundManager.play('shoot', 0.1); // Small hit feedback sound
        return { ...e, health: newHealth, lastHitTime: Date.now() };
      }
      return e;
    });

    const scoreGain = (byPlayer && enemyKilled) ? Math.round(100 * (state.selectedWeapon.baseDamage / 25)) : 5;
    return {
      enemies,
      score: state.score + (byPlayer ? scoreGain : 0),
      lastHitTime: byPlayer ? Date.now() : state.lastHitTime,
      events: (byPlayer && enemyKilled) ? [...state.events, { id: Math.random().toString(), message: `TARGET NEUTRALIZED (+${scoreGain})`, timestamp: Date.now() }] : state.events
    };
  }),

  addLaser: (start, end, color) => {
    const { socket } = get();
    if (socket) {
      socket.emit('shoot', { start, end, color });
    }
    set((state) => ({
      lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start, end, timestamp: Date.now(), color }]
    }));
  },

  addParticles: (position, color) => set((state) => ({
    particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position, timestamp: Date.now(), color }]
  })),

  addProjectile: (position, velocity, color, ownerId) => set((state) => ({
    projectiles: [...state.projectiles, { id: Math.random().toString(), position, velocity, color, ownerId, timestamp: Date.now() }]
  })),

  addEvent: (message) => set((state) => ({
    events: [...state.events, { id: Math.random().toString(), message, timestamp: Date.now() }]
  })),

  updateEnemies: (time) => set((state) => {
    let changed = false;
    const enemies = state.enemies.map(e => {
      if (e.state === 'disabled' && time > e.disabledUntil) {
        changed = true;
        soundManager.play('spawn', 0.2);
        return { ...e, state: 'active' as EntityState, health: e.maxHealth, isShielded: false, isBoosting: false };
      }
      return e;
    });
    
    // Also update other players' states
    let otherPlayers = state.otherPlayers;
    let playersChanged = false;
    Object.values(state.otherPlayers).forEach(p => {
      if (p.state === 'disabled' && time > p.disabledUntil) {
        if (!playersChanged) {
          otherPlayers = { ...state.otherPlayers };
          playersChanged = true;
        }
        soundManager.play('spawn', 0.2);
        otherPlayers[p.id] = { ...p, state: 'active' };
      }
    });

    if (state.playerState === 'disabled' && time > state.playerDisabledUntil) {
      soundManager.play('spawn', 0.3);
      return { 
        enemies, 
        playerState: 'active', 
        playerHealth: state.playerMaxHealth,
        otherPlayers: playersChanged ? otherPlayers : state.otherPlayers 
      };
    }
    return changed || playersChanged ? { enemies, otherPlayers } : state;
  }),

  updateProjectiles: (delta) => set((state) => {
    if (state.projectiles.length === 0) return state;
    
    const newProjectiles: ProjectileData[] = [];
    let playerHit = false;

    state.projectiles.forEach(p => {
      const newPos: [number, number, number] = [
        p.position[0] + p.velocity[0] * delta,
        p.position[1] + p.velocity[1] * delta,
        p.position[2] + p.velocity[2] * delta
      ];

      // Check distance to player
      const distToPlayer = Math.sqrt(
        Math.pow(newPos[0] - state.playerPosition[0], 2) +
        Math.pow(newPos[1] - (state.playerPosition[1] + 1), 2) +
        Math.pow(newPos[2] - state.playerPosition[2], 2)
      );

      if (distToPlayer < 1.5 && state.playerState === 'active') {
        playerHit = true;
      } else if (Date.now() - p.timestamp < 5000) {
        newProjectiles.push({ ...p, position: newPos });
      }
    });

    if (playerHit) {
      get().hitPlayer();
      return { projectiles: [] }; // Clear projectiles on hit for simplicity
    }

    return { projectiles: newProjectiles };
  }),

  setEnemyAbility: (id, ability, active) => set((state) => ({
    enemies: state.enemies.map(e => {
      if (e.id === id) {
        if (ability === 'shield') return { ...e, isShielded: active };
        if (ability === 'boost') return { ...e, isBoosting: active };
      }
      return e;
    })
  })),

  cleanupEffects: (time) => set((state) => {
    const lasers = state.lasers.filter(l => time - l.timestamp < 200); // Lasers last 200ms
    const particles = state.particles.filter(p => time - p.timestamp < 500); // Particles last 500ms
    const events = state.events.filter(e => time - e.timestamp < 5000); // Events last 5s
    if (lasers.length !== state.lasers.length || particles.length !== state.particles.length || events.length !== state.events.length) {
      return { lasers, particles, events };
    }
    return state;
  }),

  setPlayerState: (playerState) => set({ playerState }),

  triggerDash: () => set((state) => {
    if (Date.now() < state.dashCooldown) return state;
    soundManager.play('dash', 0.4);
    return { dashCooldown: Date.now() + state.selectedLegend.dashCooldown, dashReadyNotified: false };
  }),

  triggerEMP: () => set((state) => {
    if (Date.now() < state.empCooldown) return state;
    const now = Date.now();
    const ability = state.selectedLegend.specialAbility;

    if (ability === 'overdrive') {
      soundManager.play('ready', 0.5);
      return {
        empCooldown: now + state.selectedLegend.abilityCooldown,
        overdriveActiveUntil: now + (state.selectedLegend.abilityDuration || 5000),
        empReadyNotified: false,
        events: [...state.events, { id: Math.random().toString(), message: "OVERDRIVE SYSTEM ENGAGED", timestamp: now }]
      };
    }

    if (ability === 'stealth') {
      soundManager.play('ready', 0.4);
      return {
        empCooldown: now + state.selectedLegend.abilityCooldown,
        stealthActiveUntil: now + (state.selectedLegend.abilityDuration || 8000),
        empReadyNotified: false,
        events: [...state.events, { id: Math.random().toString(), message: "CLOAKING ENGAGED", timestamp: now }]
      };
    }

    if (ability === 'shield') {
      soundManager.play('ready', 0.6);
      const isAnya = state.selectedLegend.id === 'petrova';
      return {
        empCooldown: now + state.selectedLegend.abilityCooldown,
        shieldActiveUntil: now + (state.selectedLegend.abilityDuration || 6000),
        empReadyNotified: false,
        events: [...state.events, { id: Math.random().toString(), message: isAnya ? "KINETIC BARRIER DEPLOYED" : "KINETIC SHIELD DEPLOYED", timestamp: now }]
      };
    }

    if (ability === 'echo_pulse') {
      soundManager.play('ready', 0.5);
      const duration = state.selectedLegend.abilityDuration || 8000;
      
      // Echo Pulse disables nearby enemies AND applies a disruption field
      const enemies = state.enemies.map(e => {
        const dist = Math.sqrt(
          Math.pow(e.position[0] - state.playerPosition[0], 2) +
          Math.pow(e.position[2] - state.playerPosition[2], 2)
        );
        if (dist < 40 && e.state === 'active') {
          return { ...e, state: 'disabled' as EntityState, disabledUntil: now + duration, lastHitTime: now };
        }
        return e;
      });

      return {
        enemies,
        empCooldown: now + state.selectedLegend.abilityCooldown,
        stealthActiveUntil: now + duration, // Echo Pulse includes stealth
        empReadyNotified: false,
        events: [...state.events, { id: Math.random().toString(), message: "ECHO PULSE: EMOTIONAL DISRUPTION ACTIVE", timestamp: now }]
      };
    }

    if (ability === 'breach') {
      soundManager.play('alert', 0.5);
      return {
        empCooldown: now + state.selectedLegend.abilityCooldown,
        breachActiveUntil: now + (state.selectedLegend.abilityDuration || 4000),
        empReadyNotified: false,
        events: [...state.events, { id: Math.random().toString(), message: "BREACH PROTOCOL INITIATED", timestamp: now }]
      };
    }
    
    // Default to EMP or Jamming
    soundManager.play('emp', 0.7);
    const empRange = ability === 'jamming' ? 60 : 30;
    const duration = state.selectedLegend.abilityDuration || (ability === 'jamming' ? 8000 : 5000);

    const enemies = state.enemies.map(e => {
      const dist = Math.sqrt(
        Math.pow(e.position[0] - state.playerPosition[0], 2) +
        Math.pow(e.position[2] - state.playerPosition[2], 2)
      );
      if (dist < empRange && e.state === 'active') {
        return { ...e, state: 'disabled' as EntityState, disabledUntil: now + duration, lastHitTime: now };
      }
      return e;
    });

    return { 
      enemies, 
      empCooldown: now + state.selectedLegend.abilityCooldown, 
      empActiveUntil: now + 500,
      jammingActiveUntil: ability === 'jamming' ? now + duration : 0,
      empReadyNotified: false,
      events: [...state.events, { id: Math.random().toString(), message: ability === 'jamming' ? "COMMUNICS JAMMED" : "EMP BLAST ACTIVATED", timestamp: now }]
    };
  }),

  updateObjectives: (delta) => set((state) => {
    const captureRange = 8;
    const captureSpeed = 15; // Percent per second
    const decaySpeed = 5;

    const objectives = state.objectives.map(obj => {
      const dist = Math.sqrt(
        Math.pow(obj.position[0] - state.playerPosition[0], 2) +
        Math.pow(obj.position[2] - state.playerPosition[2], 2)
      );

      const isBeingCaptured = dist < captureRange && state.playerState === 'active';
      let newProgress = obj.progress;
      let newControlledBy = obj.controlledBy;
      let newTimer = obj.timer;

      if (obj.type === 'capture') {
        if (isBeingCaptured) {
          newProgress = Math.min(100, obj.progress + captureSpeed * delta);
          if (obj.progress < 100 && newProgress >= 100) {
            state.addEvent(`${obj.label} SECURED`);
            soundManager.play('objective', 0.6);
            newControlledBy = 'player';
            
            // Narrative consequence: Gaining trust on success
            set(s => ({ 
              trustScore: Math.min(100, s.trustScore + 10),
              moralityScore: Math.min(100, s.moralityScore + 5)
            }));
            state.addVoiceLine("OISTARIAN", "Excellent work. The vault's pulse is stabilizing.");
          }
        } else if (obj.controlledBy !== 'player') {
          newProgress = Math.max(0, obj.progress - decaySpeed * delta);
        }
      } else if (obj.type === 'payload') {
        if (isBeingCaptured) {
          newProgress = Math.min(100, obj.progress + captureSpeed * delta);
          if (obj.progress < 100 && newProgress >= 100) {
            state.addEvent(`${obj.label} DELIVERED`);
            soundManager.play('objective', 0.6);
          }
        }
        if (newTimer !== undefined && newTimer > 0) {
          newTimer = Math.max(0, newTimer - delta);
          if (obj.timer! > 0 && newTimer <= 0) {
            state.addEvent(`${obj.label} MISSION FAILED`);
          }
        }
      }

      return { ...obj, isBeingCaptured, progress: newProgress, controlledBy: newControlledBy, timer: newTimer };
    });

    return { objectives };
  }),

  updateHazards: (time) => set((state) => {
    const laserInterval = 3000;
    let hazardsChanged = false;
    
    const hazards = state.hazards.map(h => {
      if (h.type === 'laser' && time - h.lastToggleTime > laserInterval) {
        hazardsChanged = true;
        return { ...h, isActive: !h.isActive, lastToggleTime: time };
      }
      return h;
    });

    // Collision detection with hazards
    const now = Date.now();
    let playerHit = false;
    const damagedEnemies: string[] = [];

    hazards.forEach(h => {
      if (!h.isActive) return;

      // Check player
      const pPos = state.playerPosition;
      const inX = pPos[0] > h.position[0] - h.size[0]/2 && pPos[0] < h.position[0] + h.size[0]/2;
      const inZ = pPos[2] > h.position[2] - h.size[2]/2 && pPos[2] < h.position[2] + h.size[2]/2;
      
      if (inX && inZ && state.playerState === 'active') {
        playerHit = true;
      }

      // Check enemies
      state.enemies.forEach(e => {
        if (e.state !== 'active') return;
        const eInX = e.position[0] > h.position[0] - h.size[0]/2 && e.position[0] < h.position[0] + h.size[0]/2;
        const eInZ = e.position[2] > h.position[2] - h.size[2]/2 && e.position[2] < h.position[2] + h.size[2]/2;
        if (eInX && eInZ) {
          damagedEnemies.push(e.id);
        }
      });
    });

    if (playerHit) {
      state.hitPlayer();
    }

    let enemies = state.enemies;
    if (damagedEnemies.length > 0) {
      enemies = state.enemies.map(e => {
        if (damagedEnemies.includes(e.id)) {
          return { ...e, state: 'disabled' as EntityState, disabledUntil: now + 3000, lastHitTime: now };
        }
        return e;
      });
    }

    return { hazards: hazardsChanged ? hazards : state.hazards, enemies };
  }),

  updatePlayerPosition: (position, rotation) => {
    const { socket } = get();
    set({ playerPosition: position, playerRotation: rotation });
    if (socket) {
      socket.emit('updatePosition', { position, rotation });
    }
  }
}));
