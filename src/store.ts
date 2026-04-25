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

export interface Mission {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  environment: string;
  enemies: EnemyType[];
  triggers: Record<string, Trigger>;
}

export const MISSIONS: Mission[] = [
  {
    id: "vault_breathes",
    title: "THE VAULT BREATHES",
    description: "Navigate the pulse-reactive corridors of the Eden Vault.",
    objectives: ["Navigate corridors", "Disable AI sentinels"],
    environment: "Pulse-reactive corridors",
    enemies: ["ghost", "standard"],
    triggers: {
      betrayal: {
        condition: (state) => state.trustScore < 60,
        effect: (state) => {
          const squad = state.squad.map(m => 
            m.name === "Echo Vanguard" ? { ...m, status: "Compromised" as const } : m
          );
          return { squad };
        }
      }
    }
  }
];

export interface LegendData {
  id: string;
  name: string;
  description: string;
  speed: number;
  dashCooldown: number;
  abilityCooldown: number;
  abilityDuration?: number;
  specialAbility: 'emp' | 'overdrive' | 'stealth' | 'shield' | 'jamming' | 'breach';
  rarity: 'common' | 'rare' | 'epic';
}

export const LEGENDS: LegendData[] = [
  { 
    id: 'titan', 
    name: 'Titan', 
    description: 'Heavy assault unit with tactical EMP suppression.', 
    speed: 1, 
    dashCooldown: 2000, 
    abilityCooldown: 15000, 
    specialAbility: 'emp',
    rarity: 'common'
  },
  { 
    id: 'stryker', 
    name: 'Stryker', 
    description: 'High-mobility skirmisher with Overdrive hyper-fire.', 
    speed: 1.4, 
    dashCooldown: 1200, 
    abilityCooldown: 12000, 
    specialAbility: 'overdrive',
    rarity: 'epic'
  },
  {
    id: 'nasser',
    name: 'Ahmed Nasser',
    description: 'Recon & Surveillance. Expertise in comms jamming and stealth reconnaissance.',
    speed: 1.2,
    dashCooldown: 1500,
    abilityCooldown: 14000,
    specialAbility: 'jamming',
    rarity: 'rare'
  },
  {
    id: 'varga',
    name: 'Sofia Varga',
    description: 'Intelligence field operative. Masters signal interception and cyber infiltration.',
    speed: 1.1,
    dashCooldown: 1800,
    abilityCooldown: 13000,
    specialAbility: 'emp',
    rarity: 'epic'
  },
  {
    id: 'tank_brooks',
    name: 'Darnell Brooks',
    description: 'Heavy Assault & Breach. Urban warfare veteran known for tactical demolition.',
    speed: 0.9,
    dashCooldown: 2500,
    abilityCooldown: 16000,
    specialAbility: 'breach',
    rarity: 'rare'
  },
  {
    id: 'toma',
    name: 'Elira Toma',
    description: 'Long-Range Recon & Survival. Expert tracker raised in remote highlands.',
    speed: 1.3,
    dashCooldown: 1300,
    abilityCooldown: 11000,
    specialAbility: 'stealth',
    rarity: 'rare'
  },
  {
    id: 'ramires',
    name: 'Kael Ramires',
    description: 'Experimental Bio-Tech unit with enhanced neural combant interface.',
    speed: 1.5,
    dashCooldown: 1000,
    abilityCooldown: 18000,
    specialAbility: 'overdrive',
    rarity: 'epic'
  },
  {
    id: 'thorne',
    name: 'Malrik Thorne',
    description: 'Crimson Vow Ritualist. Master of oathblade discipline and combat meditation.',
    speed: 1.1,
    dashCooldown: 1600,
    abilityCooldown: 12000,
    specialAbility: 'shield',
    rarity: 'epic'
  },
  {
    id: 'nyx',
    name: 'Nyx',
    description: 'Echo Syndicate Cipher. Operates with digital cloaking and neural disruption.',
    speed: 1.2,
    dashCooldown: 1400,
    abilityCooldown: 15000,
    specialAbility: 'jamming',
    rarity: 'epic'
  },
  {
    id: 'moss',
    name: 'Kaela Moss',
    description: 'Verdant Pact Warden. Expert in terrain adaptation and biotech fieldcraft.',
    speed: 1.2,
    dashCooldown: 1500,
    abilityCooldown: 13000,
    specialAbility: 'stealth',
    rarity: 'rare'
  },
  {
    id: 'vex_9',
    name: 'Vex-9',
    description: 'Iron Dominion Enforcer. Cybernetic heavy assault with reinforced exo-frame.',
    speed: 0.85,
    dashCooldown: 3000,
    abilityCooldown: 20000,
    specialAbility: 'shield',
    rarity: 'epic'
  },
  {
    id: 'cohen',
    name: 'Eli Cohen',
    description: 'Combat Engineer. Specialist in field construction and signal jamming fortifications.',
    speed: 1.0,
    dashCooldown: 2000,
    abilityCooldown: 15000,
    specialAbility: 'jamming',
    rarity: 'rare'
  },
  {
    id: 'avraham',
    name: 'Ben Avraham',
    description: 'Underwater Engineer. Expert in maritime infiltration and high-pressure salvage.',
    speed: 1.1,
    dashCooldown: 1800,
    abilityCooldown: 12000,
    specialAbility: 'stealth',
    rarity: 'rare'
  },
  {
    id: 'mor',
    name: 'Eliya Mor',
    description: 'Medical Logistics & Triage. Expert in field evacuation planning and supply routing.',
    speed: 1.1,
    dashCooldown: 1800,
    abilityCooldown: 14000,
    specialAbility: 'shield',
    rarity: 'rare'
  },
  {
    id: 'rosenfeld',
    name: 'Hannah Rosenfeld',
    description: 'Sniper & Overwatch. Precision marksman specialized in waterline concealment and long-range optics.',
    speed: 1.0,
    dashCooldown: 2200,
    abilityCooldown: 16000,
    specialAbility: 'stealth',
    rarity: 'epic'
  },
  {
    id: 'farouk',
    name: 'Leila Farouk',
    description: 'Sniper/Spotter. Precision shooter with advanced camouflage specialties and long-range metrics.',
    speed: 1.0,
    dashCooldown: 2200,
    abilityCooldown: 16000,
    specialAbility: 'stealth',
    rarity: 'rare'
  },
  {
    id: 'hadid',
    name: 'Noor Hadid',
    description: 'Diver & EOD Technician. Specialist in underwater breaching and explosive ordnance neutralization.',
    speed: 1.1,
    dashCooldown: 1700,
    abilityCooldown: 13000,
    specialAbility: 'breach',
    rarity: 'epic'
  },
  {
    id: 'qadri',
    name: 'Omar Qadri',
    description: 'RSO (Range Safety Officer). Former range master, calm under pressure. Expert in safety protocols and supervised field operations.',
    speed: 1.0,
    dashCooldown: 2000,
    abilityCooldown: 16000,
    specialAbility: 'shield',
    rarity: 'rare'
  },
  {
    id: 'saban',
    name: 'Raya Saban',
    description: 'Diver Captain & Mobility Lead. Experienced dive team lead specializing in team safety and surface-swim logistics.',
    speed: 1.4,
    dashCooldown: 1200,
    abilityCooldown: 14000,
    specialAbility: 'overdrive',
    rarity: 'epic'
  },
  {
    id: 'ben_ami',
    name: 'Sara Ben-Ami',
    description: 'Combat Medic. Marines medical corps veteran with expertise in rapid-water extraction and field medevac.',
    speed: 1.1,
    dashCooldown: 1800,
    abilityCooldown: 15000,
    specialAbility: 'shield',
    rarity: 'rare'
  },
  {
    id: 'rubin',
    name: 'Yonina Rubin',
    description: 'EOD Specialist. Expert in underwater explosives risk and remote detonation protocols.',
    speed: 0.95,
    dashCooldown: 2200,
    abilityCooldown: 18000,
    specialAbility: 'breach',
    rarity: 'epic'
  },
  {
    id: 'petrova',
    name: 'Anya Petrova',
    description: 'Former elite guard with enhanced defensive capabilities. Operates with advanced Kinetic Barrier technology.',
    speed: 1.0,
    dashCooldown: 2000,
    abilityCooldown: 15000,
    abilityDuration: 5000,
    specialAbility: 'shield',
    rarity: 'epic'
  }
];

