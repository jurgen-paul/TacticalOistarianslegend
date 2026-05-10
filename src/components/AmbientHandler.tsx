import React, { useEffect } from 'react';
import { useGameStore, Region } from '../store';
import { soundManager } from '../lib/sounds';

export const AmbientHandler: React.FC = () => {
  const gameState = useGameStore(state => state.gameState);
  const currentMission = useGameStore(state => state.currentMission);

  useEffect(() => {
    if (gameState !== 'playing' || !currentMission) {
      // Cleanup all ambient sounds when not playing
      soundManager.stopAmbient('siren');
      soundManager.stopAmbient('crowd');
      soundManager.stopAmbient('rain');
      return;
    }

    // Determine which ambient layers to play based on mission region/environment
    const region = currentMission.region;
    
    // Manage Siren Loop (Vaults and High Tension Urban)
    const shouldPlaySiren = region === Region.Israel || region === Region.Europe;
    soundManager.toggleAmbient('siren', shouldPlaySiren, 0.15);

    // Manage Crowd Chant (Dense Urban Ruins)
    const shouldPlayCrowd = region === Region.Gaza;
    soundManager.toggleAmbient('crowd', shouldPlayCrowd, 0.2);

    // Manage Rain Drip (Jungle)
    const shouldPlayRain = region === Region.SouthAmerica;
    soundManager.toggleAmbient('rain', shouldPlayRain, 0.3);

    return () => {
      // Ensure everything is stopped on unmount
      soundManager.stopAmbient('siren');
      soundManager.stopAmbient('crowd');
      soundManager.stopAmbient('rain');
    };
  }, [gameState, currentMission]);

  return null; // Side-effect only component
};
