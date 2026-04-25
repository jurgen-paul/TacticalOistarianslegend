/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo } from 'react';
import { Game } from './components/Game';
import { MobileControls } from './components/MobileControls';
import { useGameStore, ATTACHMENTS, AttachmentType, Attachment, LEGENDS, WEAPONS } from './store';
import { Relic } from './services/fusionEngine';
import { RelicCodex } from './components/RelicCodex';
import { Minimap } from './components/Minimap';
import { getStrategicAdvice } from './lib/gemini';

function HUD() {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const timeLeft = useGameStore(state => state.timeLeft);
  const playerState = useGameStore(state => state.playerState);
  const otherPlayers = useGameStore(state => state.otherPlayers);
  const events = useGameStore(state => state.events);
  const playerCount = Object.keys(otherPlayers).length + 1;
  const leaveGame = useGameStore(state => state.leaveGame);
  const isMobile = useIsMobile();
  const lastHitTime = useGameStore(state => state.lastHitTime);
  const lastDamageTime = useGameStore(state => state.lastDamageTime);
  const dashCooldown = useGameStore(state => state.dashCooldown);
  const empCooldown = useGameStore(state => state.empCooldown);
  const objectives = useGameStore(state => state.objectives);
  const currentMission = useGameStore(state => state.currentMission);
  const trustScore = useGameStore(state => state.trustScore);
  const moralityScore = useGameStore(state => state.moralityScore);
  const squad = useGameStore(state => state.squad);
  const activeVoiceLines = useGameStore(state => state.activeVoiceLines);
  const selectedLegend = useGameStore(state => state.selectedLegend);
  const selectedWeapon = useGameStore(state => state.selectedWeapon);
  const plasmaCharge = useGameStore(state => state.plasmaCharge);

  const playerHealth = useGameStore(state => state.playerHealth);
  const playerMaxHealth = useGameStore(state => state.playerMaxHealth);

  const [showHitMarker, setShowHitMarker] = useState(false);
  const [showDamageFlash, setShowDamageFlash] = useState(false);

  useEffect(() => {
    if (lastHitTime > 0) {
      setShowHitMarker(true);
      const timer = setTimeout(() => setShowHitMarker(false), 150);
      return () => clearTimeout(timer);
    }
  }, [lastHitTime]);

  useEffect(() => {
    if (lastDamageTime > 0) {
      setShowDamageFlash(true);
      const timer = setTimeout(() => setShowDamageFlash(false), 200);
      return () => clearTimeout(timer);
    }
  }, [lastDamageTime]);

  useEffect(() => {
    if (gameState === 'playing' && currentMission?.id === 'eden_surge') {
      const dialogueTimer = setTimeout(() => {
        useGameStore.getState().addVoiceLine("OISTARIAN", "This place remembers more than it should.");
        setTimeout(() => {
          useGameStore.getState().addVoiceLine("ECHO VANGUARD", "I feel the pulse... It's reacting to us.");
        }, 3000);
      }, 5000);
      return () => clearTimeout(dialogueTimer);
    }
  }, [gameState, currentMission]);

  const leaderboard = useMemo(() => {
    const players = [
      { id: 'You', score: score, isMe: true },
      ...Object.values(otherPlayers).map(p => ({
        id: p.name,
        score: p.score,
        isMe: false
      }))
    ];
    return players.sort((a, b) => b.score - a.score);
  }, [score, otherPlayers]);

  return (
    <>
      {/* NPC/Dialogue Overlay */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20">
        {activeVoiceLines.map((v, i) => (
          <div 
            key={v.id} 
            className="bg-black/60 border-l-2 border-cyan-400 p-3 max-w-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ opacity: 1 - (i * 0.3) }}
          >
            <div className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.2em] mb-1">{v.speaker}</div>
            <div className="text-sm text-cyan-100/90 leading-tight font-accent italic">"{v.line}"</div>
          </div>
        ))}
      </div>

      {/* Damage Flash */}
      <div className={`absolute inset-0 bg-red-500/20 pointer-events-none transition-opacity duration-200 ${showDamageFlash ? 'opacity-100' : 'opacity-0'}`} />

      {/* Crosshair */}
      {/* HUD Right - Status & Inventory */}
      <div className="absolute top-4 right-4 flex flex-col gap-4 pointer-events-none items-end">
        <div className="bg-black/40 border-r-2 border-cyan-400 p-3 backdrop-blur-sm w-64 text-right">
          <div className="text-cyan-400/50 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Neural Link Status</div>
          
          <div className="flex flex-col gap-3">
            {/* Trust Meter */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[8px] font-bold uppercase">
                <span className="text-cyan-700">Team Trust</span>
                <span className={trustScore < 60 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}>{trustScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-cyan-950/40 rounded-full overflow-hidden border border-cyan-500/10">
                <div 
                  className={`h-full transition-all duration-500 ${trustScore < 60 ? 'bg-red-500' : 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]'}`}
                  style={{ width: `${trustScore}%` }} 
                />
              </div>
            </div>

            {/* Morality Meter */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[8px] font-bold uppercase">
                <span className="text-cyan-700">Tactical Morality</span>
                <span className="text-cyan-400">{moralityScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-cyan-950/40 rounded-full overflow-hidden border border-cyan-500/10">
                <div 
                  className="h-full bg-white/40 transition-all duration-500 shadow-[0_0_5px_rgba(255,255,255,0.3)]"
                  style={{ width: `${moralityScore}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-900/30 flex justify-between items-center">
            <div className="text-[8px] font-black text-cyan-600 uppercase">Resonance</div>
            <div className={`text-[9px] font-bold uppercase ${currentMission?.resonanceUnlocked ? 'text-green-400' : 'text-cyan-900'}`}>
              {currentMission?.resonanceUnlocked ? 'SURGE ACTIVE' : 'LOCKED'}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className="relative">
          <div className={`w-8 h-8 border border-cyan-500/30 rounded-full flex items-center justify-center ${playerState === 'disabled' ? 'border-red-500' : ''}`}>
            <div className={`w-4 h-4 border-t border-l border-cyan-400 ${playerState === 'disabled' ? 'border-red-500' : ''}`} />
          </div>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-0.5 rounded-full ${playerState === 'disabled' ? 'bg-red-500' : 'bg-cyan-400'}`} />
          
          {/* Hit Marker */}
          {showHitMarker && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 pointer-events-none">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white rotate-45" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -rotate-45" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -rotate-45" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white rotate-45" />
            </div>
          )}
        </div>
        {!isMobile && <div className="mt-6 text-cyan-400/30 text-[8px] tracking-[0.4em] font-bold uppercase">Targeting Active</div>}
      </div>

      {/* HUD Left - Minimap, Score & Leaderboard */}
      <div className="absolute top-4 left-4 flex flex-col gap-4 pointer-events-none">
        <Minimap />
        
        <div className="flex gap-2">
          <div className="bg-black/40 border-l-2 border-cyan-500 p-2 backdrop-blur-sm">
            <div className="text-cyan-500/50 text-[10px] font-bold tracking-widest uppercase mb-1">Efficiency</div>
            <div className="text-cyan-400 text-2xl font-black tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              {score.toString().padStart(5, '0')}
            </div>
          </div>

          <div className="bg-black/40 border-l-2 border-red-500 p-2 backdrop-blur-sm flex-1 min-w-[120px]">
             <div className="text-red-500/50 text-[10px] font-bold tracking-widest uppercase mb-1 flex justify-between">
                <span>Vitality</span>
                <span>{playerHealth} / {playerMaxHealth}</span>
             </div>
             <div className="h-6 w-full bg-red-950/20 relative overflow-hidden border border-red-500/10">
                <div 
                  className={`h-full transition-all duration-300 ${playerHealth / playerMaxHealth > 0.3 ? 'bg-red-500' : 'bg-red-600 animate-pulse'}`}
                  style={{ width: `${(playerHealth / playerMaxHealth) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-full h-[1px] bg-white/5" />
                </div>
             </div>
          </div>
        </div>
        
        {!isMobile && (
          <div className="bg-black/40 border border-cyan-900/30 p-3 rounded-sm w-56 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2 border-b border-cyan-900/30 pb-1">
              <div className="text-cyan-400/50 text-[10px] font-bold tracking-widest uppercase">Legend Rankings</div>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1.5">
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`flex justify-between items-center text-[10px] ${p.isMe ? 'text-cyan-400 font-bold' : 'text-cyan-400/60'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-900 w-3">{i + 1}</span>
                    <span className="uppercase truncate w-24">{p.id}</span>
                  </div>
                  <span className="tabular-nums">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* HUD Top Center - Objectives */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none">
        {objectives.map(obj => (
          <div key={obj.id} className="flex flex-col items-center gap-1 bg-black/20 p-2 rounded-sm backdrop-blur-[2px] border border-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 ${obj.isBeingCaptured ? 'text-cyan-400 animate-pulse' : 'text-cyan-400/60'}`}>
                {obj.type === 'capture' && (
                  <div className={`w-2 h-2 rounded-full ${obj.controlledBy === 'player' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-cyan-900'}`} />
                )}
                {obj.label}
              </div>
              
              {obj.timer !== undefined && (
                <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm ${obj.timer < 30 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-cyan-500/10 text-cyan-400'}`}>
                  {Math.floor(obj.timer / 60)}:{(Math.floor(obj.timer) % 60).toString().padStart(2, '0')}
                </div>
              )}

              <div className="text-[10px] font-mono text-cyan-400/40">
                {Math.floor(obj.progress)}%
              </div>
            </div>
            
            <div className="w-56 h-1 bg-cyan-900/20 rounded-full overflow-hidden border border-cyan-500/10 relative">
              <div 
                className={`h-full transition-all duration-300 ${obj.controlledBy === 'player' ? 'bg-green-400' : (obj.progress >= 100 ? 'bg-green-400/50' : 'bg-cyan-400')}`}
                style={{ width: `${obj.progress}%` }} 
              />
              {obj.isBeingCaptured && (
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              )}
            </div>
            
            {obj.type === 'capture' && (
              <div className={`text-[8px] font-bold uppercase tracking-[0.2em] ${obj.controlledBy === 'player' ? 'text-green-500/50' : 'text-cyan-900'}`}>
                {obj.controlledBy === 'player' ? 'Sector Secured' : 'Unclaimed Sector'}
              </div>
            )}
            {obj.type === 'payload' && (
              <div className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-[0.2em]">
                {obj.progress >= 100 ? 'Payload Delivered' : 'Escort in Progress'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* HUD Right - Time, Leave, Events, Squad */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-3 pointer-events-auto">
        {gameState === 'playing' && (
          <div className="flex flex-col gap-3">
            {/* Mission Intel */}
            {currentMission && (
              <div className="bg-black/40 border-r-2 border-cyan-500 p-3 backdrop-blur-sm text-right w-64">
                <div className="text-cyan-500/50 text-[10px] font-bold tracking-widest uppercase mb-1">Current Sector</div>
                <div className="text-white text-lg font-black tracking-tighter uppercase mb-2 font-display">{currentMission.title}</div>
                <div className="space-y-1">
                  {currentMission.objectives.map((obj, i) => (
                    <div key={i} className="flex justify-end items-center gap-2 text-[8px] text-cyan-400 font-bold uppercase tracking-widest">
                      {obj} <div className="w-1 h-1 bg-cyan-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tactical Calibration */}
            <div className="bg-black/40 border-r-2 border-purple-500 p-3 backdrop-blur-sm text-right w-64">
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col items-end">
                  <div className="text-purple-400/50 text-[8px] font-bold uppercase tracking-widest">Trust Index</div>
                  <div className="text-purple-400 text-sm font-black font-display">{trustScore}%</div>
                </div>
                <div className="flex flex-col items-end border-r border-cyan-500/20 pr-2">
                  <div className="text-cyan-400/50 text-[8px] font-bold uppercase tracking-widest">Morality Score</div>
                  <div className="text-cyan-400 text-sm font-black font-display">{moralityScore}</div>
                </div>
              </div>
              <div className="h-0.5 bg-white/5 w-full relative">
                 <div className="h-full bg-purple-500/50 absolute right-0 transition-all duration-1000" style={{ width: `${trustScore}%` }} />
              </div>
            </div>

            {/* Squad Pulse */}
            <div className="bg-black/40 border-r-2 border-cyan-900/30 p-2 backdrop-blur-sm w-64 space-y-2">
              {squad.map(member => (
                <div key={member.name} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="text-[9px] text-cyan-100/70 font-black uppercase tracking-widest">{member.name}</div>
                    <div className={`text-[7px] font-bold uppercase ${member.status === 'Compromised' ? 'text-red-500' : 'text-cyan-500'}`}>
                      {member.status}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-1.5 h-3 ${i < Math.floor(member.morale / 20) ? 'bg-cyan-400' : 'bg-cyan-950'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-black/40 border-r-2 border-cyan-500 p-2 backdrop-blur-sm text-right">
              <div className="text-cyan-500/50 text-[10px] font-bold tracking-widest uppercase mb-1">Mission Clock</div>
              <div className="text-cyan-400 text-2xl font-black tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                {Math.floor(timeLeft / 60)}:{(Math.floor(timeLeft) % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={leaveGame}
            className="px-3 py-1.5 bg-red-500/5 border border-red-500/40 text-red-500 text-[10px] font-bold tracking-widest rounded-sm hover:bg-red-500 hover:text-black transition-all duration-200 uppercase"
          >
            Abort
          </button>
        </div>

        {/* Event Log */}
        <div className="mt-4 flex flex-col items-end gap-1.5 pointer-events-none max-w-xs">
          {events.slice(-4).map(event => (
            <div key={event.id} className="text-[9px] font-bold text-cyan-400 bg-cyan-950/20 px-2 py-1 border-r border-cyan-500/50 backdrop-blur-sm animate-in fade-in slide-in-from-right-2 duration-300">
              <span className="text-cyan-900 mr-2">[{new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              {event.message.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* HUD Bottom Right - Abilities */}
      <div className="absolute bottom-4 right-4 flex gap-6 pointer-events-none items-end">
        {/* Plasma Charge Indicator */}
        {selectedWeapon.id === 'plasma_rifle' && (
          <div className="flex flex-col items-end gap-1">
            <div className="text-[8px] text-purple-500 font-bold uppercase tracking-widest">Plasma Core</div>
            <div className="w-24 h-2 bg-black/40 border border-purple-500/20 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-purple-500 transition-all duration-100" 
                style={{ width: `${plasmaCharge * 100}%`, boxShadow: plasmaCharge > 0.9 ? '0 0 10px #ff00ff' : 'none' }} 
              />
            </div>
          </div>
        )}

        <div className="flex flex-col items-end gap-1">
          <div className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-widest">Tactical Dash [Shift]</div>
          <div className="w-24 h-1 bg-cyan-900/30 rounded-full overflow-hidden border border-cyan-500/20">
            <div 
              className="h-full bg-cyan-400 transition-all duration-100" 
              style={{ width: `${Math.max(0, Math.min(100, (1 - (Math.max(0, dashCooldown - Date.now()) / selectedLegend.dashCooldown)) * 100))}%` }} 
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-widest">
            {selectedLegend.specialAbility === 'overdrive' ? 'Hyper-Charge [E]' : 'EMP Blast [E]'}
          </div>
          <div className="w-24 h-1 bg-cyan-900/30 rounded-full overflow-hidden border border-cyan-500/20">
            <div 
              className={`h-full transition-all duration-100 ${selectedLegend.specialAbility === 'overdrive' ? 'bg-purple-500' : 'bg-cyan-400'}`} 
              style={{ width: `${Math.max(0, Math.min(100, (1 - (Math.max(0, empCooldown - Date.now()) / selectedLegend.abilityCooldown)) * 100))}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Connection Info */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/40 px-2 py-1 border border-cyan-900/30 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <div className="text-cyan-500/50 text-[8px] font-bold tracking-widest uppercase">
            Nexus Link: Stable
          </div>
        </div>
        <div className="text-cyan-400/30 text-[8px] font-bold tracking-widest uppercase">
          Active Legends: {playerCount}
        </div>
      </div>

      {/* Damage Overlay */}
      {playerState === 'disabled' && (
        <div className="absolute inset-0 bg-red-500/20 pointer-events-none flex items-center justify-center">
          <div className="text-red-500 text-4xl md:text-6xl font-black tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse text-center">
            SYSTEM DISABLED
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {isMobile && gameState === 'playing' && <MobileControls />}
    </>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return uaMatch || coarsePointer || window.innerWidth < 768;
  });

  useEffect(() => {
    const check = () => {
      const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setIsMobile(uaMatch || coarsePointer || window.innerWidth < 768);
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

export default function App() {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const startGame = useGameStore(state => state.startGame);
  const weaponAttachments = useGameStore(state => state.weaponAttachments);
  const setAttachment = useGameStore(state => state.setAttachment);
  const selectedLegend = useGameStore(state => state.selectedLegend);
  const setSelectedLegend = useGameStore(state => state.setSelectedLegend);
  const selectedWeapon = useGameStore(state => state.selectedWeapon);
  const setWeapon = useGameStore(state => state.setWeapon);
  const isMobile = useIsMobile();
  const [showCustomization, setShowCustomization] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [showFusionLab, setShowFusionLab] = useState(false);
  const [selectedRelicA, setSelectedRelicA] = useState<string | null>(null);
  const [selectedRelicB, setSelectedRelicB] = useState<string | null>(null);

  const relics = useGameStore(state => state.relics);
  const relicCodex = useGameStore(state => state.relicCodex);
  const fuseRelics = useGameStore(state => state.fuseRelics);
  const fusionHistory = useGameStore(state => state.fusionHistory);

  const handleFusion = () => {
    if (selectedRelicA && selectedRelicB) {
      fuseRelics(selectedRelicA, selectedRelicB);
      setSelectedRelicA(null);
      setSelectedRelicB(null);
    }
  };

  const consultAdvisor = async (playstyle: string) => {
    setIsConsulting(true);
    const advice = await getStrategicAdvice(playstyle);
    setAiAdvice(advice);
    setIsConsulting(false);
  };

  const [rarityFilter, setRarityFilter] = useState<'platinum' | 'silver'>('platinum');
  const filteredLegends = useMemo(() => LEGENDS.filter(l => l.rarity === rarityFilter), [rarityFilter]);

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden font-mono select-none">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Game />
      </div>

      {/* UI Overlay */}
      {gameState === 'playing' && <HUD />}

      {/* Fusion Laboratory Overlay */}
      {showFusionLab && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center p-8 custom-scrollbar overflow-y-auto">
          <div className="w-full max-w-6xl flex flex-col items-center">
            <div className="flex justify-between w-full items-center mb-12 border-b border-cyan-500/20 pb-4">
              <div>
                <h2 className="text-4xl font-black text-white font-display tracking-tighter">RELIC <span className="text-cyan-400">COMMAND</span></h2>
                <p className="text-cyan-500/50 text-[10px] font-bold uppercase tracking-widest">NEXUS ONE ARCHIVE ENGINE</p>
              </div>
              <button 
                onClick={() => setShowFusionLab(false)}
                className="text-cyan-400 hover:text-white transition-colors uppercase text-sm font-bold tracking-widest border border-cyan-400/30 px-4 py-2"
              >
                Back to Command
              </button>
            </div>

            <RelicCodex />
          </div>
        </div>
      )}

      {/* Menus */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 pointer-events-auto">
          <div className="flex flex-col items-center w-full max-w-4xl max-h-[85vh] overflow-y-auto px-4 py-8 custom-scrollbar">
            <div className="mb-12 flex flex-col items-center">
              <div className="text-cyan-500 text-xs tracking-[0.5em] font-bold mb-2 animate-pulse">SYSTEM STATUS: READY</div>
              <h1 className="text-6xl md:text-8xl font-black text-white mb-2 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tracking-tighter text-center font-display">
                TACTICAL <span className="text-cyan-400">LEGENDS</span>
              </h1>
              <div className="text-cyan-400/50 text-sm tracking-widest font-bold font-accent">RISE OF OISTARIAN</div>
            </div>

            {/* Mission Trailer Section */}
            <div className="w-full mb-16">
              <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-[0.4em] mb-6 flex items-center gap-4 justify-center font-display">
                <div className="h-px bg-cyan-500/20 flex-1" />
                Mission Preview
                <div className="h-px bg-cyan-500/20 flex-1" />
              </h3>
              <div className="aspect-video w-full bg-black border-2 border-cyan-500/30 rounded-sm overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.1)] relative group">
                <iframe 
                  className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ&controls=0&modestbranding=1" 
                  title="Tactical Legends Trailer"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                />
                <div className="absolute inset-0 pointer-events-none border-[12px] border-black/50" />
                <div className="absolute top-4 left-4 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/30 px-2 py-1 text-[8px] text-cyan-400 font-bold uppercase tracking-widest">
                  Live Feed: Sector 7
                </div>
              </div>
            </div>

            {/* Rarity Filter */}
            <div className="flex gap-4 mb-8">
              {(['platinum', 'silver'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className={`px-8 py-2 border text-xs font-black uppercase tracking-[0.3em] transition-all ${
                    rarityFilter === r 
                      ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                      : 'bg-transparent text-cyan-900 border-cyan-900/30 hover:border-cyan-500/50'
                  }`}
                >
                  {r} Units
                </button>
              ))}
            </div>

            {/* Legend Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 w-full">
              {filteredLegends.map((legend) => (
                <button
                  key={legend.id}
                  onClick={() => setSelectedLegend(legend)}
                  className={`p-5 border transition-all duration-300 rounded-sm text-left relative group flex flex-col ${
                    selectedLegend.id === legend.id 
                      ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.15)]' 
                      : 'bg-black/40 border-cyan-900/10 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${
                        legend.rarity === 'platinum' ? 'text-cyan-400' : 'text-slate-500'
                      }`}>
                        {legend.specialization.replace(/_/g, ' ')}
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter font-display leading-none">
                        {legend.codename || legend.name.split(' ')[0]}
                      </h3>
                    </div>
                    {selectedLegend.id === legend.id && (
                      <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,1)] animate-pulse" />
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-white/90 uppercase mb-1">{legend.name}</div>
                    <p className="text-[9px] text-cyan-100/30 leading-tight line-clamp-2 h-6 italic">"{legend.description}"</p>
                  </div>

                  {/* Stat Bars */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6 border-t border-cyan-500/10 pt-4">
                    {[
                      { label: 'HLT', val: legend.stats.health },
                      { label: 'ARM', val: legend.stats.armor },
                      { label: 'SPD', val: legend.stats.speed },
                      { label: 'ACC', val: legend.stats.accuracy },
                      { label: 'STL', val: legend.stats.stealth },
                      { label: 'LDR', val: legend.stats.leadership }
                    ].map(stat => (
                      <div key={stat.label} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[7px] font-black text-cyan-700">
                          <span>{stat.label}</span>
                          <span>{stat.val}</span>
                        </div>
                        <div className="h-0.5 bg-cyan-950 w-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${legend.rarity === 'platinum' ? 'bg-cyan-500' : 'bg-slate-500'}`}
                            style={{ width: `${stat.val}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-auto pt-2 border-t border-cyan-500/5">
                    <div className="text-[8px] font-bold text-cyan-600 uppercase font-mono">
                      {legend.specialAbility}
                    </div>
                    <div className="text-[8px] text-cyan-900 font-mono">
                      CD: {legend.abilityCooldown/1000}s
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Main Actions */}
            <div className="flex flex-col gap-6 w-80 mb-20 font-accent">
              <button
                onClick={() => startGame()}
                className="w-full px-8 py-4 bg-cyan-500/10 border-2 border-cyan-400 text-cyan-400 text-xl font-bold rounded-sm hover:bg-cyan-400 hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] group relative overflow-hidden font-display"
              >
                <span className="relative z-10">INITIALIZE DEPLOYMENT</span>
                <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>

              <button
                onClick={() => setShowCustomization(true)}
                className="w-full px-8 py-3 bg-cyan-950/30 border border-cyan-500/50 text-cyan-400 text-sm font-bold rounded-sm hover:bg-cyan-500/20 transition-all duration-300 uppercase tracking-widest"
              >
                Weapon Customization
              </button>

              <button
                onClick={() => setShowFusionLab(true)}
                className="w-full px-8 py-3 bg-purple-950/30 border border-purple-500/50 text-purple-400 text-sm font-bold rounded-sm hover:bg-purple-500/20 transition-all duration-300 uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              >
                Relic Fusion Lab
              </button>
            </div>

            {/* Mission Selection */}
            <div className="w-full mb-20 pointer-events-auto">
              <h3 className="text-cyan-500/30 text-[10px] font-bold uppercase tracking-[0.5em] mb-4 font-display text-center">Regional Command</h3>
              <div className="flex flex-wrap justify-center gap-2 mb-8 border-b border-cyan-500/10 pb-6">
                {Object.values(Region).map(r => (
                  <button
                    key={r}
                    onClick={() => useGameStore.getState().setActiveRegion(r as Region)}
                    className={`px-4 py-1.5 border text-[10px] font-black uppercase tracking-widest transition-all ${
                      useGameStore.getState().activeRegion === r
                      ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                      : 'bg-transparent text-cyan-900 border-cyan-900/30 hover:border-cyan-500/50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <h3 className="text-cyan-500/30 text-[10px] font-bold uppercase tracking-[0.5em] mb-4 font-display text-center">Tactical Operations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MISSIONS.filter(m => m.region === useGameStore.getState().activeRegion).map((mission) => (
                  <button
                    key={mission.id}
                    onClick={() => useGameStore.getState().setCurrentMission(mission)}
                    className={`p-6 border text-left transition-all relative group ${
                      useGameStore.getState().currentMission?.id === mission.id
                      ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.1)]'
                      : 'bg-black/40 border-cyan-900/30 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter">{mission.region}</span>
                      {useGameStore.getState().currentMission?.id === mission.id && <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,1)]" />}
                    </div>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight mb-1 group-hover:text-cyan-400 transition-colors">{mission.title}</h4>
                    <p className="text-[10px] text-cyan-100/40 leading-relaxed mb-4 h-8 line-clamp-2 italic">"{mission.description}"</p>
                    <div className="flex flex-wrap gap-2">
                       {mission.objectives.map((obj, i) => (
                         <div key={i} className="text-[8px] bg-cyan-950/60 text-cyan-400/70 px-2 py-0.5 border border-cyan-500/20 uppercase font-black tracking-widest leading-none">
                           {obj}
                         </div>
                       ))}
                    </div>
                  </button>
                ))}
                {MISSIONS.filter(m => m.region === useGameStore.getState().activeRegion).length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-cyan-900/20 text-cyan-900 text-xs uppercase font-black tracking-widest">
                    No active operations detected in this sector
                  </div>
                )}
              </div>
            </div>

            {/* Elite Backers Section */}
            <div className="w-full mb-32 font-accent">
              <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-[0.4em] mb-12 flex items-center gap-4 justify-center font-display">
                <div className="h-px bg-cyan-500/20 flex-1" />
                Strategic Deployment Support
                <div className="h-px bg-cyan-500/20 flex-1" />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {[
                  { name: 'Scout Pack', price: '$5', features: ['Core System Access', 'Scout Insignia', 'Discord Role', 'Community Voting'], color: 'cyan' },
                  { name: 'Knight Pack', price: '$15', features: ['All Scout Perks', 'Weapon Skins Pack 1', 'Early Map Access', 'Special Voice Lines'], color: 'purple' },
                  { name: 'Legend Pack', price: '$50', features: ['All Exclusive Content', 'Lifetime Season Pass', 'Developer Credits', 'Custom Operator Skin'], color: 'yellow' }
                ].map((tier) => (
                  <div 
                    key={tier.name}
                    className="bg-black/60 border border-cyan-500/20 p-8 rounded-sm text-center group hover:scale-105 hover:bg-cyan-950/20 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.05)] flex flex-col h-full"
                  >
                    <h4 className="text-2xl font-black text-white uppercase mb-1 tracking-tighter font-display">{tier.name}</h4>
                    <p className="text-cyan-400 font-bold mb-6 text-lg font-display">{tier.price}</p>
                    <ul className="text-[10px] text-cyan-100/50 space-y-3 mb-8 text-left flex-1">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-cyan-500 rotate-45" /> {f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-3 bg-transparent border border-cyan-400 text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all font-display mt-auto">
                      Support Deployment
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pb-12 text-[10px] text-cyan-900 font-bold tracking-[0.3em] uppercase">
              Powered by NEXUS ONE Intelligence
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-10 pointer-events-auto">
          <div className="text-red-500 text-xs tracking-[0.5em] font-bold mb-2">CRITICAL SYSTEM FAILURE</div>
          <h1 className="text-6xl md:text-8xl font-black text-white mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)] tracking-tighter">
            MISSION <span className="text-red-500">ABORTED</span>
          </h1>
          <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-lg backdrop-blur-md max-w-xs w-full mb-8 text-center">
            <div className="text-cyan-400 text-3xl font-bold mb-1">
              {score}
            </div>
            <div className="text-cyan-900 text-xs font-bold uppercase tracking-widest">Tactical Efficiency Rating</div>
          </div>
          <button
            id="start-button"
            onClick={() => startGame()}
            className="px-8 py-4 bg-red-500/10 border-2 border-red-500 text-red-500 text-xl font-bold rounded-sm hover:bg-red-500 hover:text-black transition-all duration-300"
          >
            RE-INITIALIZE SYSTEM
          </button>
        </div>
      )}
      {/* Customization Modal */}
      {showCustomization && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-cyan-950/10 border border-cyan-500/30 p-8 rounded-lg backdrop-blur-xl">
            <div className="flex justify-between items-center mb-8 border-b border-cyan-500/30 pb-4">
              <h2 className="text-3xl font-black text-white tracking-tighter">WEAPON <span className="text-cyan-400">CALIBRATION</span></h2>
              <button 
                onClick={() => setShowCustomization(false)}
                className="text-cyan-400 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest"
              >
                [ Close ]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Weapon Selection First */}
              <div className="flex flex-col gap-4">
                <h3 className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest bg-cyan-900/20 p-2 border-l-2 border-cyan-400">Weapon Chassis</h3>
                <div className="flex flex-col gap-2">
                  {Object.values(WEAPONS).map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setWeapon(w)}
                      className={`p-3 border text-left transition-all group ${
                        selectedWeapon.id === w.id ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/40 border-cyan-900/30 hover:border-cyan-500/50'
                      }`}
                    >
                      <div className="text-xs font-black text-white uppercase group-hover:text-cyan-400">{w.name}</div>
                      <div className="text-[8px] text-cyan-100/40 uppercase mt-1">Mech: {w.type.replace('_', ' ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(['scope', 'grip', 'barrel'] as AttachmentType[]).map((type) => (
                <div key={type} className="flex flex-col gap-4">
                  <h3 className="text-cyan-400/50 text-xs font-bold uppercase tracking-[0.3em] mb-2">{type}</h3>
                  <div className="flex flex-col gap-2">
                    {ATTACHMENTS[type].map((attachment) => (
                      <button
                        key={attachment.id}
                        onClick={() => setAttachment(type, attachment)}
                        className={`p-4 text-left border transition-all duration-200 rounded-sm group ${
                          weaponAttachments[type].id === attachment.id 
                            ? 'bg-cyan-500/20 border-cyan-400' 
                            : 'bg-black/40 border-cyan-900/30 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-bold uppercase tracking-wider ${
                            weaponAttachments[type].id === attachment.id ? 'text-cyan-400' : 'text-cyan-100/60'
                          }`}>
                            {attachment.name}
                          </span>
                          {weaponAttachments[type].id === attachment.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />
                          )}
                        </div>
                        <p className="text-[10px] text-cyan-100/30 leading-tight mb-2">{attachment.description}</p>
                        
                        {/* Stats Display */}
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(attachment.stats).map(([stat, value]) => (
                            value !== 0 && (
                              <div key={stat} className="text-[8px] font-bold text-cyan-500/40 uppercase">
                                {stat.replace(/([A-Z])/g, ' $1')}: {value > 0 ? '+' : ''}{value}
                              </div>
                            )
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Weapon Stats Summary */}
            <div className="bg-cyan-950/20 border border-cyan-500/20 p-6 rounded-sm mb-8 flex flex-col md:flex-row gap-8 items-center justify-around">
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1">Damage</div>
                <div className="text-3xl font-black text-white font-display uppercase">{selectedWeapon.baseDamage}</div>
                <div className="text-[8px] text-cyan-400/50 font-bold uppercase">Plasma Burst</div>
              </div>
              <div className="w-px h-12 bg-cyan-500/20 hidden md:block" />
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1">Fire Rate</div>
                <div className="text-3xl font-black text-white font-display uppercase">
                  {(1000 / (selectedWeapon.fireRate * (1 - (weaponAttachments.barrel.stats.fireRateBoost || 0)))).toFixed(1)}/s
                </div>
                <div className="text-[8px] text-cyan-400/50 font-bold uppercase">Cycle Speed</div>
              </div>
              <div className="w-px h-12 bg-cyan-500/20 hidden md:block" />
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1">Stability</div>
                <div className="text-3xl font-black text-white font-display uppercase">
                  {(100 * (1 - (selectedWeapon.recoil * (1 - (weaponAttachments.grip.stats.recoilReduction || 0))))).toFixed(0)}%
                </div>
                <div className="text-[8px] text-cyan-400/50 font-bold uppercase">Recoil Control</div>
              </div>
              <div className="w-px h-12 bg-cyan-500/20 hidden md:block" />
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1">Effective Range</div>
                <div className="text-3xl font-black text-white font-display uppercase">
                  {30 + (weaponAttachments.barrel.stats.rangeBoost || 0)}
                </div>
                <div className="text-[8px] text-cyan-400/50 font-bold uppercase">Beam Stability</div>
              </div>
            </div>

            {/* Settings Section */}
            <div className="mt-8 pt-8 border-t border-cyan-500/20">
              <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                SENSITIVITY CALIBRATION
              </h3>
              <div className="flex flex-col gap-4 max-w-md">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-cyan-100/50 uppercase tracking-widest font-bold">Zoom Sensitivity</span>
                  <span className="text-cyan-400 font-mono font-bold text-xs">{(useGameStore(state => state.zoomSensitivity) * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="2.0" 
                  step="0.05"
                  value={useGameStore(state => state.zoomSensitivity)}
                  onChange={(e) => useGameStore.getState().setZoomSensitivity(parseFloat(e.target.value))}
                  className="w-full appearance-none bg-cyan-950 h-1.5 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.5)] border border-cyan-500/20"
                />
                <div className="flex justify-between text-[8px] text-cyan-900 font-bold uppercase">
                  <span>Slow</span>
                  <span>Standard</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>

            {/* AI Advisor Section */}
            <div className="mt-8 pt-8 border-t border-cyan-500/20">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1">
                  <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    NEXUS ONE Strategic Advisor
                  </h3>
                  <div className="bg-cyan-950/20 border border-cyan-500/10 p-4 rounded-sm min-h-[80px]">
                    {isConsulting ? (
                      <div className="flex items-center gap-2 text-cyan-400/50 text-xs italic">
                        <div className="w-1 h-1 bg-cyan-400 animate-bounce" />
                        <div className="w-1 h-1 bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1 h-1 bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                        Analyzing tactical profiles...
                      </div>
                    ) : (
                      <p className="text-cyan-100/70 text-xs leading-relaxed">
                        {aiAdvice || "Consult the NEXUS ONE intelligence for optimal loadout recommendations based on your tactical profile."}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-48">
                  <span className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-widest mb-1">Select Profile</span>
                  <button 
                    onClick={() => consultAdvisor("Aggressive / Close Quarters")}
                    className="px-4 py-2 bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                  >
                    Aggressive
                  </button>
                  <button 
                    onClick={() => consultAdvisor("Defensive / Long Range")}
                    className="px-4 py-2 bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                  >
                    Defensive
                  </button>
                  <button 
                    onClick={() => consultAdvisor("Balanced / Versatile")}
                    className="px-4 py-2 bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                  >
                    Balanced
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setShowCustomization(false)}
                className="px-12 py-3 bg-cyan-500 text-black font-black uppercase tracking-widest hover:bg-white transition-colors duration-300"
              >
                Confirm Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