export interface EnemyData {
  id: string;
  position: [number, number, number];
  state: EntityState;
  disabledUntil: number;
  type: EnemyType;
  lastHitTime: number; // For visual hit flash
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
  activeVoiceLines: VoiceLine[];
  setTrustScore: (score: number) => void;
  setMoralityScore: (score: number) => void;
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
  { id: 'bot-1', position: [40, 1, 40], state: 'active', disabledUntil: 0, type: 'scout', lastHitTime: 0 },
  { id: 'bot-2', position: [-40, 1, 40], state: 'active', disabledUntil: 0, type: 'tank', lastHitTime: 0 },
  { id: 'bot-3', position: [40, 1, -40], state: 'active', disabledUntil: 0, type: 'sniper', lastHitTime: 0 },
  { id: 'bot-4', position: [-40, 1, -40], state: 'active', disabledUntil: 0, type: 'standard', lastHitTime: 0 },
  { id: 'bot-5', position: [0, 1, 60], state: 'active', disabledUntil: 0, type: 'ghost', lastHitTime: 0 },
  { id: 'bot-6', position: [0, 1, -60], state: 'active', disabledUntil: 0, type: 'ghost', lastHitTime: 0 },
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
  activeVoiceLines: [],

  setTrustScore: (trustScore) => set({ trustScore }),
  setMoralityScore: (moralityScore) => set({ moralityScore }),
  
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
  setSelectedLegend: (selectedLegend) => set({ selectedLegend }),
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
      enemies: INITIAL_ENEMIES.map(e => ({ ...e, state: 'active', disabledUntil: 0 })),
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

