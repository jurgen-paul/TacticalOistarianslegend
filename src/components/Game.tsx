/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Arena } from './Arena';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { OtherPlayer } from './OtherPlayer';
import { Objective } from './Objective';
import { Hazards } from './Hazards';
import { Effects } from './Effects';
import { useGameStore } from '../store';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useShallow } from 'zustand/react/shallow';
import { useState, useEffect } from 'react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
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

function GameLoop() {
  const updateTime = useGameStore(state => state.updateTime);
  const updateEnemies = useGameStore(state => state.updateEnemies);
  const updateProjectiles = useGameStore(state => state.updateProjectiles);
  const updateObjectives = useGameStore(state => state.updateObjectives);
  const updateHazards = useGameStore(state => state.updateHazards);
  const cleanupEffects = useGameStore(state => state.cleanupEffects);

  useFrame((_, delta) => {
    const now = Date.now();
    updateTime(delta);
    updateEnemies(now);
    updateProjectiles(delta);
    updateObjectives(delta);
    updateHazards(now);
    cleanupEffects(now);
  });
  return null;
}

export function Game() {
  const enemies = useGameStore(state => state.enemies);
  const objectives = useGameStore(state => state.objectives);
  const otherPlayerIds = useGameStore(
    useShallow(state => Object.keys(state.otherPlayers))
  );
  const isMobile = useIsMobile();

  return (
    <Canvas 
      shadows={false} // Disable shadows globally for stability
      camera={{ fov: 75 }}
      dpr={1} // Force 1:1 DPR to reduce GPU load
      gl={{ 
        antialias: false, 
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false
      }}
    >
      <color attach="background" args={['#050510']} />
      <fogExp2 attach="fog" args={['#050510', 0.03]} />
      
      <ambientLight intensity={1.0} />
      <pointLight position={[0, 10, 0]} intensity={2} distance={100} />
      
      <Physics gravity={[0, -20, 0]}>
        <GameLoop />
        <Arena />
        <Player />
        {objectives.map(obj => (
          <Objective key={obj.id} data={obj} />
        ))}
        <Hazards />
        {enemies.map(enemy => (
          <Enemy key={enemy.id} data={enemy} />
        ))}
        {otherPlayerIds.map(id => (
          <OtherPlayer key={id} id={id} />
        ))}
        <Effects />
      </Physics>

      {/* Post-processing disabled for stability */}
    </Canvas>
  );
}
