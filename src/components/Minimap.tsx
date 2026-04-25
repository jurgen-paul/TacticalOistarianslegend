import React from 'react';
import { useGameStore } from '../store';

export function Minimap() {
  const playerPos = useGameStore(state => state.playerPosition);
  const playerRot = useGameStore(state => state.playerRotation);
  const enemies = useGameStore(state => state.enemies);
  const otherPlayers = useGameStore(state => state.otherPlayers);
  const objectives = useGameStore(state => state.objectives);
  const hazards = useGameStore(state => state.hazards);
  const gameState = useGameStore(state => state.gameState);

  if (gameState !== 'playing') return null;

  // Arena is 200x200, from -100 to 100
  const arenaSize = 200;
  const mapSize = 150; // px
  const scale = mapSize / arenaSize;

  const toMapCoord = (worldCoord: number) => {
    // worldCoord -100 -> 0
    // worldCoord 100 -> mapSize
    return (worldCoord + 100) * scale;
  };

  return (
    <div 
      className="relative bg-black/60 border border-cyan-500/30 backdrop-blur-sm overflow-hidden"
      style={{ width: mapSize, height: mapSize }}
    >
      {/* Grid Lines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, #00ffff 1px, transparent 1px), linear-gradient(to bottom, #00ffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>

      {/* Objectives */}
      {objectives.map(obj => (
        <div
          key={obj.id}
          className={`absolute w-3 h-3 border rotate-45 flex items-center justify-center ${obj.controlledBy === 'player' ? 'border-green-400 bg-green-400/40' : (obj.progress > 0 ? 'border-cyan-400 bg-cyan-400/20' : 'border-cyan-900 bg-black/40')}`}
          style={{
            left: toMapCoord(obj.position[0]) - 6,
            top: toMapCoord(obj.position[2]) - 6,
          }}
        >
          {obj.isBeingCaptured && (
            <div className="absolute inset-0 bg-cyan-400/40 animate-pulse" />
          )}
        </div>
      ))}

      {/* Hazards */}
      {hazards.map(h => (
        <div
          key={h.id}
          className={`absolute border ${h.type === 'laser' ? 'border-red-500/50' : 'border-green-500/30'}`}
          style={{
            left: toMapCoord(h.position[0] - h.size[0]/2),
            top: toMapCoord(h.position[2] - h.size[2]/2),
            width: h.size[0] * scale,
            height: h.size[2] * scale,
            backgroundColor: h.isActive ? (h.type === 'laser' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.1)') : 'transparent'
          }}
        />
      ))}

      {/* Enemies */}
      {enemies.map(enemy => (
        enemy.state === 'active' && (
          <div
            key={enemy.id}
            className="absolute w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]"
            style={{
              left: toMapCoord(enemy.position[0]) - 3,
              top: toMapCoord(enemy.position[2]) - 3,
              transition: 'all 0.1s linear'
            }}
          />
        )
      ))}

      {/* Other Players */}
      {Object.values(otherPlayers).map(player => (
        player.state === 'active' && (
          <div
            key={player.id}
            className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]"
            style={{
              left: toMapCoord(player.position[0]) - 3,
              top: toMapCoord(player.position[2]) - 3,
              transition: 'all 0.1s linear'
            }}
          />
        )
      ))}

      {/* Local Player */}
      <div
        className="absolute w-2 h-2 flex items-center justify-center"
        style={{
          left: toMapCoord(playerPos[0]) - 4,
          top: toMapCoord(playerPos[2]) - 4,
          transform: `rotate(${playerRot}rad)`,
          transition: 'all 0.05s linear'
        }}
      >
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      </div>

      {/* Scan Line Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-scan" style={{ animationDuration: '4s' }} />
      </div>

      {/* Border Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400" />
      
      <div className="absolute bottom-1 right-1 text-[8px] text-cyan-400/40 font-mono uppercase tracking-tighter">
        Sector-7
      </div>
    </div>
  );
}