    return {
      playerState: 'disabled',
      playerDisabledUntil: Date.now() + 3000,
      score: Math.max(0, state.score - 50),
      lastDamageTime: Date.now(),
      trustScore: newTrust
    };
  }),

  hitEnemy: (id, byPlayer = false) => set((state) => {
    if (state.gameState !== 'playing') return state;
    
    // Check if it's a multiplayer player
    if (state.socket && state.otherPlayers[id]) {
      state.socket.emit('hitPlayer', id);
      return state;
    }

    const enemies = state.enemies.map(e => {
      if (e.id === id && e.state === 'active') {
        if (e.isShielded) {
          soundManager.play('shoot', 0.2); // Shield hit sound
          return e;
        }
        soundManager.play('enemy_death', 0.4);
        let disableDuration = 3000;
        if (e.type === 'tank') disableDuration = 5000;
        if (e.type === 'scout') disableDuration = 2000;
        
        return { ...e, state: 'disabled' as EntityState, disabledUntil: Date.now() + disableDuration, lastHitTime: Date.now() };
      }
      return e;
    });
    const scoreGain = byPlayer ? Math.round(100 * (state.selectedWeapon.baseDamage / 25)) : 0;
    return {
      enemies,
      score: state.score + scoreGain,
      lastHitTime: byPlayer ? Date.now() : state.lastHitTime,
      events: byPlayer ? [...state.events, { id: Math.random().toString(), message: `TARGET NEUTRALIZED (+${scoreGain})`, timestamp: Date.now() }] : state.events
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
        return { ...e, state: 'active' as EntityState, isShielded: false, isBoosting: false };
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
      return { enemies, playerState: 'active', otherPlayers: playersChanged ? otherPlayers : state.otherPlayers };
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
            set(s => ({ trustScore: Math.min(100, s.trustScore + 10) }));
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
