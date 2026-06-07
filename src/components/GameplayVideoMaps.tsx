import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize2, 
  Map, Shield, Zap, Target, Eye, Tv, Settings2, 
  Sparkles, Layers, Sliders, PlayCircle, Video, List, Info, 
  Skull, Flame, AlertCircle, RefreshCw, Navigation
} from 'lucide-react';
import { useGameStore } from '../store';

// We map custom Oistarian lore regions with corresponding tactical data and simulation videos
interface SectorMapData {
  id: string;
  name: string;
  codename: string;
  x: number; // Percent of map container width
  y: number; // Percent of map container height
  dominionControl: number; // percentage
  troopEstimate: number;
  terrainType: string;
  elevation: 'High Ground' | 'Low Plains' | 'Subterranean' | 'Zero-G';
  primaryFaction: 'Oistarian' | 'Free Concord' | 'Arcanum Circle' | 'Ironbound Clans';
  status: 'contested' | 'secured' | 'critical';
  videoUrl: string;
  briefingText: string;
  possibleRewards: string[];
}

const SECTORS: SectorMapData[] = [
  {
    id: 'sec-1',
    name: 'Aegis Frontier Base',
    codename: 'EMBERS OF RETURN',
    x: 24,
    y: 35,
    dominionControl: 45,
    troopEstimate: 1400,
    terrainType: 'Shattered Crags & Outposts',
    elevation: 'High Ground',
    primaryFaction: 'Oistarian',
    status: 'contested',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-a-cyber-city-with-neon-lights-42571-large.mp4',
    briefingText: 'Oistarian recon teams are establishing communication relays on the high-elevation crags of Aegis Frontier. Flanking routes are exposed. Secure high ground to neutralize the signal amplifiers.',
    possibleRewards: ['Ether-Core Schematic', '+300 Concord Renown', 'Titanium Hull Plate']
  },
  {
    id: 'sec-2',
    name: 'Gaza Sector Shadow Outpost',
    codename: 'OPERATION SKYFALL',
    x: 52,
    y: 48,
    dominionControl: 85,
    troopEstimate: 3800,
    terrainType: 'Dense Cyber Ruins',
    elevation: 'Low Plains',
    primaryFaction: 'Oistarian',
    status: 'critical',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-urban-landscape-at-night-with-flying-vehicles-42572-large.mp4',
    briefingText: 'Urban sprawl with nested AA batteries. Heavy Ether-powered war machines have blocked the main evacuation lines. Deploy Saboteurs to overload generator nodes and clear paths.',
    possibleRewards: ['Legendary Rifle Core', 'Orbital Strike Access', '+800 Credits']
  },
  {
    id: 'sec-3',
    name: 'Europa Deep Space Station',
    codename: 'STAR SYSTEM SURVIVAL',
    x: 78,
    y: 22,
    dominionControl: 65,
    troopEstimate: 950,
    terrainType: 'Zero-G Orbital Array',
    elevation: 'Zero-G',
    primaryFaction: 'Arcanum Circle',
    status: 'contested',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-flying-over-the-surface-of-a-planet-42574-large.mp4',
    briefingText: 'An abandoned research node holding vital ancient Star-Maps is rotating chaotically. Oxygen supply grids are collapsing due to micrometeoroid impact events.',
    possibleRewards: ['3x Star-Maps', 'Oxygen Module Upgrade', 'Arcanum Veil Device']
  },
  {
    id: 'sec-4',
    name: 'Amazonian Vault Delta',
    codename: 'RESONANCE MATRIX',
    x: 35,
    y: 72,
    dominionControl: 90,
    troopEstimate: 2100,
    terrainType: 'Bioluminescent Jungle & Sub-vats',
    elevation: 'Subterranean',
    primaryFaction: 'Oistarian',
    status: 'critical',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-dark-background-with-moving-particles-and-light-42573-large.mp4',
    briefingText: 'Extreme reality-warping anomalies detected within the subterranean extraction pipeline. Oistarian Ether-Archers are utilizing custom optical cloaks. Flanking protection is required.',
    possibleRewards: ['Quantum Resonator', 'Shadow Cloak blueprint', 'Arcane Focus-Orb']
  },
  {
    id: 'sec-5',
    name: 'Ironbound Citadel Ridge',
    codename: 'SIEGECREFT DEFENSE',
    x: 68,
    y: 65,
    dominionControl: 10,
    troopEstimate: 5000,
    terrainType: 'Volcanic Fortification',
    elevation: 'High Ground',
    primaryFaction: 'Ironbound Clans',
    status: 'secured',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-dark-background-with-moving-particles-and-light-42573-large.mp4', // Fallback loops
    briefingText: 'The Ironbound Clans stand resilient here, protected by heavy titanium armor and archaic mountain defense systems. A crucial trade and resupply checkpoint.',
    possibleRewards: ['Titan-Forged Golem Core', 'Heavy Siege Shells', 'Morale Boost Buffer']
  }
];

