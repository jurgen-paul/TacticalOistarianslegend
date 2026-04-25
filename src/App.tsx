/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo } from 'react';
import { Game } from './components/Game';
import { MobileControls } from './components/MobileControls';
import { useGameStore, ATTACHMENTS, AttachmentType, Attachment } from './store';
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
      {/* Damage Flash */}
      <div className={`absolute inset-0 bg-red-500/20 pointer-events-none transition-opacity duration-200 ${showDamageFlash ? 'opacity-100' : 'opacity-0'}`} />

      {/* Crosshair */}
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
        
        <div className="bg-black/40 border-l-2 border-cyan-500 p-2 backdrop-blur-sm">
          <div className="text-cyan-500/50 text-[10px] font-bold tracking-widest uppercase mb-1">Combat Efficiency</div>
          <div className="text-cyan-400 text-2xl font-black tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            {score.toString().padStart(5, '0')}
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

      {/* HUD Right - Time, Leave, Events */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-3 pointer-events-auto">
        {gameState === 'playing' && (
          <div className="bg-black/40 border-r-2 border-cyan-500 p-2 backdrop-blur-sm text-right">
            <div className="text-cyan-500/50 text-[10px] font-bold tracking-widest uppercase mb-1">Mission Clock</div>
            <div className="text-cyan-400 text-2xl font-black tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              {Math.floor(timeLeft / 60)}:{(Math.floor(timeLeft) % 60).toString().padStart(2, '0')}
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
      <div className="absolute bottom-4 right-4 flex gap-4 pointer-events-none">
        <div className="flex flex-col items-end gap-1">
          <div className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-widest">Dash [Shift]</div>
          <div className="w-24 h-1 bg-cyan-900/30 rounded-full overflow-hidden border border-cyan-500/20">
            <div 
              className="h-full bg-cyan-400 transition-all duration-100" 
              style={{ width: `${Math.max(0, Math.min(100, (1 - (Math.max(0, dashCooldown - Date.now()) / 2000)) * 100))}%` }} 
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-widest">EMP Blast [E]</div>
          <div className="w-24 h-1 bg-cyan-900/30 rounded-full overflow-hidden border border-cyan-500/20">
            <div 
              className="h-full bg-cyan-400 transition-all duration-100" 
              style={{ width: `${Math.max(0, Math.min(100, (1 - (Math.max(0, empCooldown - Date.now()) / 15000)) * 100))}%` }} 
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
  const isMobile = useIsMobile();
  const [showCustomization, setShowCustomization] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState(false);

  const consultAdvisor = async (playstyle: string) => {
    setIsConsulting(true);
    const advice = await getStrategicAdvice(playstyle);
    setAiAdvice(advice);
    setIsConsulting(false);
  };

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden font-mono select-none">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Game />
      </div>

      {/* UI Overlay */}
      {gameState === 'playing' && <HUD />}

      {/* Menus */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 pointer-events-auto">
          <div className="mb-8 flex flex-col items-center">
            <div className="text-cyan-500 text-xs tracking-[0.5em] font-bold mb-2 animate-pulse">SYSTEM STATUS: READY</div>
            <h1 className="text-6xl md:text-8xl font-black text-white mb-2 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tracking-tighter">
              TACTICAL <span className="text-cyan-400">LEGENDS</span>
            </h1>
            <div className="text-cyan-400/50 text-sm tracking-widest font-bold">RISE OF OISTARIAN</div>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 p-6 rounded-lg backdrop-blur-md max-w-md w-full mb-8 text-center">
            <div className="text-cyan-400 text-xs font-bold mb-4 uppercase tracking-widest border-b border-cyan-500/30 pb-2">Mission Briefing</div>
            <p className="text-cyan-100/70 text-sm leading-relaxed mb-4">
              Welcome, Commander. You are now connected to the <span className="text-cyan-400 font-bold">NEXUS ONE</span> command network. 
              Deploy your tactical legend into the Oistarian battlefield.
            </p>
            <div className="flex justify-center gap-8 text-[10px] text-cyan-500/50 font-bold uppercase tracking-tighter">
              <span>Movement: WASD</span>
              <span>Combat: MOUSE1</span>
              <span>Tactical: SHIFT</span>
            </div>
          </div>

          <div className="flex flex-col gap-6 w-80">
            <button
              onClick={() => startGame()}
              className="w-full px-8 py-4 bg-cyan-500/10 border-2 border-cyan-400 text-cyan-400 text-xl font-bold rounded-sm hover:bg-cyan-400 hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] group relative overflow-hidden"
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
          </div>
          
          <div className="mt-12 text-[10px] text-cyan-900 font-bold tracking-[0.3em] uppercase">
            Powered by NEXUS ONE Intelligence
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