export const GameplayVideoMaps: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedSec, setSelectedSec] = useState<SectorMapData>(SECTORS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  
  // Custom sandbox/builder state
  const [activeIronMode, setActiveIronMode] = useState(false);
  const [activeFog, setActiveFog] = useState(true);
  const [customThreatMultiplier, setCustomThreatMultiplier] = useState(1.2);
  const [customNotes, setCustomNotes] = useState('');
  const [customConditions, setCustomConditions] = useState<string[]>(['Flanking Risk', 'Vibrational Distortions']);
  const [newConditionText, setNewConditionText] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Play/pause trigger
  const handlePlayToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Sync video slider progress
  const onTimeUpdate = () => {
    if (videoRef.current) {
      setVideoProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
    }
  };

  // Change sector resets playback
  const selectSector = (sec: SectorMapData) => {
    setSelectedSec(sec);
    setVideoProgress(0);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Toggle custom rule lists
  const addCustomCondition = () => {
    if (newConditionText.trim() && !customConditions.includes(newConditionText.trim())) {
      setCustomConditions([...customConditions, newConditionText.trim()]);
      setNewConditionText('');
    }
  };

  const removeCondition = (c: string) => {
    setCustomConditions(customConditions.filter(item => item !== c));
  };

  // Quick preset loader
  const loadPreset = (presetType: 'Oistarian_Assault' | 'Recon_Infiltration' | 'Heavy_Siege') => {
    if (presetType === 'Oistarian_Assault') {
      setActiveIronMode(true);
      setActiveFog(true);
      setCustomThreatMultiplier(2.0);
      setCustomConditions(['Ether Overdrive', 'Cloaked Attackers', 'Vanguard Suppression']);
    } else if (presetType === 'Recon_Infiltration') {
      setActiveIronMode(false);
      setActiveFog(true);
      setCustomThreatMultiplier(1.0);
      setCustomConditions(['Sensor Dampening', 'Low Visibility']);
    } else {
      setActiveIronMode(true);
      setActiveFog(false);
      setCustomThreatMultiplier(1.7);
      setCustomConditions(['Armor Piercing Rounds', 'Fixed Elevation Defenses']);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/98 flex items-center justify-center p-3 sm:p-5 backdrop-blur-2xl text-white select-none overflow-y-auto"
    >
      {/* Decorative cosmic network mesh behind */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.06)_1px,transparent_1px)] bg-[size:30px_30px]" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.4)_0%,transparent_60%)]" />

      <div className="w-full max-w-7xl h-full max-h-[92vh] bg-black border border-neutral-900 flex flex-col rounded-sm overflow-hidden relative shadow-[0_0_50px_rgba(34,211,238,0.15)]">
        {/* Futuristic Top Glowing Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-cyan-500 to-purple-600 shadow-[0_0_10px_#22d3ee]" />

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 bg-gradient-to-b from-neutral-950 to-neutral-900 border-b border-neutral-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
              <div className="text-[10px] text-red-500 font-extrabold tracking-[0.3em] uppercase">Tactical War-Theatre Controller</div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase font-display flex items-center gap-2">
              <Map className="text-cyan-400" size={24} />
              Asterion <span className="text-cyan-400">Tactical Maps [Live]</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-1">
              Interactive Blueprint Map & Cinematic Video Simulation Dashboard
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Quick Presets */}
            <div className="hidden md:flex items-center gap-1.5 bg-black/40 border border-neutral-800/80 p-1.5 rounded-sm">
              <span className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase px-2">Presets:</span>
              <button 
                onClick={() => loadPreset('Oistarian_Assault')} 
                className="text-[9px] bg-red-950/40 hover:bg-red-900/30 border border-red-900/40 text-red-400 font-black px-2 mt-0.5 py-1 uppercase rounded-sm transition-all"
              >
                Dominion Assault
              </button>
              <button 
                onClick={() => loadPreset('Recon_Infiltration')} 
                className="text-[9px] bg-cyan-950/40 hover:bg-cyan-900/30 border border-cyan-900/40 text-cyan-400 font-black px-2 mt-0.5 py-1 uppercase rounded-sm transition-all"
              >
                Silent Infilt
              </button>
              <button 
                onClick={() => loadPreset('Heavy_Siege')} 
                className="text-[9px] bg-purple-950/40 hover:bg-purple-900/30 border border-purple-900/40 text-purple-400 font-black px-2 mt-0.5 py-1 uppercase rounded-sm transition-all"
              >
                Citadel Siege
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 border.5 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900/50 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content Layout Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-12">
          
          {/* L1: Asterion Blueprint Interactive Map Grid (5 Columns) */}
          <div className="xl:col-span-5 border-b xl:border-b-0 xl:border-r border-neutral-800 p-4 flex flex-col bg-neutral-980 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                <Navigation size={12} /> Faction Territory Blueprint
              </h2>
              <span className="text-[9px] text-zinc-500 font-mono uppercase bg-neutral-900 px-2 py-0.5 border border-neutral-800">
                OISTARIAN RESURGENCE: ONGOING
              </span>
            </div>

            {/* Graphic Interactive Blueprint Map Container */}
            <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-zinc-950 to-neutral-950 border border-neutral-850 rounded-sm overflow-hidden flex items-center justify-center p-2 group shadow-inner">
              {/* Radial tactical overlay scan indicators */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,#ef4444_0%,transparent_35%)] opacity-10 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,#06b6d4_0%,transparent_40%)] opacity-15 pointer-events-none" />
              
              {/* Grid line matrix */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(ellipse at center, rgba(34,211,238,0.2) 0%, transparent 100%), linear-gradient(0deg, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 20px 20px, 20px 20px'
              }} />

              {/* Central crosshairs lines */}
              <div className="absolute w-full h-px bg-cyan-500/20 top-1/2 left-0 pointer-events-none" />
              <div className="absolute h-full w-px bg-cyan-500/20 left-1/2 top-0 pointer-events-none" />
              <div className="absolute w-24 h-24 border border-cyan-500/10 rounded-full top-[calc(50%-48px)] left-[calc(50%-48px)] pointer-events-none" />

              {/* Map Sectors Loop */}
              {SECTORS.map((sec) => {
                const isSelected = selectedSec.id === sec.id;
                const isOistarian = sec.primaryFaction === 'Oistarian';
                
                return (
                  <button
                    key={sec.id}
                    onClick={() => selectSector(sec)}
                    style={{ left: `${sec.x}%`, top: `${sec.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group/node transition-all focus:outline-none pointer-events-auto z-5"
                  >
                    {/* Ring Pulse indicators */}
                    <span className={`absolute inset-0 -m-3 rounded-full border opacity-0 group-hover/node:opacity-100 transition-all duration-700 ${
                      isOistarian ? 'border-red-500 scale-120 animate-pulse' : 'border-cyan-400 scale-120 animate-pulse'
                    }`} />

                    <div className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border shadow-md ${
                      isSelected 
                        ? (isOistarian ? 'bg-red-500 text-black border-red-300 shadow-[0_0_15px_#ef4444]' : 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_#22d3ee]')
                        : (isOistarian ? 'bg-red-950/90 text-red-400 border-red-500/45 hover:bg-red-500 hover:text-black' : 'bg-zinc-950/90 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500 hover:text-black')
                    }`}>
                      {/* Inner miniature icon */}
                      {isOistarian ? <Flame size={12} /> : <Shield size={12} />}

                      {/* Ripple point ping */}
                      {sec.status === 'critical' && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </div>

                    {/* Sector Tooltip tag on hover/selected */}
                    <div className={`absolute left-1/2 -translate-x-1/2 top-8 whitespace-nowrap px-1.5 py-0.5 rounded-sm border text-[8px] font-black uppercase tracking-wider transition-all duration-200 pointer-events-none shadow-xl ${
                      isSelected 
                        ? 'bg-neutral-900 border-yellow-500/80 text-yellow-500 scale-100 opacity-100'
                        : 'bg-black/90 border-neutral-800 text-zinc-400 scale-90 opacity-0 group-hover/node:opacity-100 group-hover/node:scale-100'
                    }`}>
                      {sec.codename}
                    </div>
                  </button>
                );
              })}

              <div className="absolute bottom-2 left-2 text-[8px] text-zinc-600 font-mono uppercase bg-black/60 px-2 py-0.5 rounded-xs border border-neutral-900">
                Quadrant Grid Reference: CR9-OISTAR
              </div>
            </div>

            {/* List Selection Items */}
            <div className="mt-4 flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                Select Stronghold Outpost Sector:
              </div>
              {SECTORS.map((sec) => {
                const isSelected = selectedSec.id === sec.id;
                const percent = sec.dominionControl;
                return (
                  <button
                    key={sec.id}
                    onClick={() => selectSector(sec)}
                    className={`w-full p-2.5 rounded-sm border text-left flex items-center justify-between transition-all duration-300 ${
                      isSelected 
                        ? 'bg-cyan-950/20 border-cyan-400 text-white shadow-inner' 
                        : 'bg-neutral-950/60 border-neutral-900 text-zinc-400 hover:border-neutral-800 hover:bg-neutral-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full ${
                        sec.status === 'secured' ? 'bg-green-500' : sec.status === 'contested' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                      }`} />
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-mono tracking-widest text-zinc-500">{sec.codename}</div>
                        <div className="text-xs font-black truncate text-white">{sec.name}</div>
                      </div>
                    </div>
                    
                    <div className="text-right pl-2 font-mono flex flex-col shrink-0">
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">Dominion Hold</span>
                      <span className={`text-[10px] font-extrabold ${percent > 70 ? 'text-red-400' : percent > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {percent}% Def
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* L2: High Fidelity Briefing Theatre & Simulated Video Player (4 Columns) */}
          <div className="xl:col-span-4 border-b xl:border-b-0 xl:border-r border-neutral-800 p-4 flex flex-col bg-neutral-990 overflow-y-auto">
            <h2 className="text-xs text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Tv size={12} className="text-red-500 animate-pulse" /> Briefing Feed Theatre
            </h2>

            {/* Framed Cyber CRT Video Viewport */}
            <div className="w-full aspect-[16/10] bg-black border border-neutral-800 rounded-sm overflow-hidden relative group shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <video
                ref={videoRef}
                src={selectedSec.videoUrl}
                className="w-full h-full object-cover grayscale opacity-80"
                onTimeUpdate={onTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                muted={isMuted}
                loop
                playsInline
              />

              {/* Scanline CRT layout */}
              <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
              <div className="absolute inset-0 pointer-events-none bg-radial-gradient" style={{
                background: 'rgba(34,211,238,0.02)',
                mixBlendMode: 'color-dodge'
              }} />

              {/* Red warning border if sector is critical */}
              {selectedSec.status === 'critical' && (
                <div className="absolute inset-0 border border-red-500/20 animate-pulse pointer-events-none" />
              )}

              {/* Status floating pills */}
              <div className="absolute top-2 left-2 flex gap-1.5 pointer-events-none">
                <div className="px-1.5 py-0.5 bg-black/85 border border-neutral-800 rounded-xs text-[7px] font-black font-mono uppercase tracking-widest flex items-center gap-1">
                  <span className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-green-400 animate-ping' : 'bg-yellow-500'}`} />
                  {isPlaying ? 'STREAM: LIVE' : 'FEED: STBY'}
                </div>
                <div className="px-1.5 py-0.5 bg-black/85 border border-neutral-800 rounded-xs text-[7px] font-black text-cyan-400 font-mono uppercase tracking-widest">
                  {selectedSec.elevation}
                </div>
              </div>

              {/* Video Interface Controller Layout overlays */}
              <div className="absolute inset-x-0 bottom-0 py-3 px-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2 opacity-100 group-hover:opacity-100 transition-opacity duration-300">
                
                {/* Horizontal Progress bar seek indicator */}
                <div className="w-full h-1 bg-red-950/40 rounded-full overflow-hidden relative group/scrub">
                  <motion.div 
                    style={{ width: `${videoProgress}%` }}
                    className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  />
                </div>

                <div className="flex justify-between items-center bg-black/20">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handlePlayToggle}
                      className="p-1 px-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded-xs transition-all cursor-pointer"
                    >
                      {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                    </button>
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1 text-zinc-400 hover:text-cyan-400 transition-all cursor-pointer"
                    >
                      {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                    </button>
                  </div>
                  <div className="text-[8px] font-mono text-zinc-500 tracking-wider">
                    {selectedSec.codename} BRIEFING_DECODE
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Intel Summary Breakdown */}
            <div className="mt-4 bg-neutral-950/50 border border-neutral-900 p-3 rounded-xs text-left grow flex flex-col justify-between font-mono gap-4">
              <div>
                <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">TACTICAL DESCRIPTION</div>
                <h3 className="text-sm font-black text-white uppercase mt-0.5 tracking-tight border-b border-neutral-900 pb-1.5">{selectedSec.name}</h3>
                <p className="text-[10px] text-zinc-400 leading-relaxed mt-2 italic font-mono pr-1">
                  "{selectedSec.briefingText}"
                </p>
              </div>

              {/* Grid with statistics */}
              <div className="grid grid-cols-2 gap-2 border-t border-neutral-900/60 pt-3">
                <div className="flex flex-col">
                  <span className="text-[8px] text-zinc-500 uppercase font-black">Hold Faction</span>
                  <span className="text-[11px] font-extrabold text-cyan-400 uppercase mt-0.5">{selectedSec.primaryFaction}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-zinc-500 uppercase font-black">Estimated Forces</span>
                  <span className="text-[11px] font-extrabold text-red-500 mt-0.5">{selectedSec.troopEstimate.toLocaleString()} Vanguard Unit</span>
                </div>
              </div>

              {/* Sector Rewards */}
              <div className="border-t border-neutral-900/60 pt-3 pr-1">
                <div className="text-[8px] text-zinc-500 font-black uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles size={9} className="text-yellow-400" /> Sector Completion Rewards
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedSec.possibleRewards.map((rew, i) => (
                    <span key={i} className="text-[8px] px-2 py-0.5 bg-neutral-900 border border-cyan-500/10 text-cyan-300 font-bold rounded-xs tracking-tight">
                      {rew}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* L3: Sandbox customizer, Faction designer, Condition generator (3 Columns) */}
          <div className="xl:col-span-3 p-4 flex flex-col bg-neutral-980 overflow-y-auto">
            <h2 className="text-xs text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Settings2 size={12} /> Sandbox condition customizer
            </h2>

            <div className="flex flex-col gap-4 font-mono">
              
              {/* Oistarian tactical parameters */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3.5 rounded-sm flex flex-col gap-3">
                <div className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wide border-b border-neutral-900 pb-1 flex justify-between items-center">
                  <span>Battle Modifiers</span>
                  <Sliders size={10} className="text-cyan-500" />
                </div>

                {/* Switch for Iron war mode */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-300 uppercase">Iron War Mode</span>
                    <span className="text-[8px] text-zinc-600 font-bold uppercase mt-0.5">Permanent Unit Death</span>
                  </div>
                  <button 
                    onClick={() => setActiveIronMode(!activeIronMode)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all outline-none ${activeIronMode ? 'bg-red-500' : 'bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${activeIronMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Switch for Fog of War */}
                <div className="flex items-center justify-between border-t border-neutral-900/40 pt-2.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-300 uppercase">Tactical Fog of War</span>
                    <span className="text-[8px] text-zinc-600 font-bold uppercase mt-0.5">Cloak Oistarian Scou</span>
                  </div>
                  <button 
                    onClick={() => setActiveFog(!activeFog)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all outline-none ${activeFog ? 'bg-cyan-500' : 'bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${activeFog ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Threat Multiplier Slider with visual text feedback */}
                <div className="flex flex-col gap-1.5 border-t border-neutral-900/40 pt-2.5">
                  <div className="flex justify-between items-end text-[8px] font-black uppercase text-zinc-400">
                    <span>Threat multiplier parameter</span>
                    <span className={`text-[10px] ${customThreatMultiplier > 1.6 ? 'text-red-400 animate-pulse font-black' : 'text-cyan-400'}`}>
                      {customThreatMultiplier.toFixed(1)}x Hazard
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1.0" 
                    max="2.5" 
                    step="0.1" 
                    value={customThreatMultiplier}
                    onChange={(e) => setCustomThreatMultiplier(parseFloat(e.target.value))}
                    className="w-full h-1 bg-neutral-800 rounded-sm appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Create Custom Battlefield Conditions Section */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3.5 rounded-sm flex flex-col gap-2.5">
                <div className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wide border-b border-neutral-900 pb-1.5 flex justify-between items-center">
                  <span>Custom Battlefield Conditions</span>
                  <Layers size={10} className="text-zinc-500" />
                </div>

                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {customConditions.map((cond, i) => (
                    <span 
                      key={i} 
                      className="text-[8px] bg-red-950/25 border border-red-900/40 text-red-300 font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 mr-0.5 mb-1"
                    >
                      {cond}
                      <button 
                        onClick={() => removeCondition(cond)} 
                        className="hover:text-white text-[7px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {customConditions.length === 0 && (
                    <span className="text-[8px] italic text-zinc-600 font-bold uppercase py-1">No custom conditions loaded.</span>
                  )}
                </div>

                <div className="flex gap-1.5 mt-1 border-t border-neutral-900/40 pt-2">
                  <input
                    type="text"
                    value={newConditionText}
                    onChange={(e) => setNewConditionText(e.target.value)}
                    placeholder="E.g. Ether-Storm, Sandstorm..."
                    className="flex-1 bg-black text-[10px] text-zinc-200 border border-neutral-800 focus:border-cyan-500/60 p-1.5 rounded-xs focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomCondition();
                    }}
                  />
                  <button
                    onClick={addCustomCondition}
                    className="bg-cyan-500 text-black text-[9px] font-black px-2.5 rounded-xs hover:bg-white transition-all uppercase tracking-wider"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Campaign Notes & Deployment Logger */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3.5 rounded-sm flex flex-col gap-2">
                <div className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wide">
                  Commander Deployment Logs
                </div>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Record tactical advice, strategic troop patterns, or notes for subsequent missions..."
                  className="w-full bg-black border border-neutral-800 rounded-sm text-[9pt] p-2 text-zinc-300 h-20 custom-scrollbar focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              {/* Action Run Module Button */}
              <button
                id="sandbox-deploy-button"
                onClick={() => {
                  useGameStore.getState().addVoiceLine("NEXUS ONE", `Sandbox parameters dispatched. Threat Level ${customThreatMultiplier.toFixed(1)}x verified. Standby for warp vectors.`);
                  onClose();
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-xs shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all cursor-pointer text-center"
              >
                🧬 DEPLOY SANDBOX CONDITIONS
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
