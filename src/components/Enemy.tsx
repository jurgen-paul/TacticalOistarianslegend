/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore, EnemyData, EntityState } from '../store';
import { soundManager } from '../lib/sounds';
import { Text } from '@react-three/drei';
import { HealthBar } from './HealthBar';

const ENEMY_SPEED = 3;
const CHASE_DIST = 15; // Reduced from 20
const SHOOT_DIST = 15;
const SHOOT_COOLDOWN = 3500; // Increased from 2000 for less aggressive shooting

export function Enemy({ data }: { data: EnemyData }) {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { world, rapier } = useRapier();
  
  const gameState = useGameStore(state => state.gameState);
  const playerState = useGameStore(state => state.playerState);
  const stealthActiveUntil = useGameStore(state => state.stealthActiveUntil);
  const hitPlayer = useGameStore(state => state.hitPlayer);
  const addLaser = useGameStore(state => state.addLaser);
  const addProjectile = useGameStore(state => state.addProjectile);
  const addParticles = useGameStore(state => state.addParticles);
  const setEnemyAbility = useGameStore(state => state.setEnemyAbility);

  const lastShootTime = useRef(0);
  const lastAbilityTime = useRef(0);
  const patrolTarget = useRef(new THREE.Vector3());
  const lastPatrolChange = useRef(0);
  const state = useRef<'patrol' | 'chase'>('patrol');
  const lockStartTime = useRef<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const groupRef = useRef<THREE.Group>(null);

  // Type-specific stats
  const stats = useMemo(() => {
    switch (data.type) {
      case 'scout':
        return { speed: 8, chaseDist: 15, shootDist: 12, cooldown: 1500, spread: 0.25, color: '#ffff00' };
      case 'tank':
        return { speed: 2, chaseDist: 25, shootDist: 20, cooldown: 4000, spread: 0.08, color: '#ff4400' };
      case 'sniper':
        return { speed: 1, chaseDist: 40, shootDist: 45, cooldown: 5000, spread: 0.01, color: '#00ff00' };
      case 'ghost':
        return { speed: 6, chaseDist: 20, shootDist: 6, cooldown: 800, spread: 0.4, color: '#aa00fb' };
      default:
        return { speed: 4, chaseDist: 20, shootDist: 18, cooldown: 3000, spread: 0.12, color: '#ff0000' };
    }
  }, [data.type]);

  // Initialize patrol target
  useMemo(() => {
    patrolTarget.current.set(
      data.position[0] + (Math.random() - 0.5) * 10,
      data.position[1],
      data.position[2] + (Math.random() - 0.5) * 10
    );
  }, [data.position]);

  useFrame((state_fiber) => {
    if (!body.current || gameState !== 'playing' || data.state === 'disabled') {
      if (body.current) {
        body.current.setLinvel({ x: 0, y: body.current.linvel().y, z: 0 }, true);
      }
      return;
    }

    const pos = body.current.translation();
    const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    
    let closestTargetPos: THREE.Vector3 | null = null;
    let closestDist = stats.chaseDist;

    // Check player
    if (playerState === 'active' && Date.now() > stealthActiveUntil) {
      const playerPos = camera.position.clone();
      playerPos.y = pos.y; // Ignore height difference for distance
      const distToPlayer = currentPos.distanceTo(playerPos);
      if (distToPlayer < closestDist) {
        closestDist = distToPlayer;
        closestTargetPos = playerPos;
      }
    }

    // Check other enemies (optional: bots could fight each other, but let's keep it simple for now)
    // AI Logic
    if (closestTargetPos) {
      if (state.current === 'patrol') {
        state.current = 'chase';
        lockStartTime.current = Date.now();
      }
    } else if (state.current === 'chase') {
      state.current = 'patrol';
      lockStartTime.current = null;
      setIsLocked(false);
      patrolTarget.current.set(
        currentPos.x + (Math.random() - 0.5) * 40,
        currentPos.y,
        currentPos.z + (Math.random() - 0.5) * 40
      );
      lastPatrolChange.current = Date.now();
    }

    // Update Lock State
    const now = Date.now();
    const lockDuration = data.type === 'sniper' ? 1500 : 2500;
    if (state.current === 'chase' && lockStartTime.current && now - lockStartTime.current > lockDuration) {
      if (!isLocked) setIsLocked(true);
    }

    // Ability Logic
    const abilityCooldown = data.type === 'scout' ? 8000 : 12000;
    if (state.current === 'chase' && now - lastAbilityTime.current > abilityCooldown) {
      if (data.type === 'scout') {
        setEnemyAbility(data.id, 'boost', true);
        setTimeout(() => setEnemyAbility(data.id, 'boost', false), 3000);
        lastAbilityTime.current = now;
      } else if (data.type === 'tank') {
        setEnemyAbility(data.id, 'shield', true);
        setTimeout(() => setEnemyAbility(data.id, 'shield', false), 4000);
        lastAbilityTime.current = now;
      }
    }

    const direction = new THREE.Vector3();

    if (state.current === 'chase' && closestTargetPos) {
      const toTarget = new THREE.Vector3().subVectors(closestTargetPos, currentPos);
      const dist = toTarget.length();
      
      if (data.type === 'scout') {
        // Scouts try to circle the player
        if (dist < 8) {
          // Move perpendicular to target
          direction.set(-toTarget.z, 0, toTarget.x).normalize();
        } else {
          direction.copy(toTarget).normalize();
        }
      } else if (data.type === 'tank') {
        // Tanks stop and fire when in range
        if (dist > 12) {
          direction.copy(toTarget).normalize();
        } else {
          direction.set(0, 0, 0);
        }
      } else if (data.type === 'sniper') {
        // Snipers try to stay far away
        if (dist < 20) {
          // Back away
          direction.copy(toTarget).normalize().multiplyScalar(-1);
        } else if (dist > 30) {
          // Move closer
          direction.copy(toTarget).normalize();
        } else {
          direction.set(0, 0, 0);
        }
      } else {
        // Standard behavior
        direction.copy(toTarget).normalize();
      }
      
      // Shooting logic
      if (closestDist < stats.shootDist && now - lastShootTime.current > stats.cooldown) {
        const rayDir = new THREE.Vector3().subVectors(closestTargetPos, currentPos).normalize();
        
        if (data.type === 'sniper' && now - lastAbilityTime.current > 10000) {
          // Sniper Charged Shot (Projectile)
          const velocity = rayDir.clone().multiplyScalar(15); // Slow but dangerous
          addProjectile(
            [currentPos.x, currentPos.y + 1, currentPos.z],
            [velocity.x, velocity.y, velocity.z],
            '#00ff00',
            data.id
          );
          soundManager.play('shoot', 0.5);
          lastShootTime.current = now;
          lastAbilityTime.current = now;
        } else {
          // Standard Shooting
          // Add random spread - reduced if locked
          const currentSpread = isLocked ? stats.spread * 0.2 : stats.spread;
          rayDir.x += (Math.random() - 0.5) * currentSpread;
          rayDir.y += (Math.random() - 0.5) * currentSpread;
          rayDir.z += (Math.random() - 0.5) * currentSpread;
          rayDir.normalize();
          
          // Offset start position to avoid hitting self
          const startPos = new THREE.Vector3(currentPos.x, currentPos.y + 0.5, currentPos.z);
          startPos.add(rayDir.clone().multiplyScalar(1.5));

          const ray = new rapier.Ray(startPos, rayDir);
          const hit = world.castRay(ray, stats.shootDist, true);

          if (hit) {
            const collider = hit.collider;
            const rb = collider.parent();
            if (rb && rb.userData) {
              const userData = rb.userData as { name?: string };
              if (userData.name === 'player') {
                // Hit player!
                hitPlayer();
                soundManager.play('shoot', 0.2);
                addParticles([camera.position.x, camera.position.y, camera.position.z], stats.color);
                addLaser(
                  [startPos.x, startPos.y, startPos.z],
                  [camera.position.x, camera.position.y, camera.position.z],
                  stats.color
                );
                lastShootTime.current = now;
              } else {
                // Hit wall or obstacle
                const hitPoint = ray.pointAt(hit.timeOfImpact);
                soundManager.play('shoot', 0.1);
                addParticles([hitPoint.x, hitPoint.y, hitPoint.z], stats.color);
                addLaser(
                  [startPos.x, startPos.y, startPos.z],
                  [hitPoint.x, hitPoint.y, hitPoint.z],
                  stats.color
                );
                lastShootTime.current = now;
              }
            }
          }
        }
      }
    } else {
      // Patrol
      const now = Date.now();
      // Change target if reached or if stuck
      const patrolChangeInterval = data.type === 'scout' ? 2000 : 4000;
      if (currentPos.distanceTo(patrolTarget.current) < 2 || now - lastPatrolChange.current > patrolChangeInterval) {
        patrolTarget.current.set(
          currentPos.x + (Math.random() - 0.5) * 60,
          currentPos.y,
          currentPos.z + (Math.random() - 0.5) * 60
        );
        lastPatrolChange.current = now;
      }
      direction.subVectors(patrolTarget.current, currentPos).normalize();
    }

    // Apply movement
    const velocity = body.current.linvel();
    const currentSpeed = data.isBoosting ? stats.speed * 2 : stats.speed;
    body.current.setLinvel({
      x: direction.x * currentSpeed,
      y: velocity.y,
      z: direction.z * currentSpeed
    }, true);

    // Rotate to face direction or target
    if (groupRef.current) {
      let targetRotation = groupRef.current.rotation.y;
      
      if (state.current === 'chase' && closestTargetPos) {
        const toTarget = new THREE.Vector3().subVectors(closestTargetPos, currentPos);
        targetRotation = Math.atan2(toTarget.x, toTarget.z);
      } else if (direction.lengthSq() > 0.1) {
        targetRotation = Math.atan2(direction.x, direction.z);
      }

      const lerpFactor = data.type === 'tank' ? 0.02 : 0.1;
      const currentRotation = groupRef.current.rotation.y;
      let diff = targetRotation - currentRotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      groupRef.current.rotation.y += diff * lerpFactor;
    }
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      mass={data.type === 'tank' ? 5 : 1}
      type="dynamic"
      position={data.position}
      enabledRotations={[false, false, false]}
      userData={{ name: data.id }}
    >
      <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} />
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Targeting Laser / Lock Indicator */}
        {state.current === 'chase' && data.state === 'active' && (
          <mesh position={[0, 1.4, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 20, 8]} />
            <meshBasicMaterial 
              color={isLocked ? '#ff0000' : stats.color} 
              transparent 
              opacity={isLocked ? 0.6 : 0.2} 
              toneMapped={false} 
            />
          </mesh>
        )}

        {/* Energy Shield Visual */}
        {data.isShielded && (
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshBasicMaterial color="#0088ff" transparent opacity={0.3} wireframe />
          </mesh>
        )}

        {data.type === 'tank' && <TankModel state={data.state} color={stats.color} lastHitTime={data.lastHitTime} />}
        {data.type === 'scout' && <ScoutModel state={data.state} color={stats.color} lastHitTime={data.lastHitTime} />}
        {data.type === 'sniper' && <SniperModel state={data.state} color={stats.color} lastHitTime={data.lastHitTime} />}
        {data.type === 'ghost' && <GhostModel state={data.state} color={stats.color} lastHitTime={data.lastHitTime} />}
        {data.type === 'standard' && <StandardModel state={data.state} color={stats.color} lastHitTime={data.lastHitTime} />}

        {/* Drone ID Label */}
        {data.state === 'active' && (
          <HealthBar current={data.health} max={data.maxHealth} position={[0, data.type === 'sniper' ? 3.5 : 2.8, 0]} width={0.8} height={0.08} />
        )}
        <Text
          position={[0, data.type === 'sniper' ? 3.2 : 2.5, 0]}
          fontSize={0.2}
          color={data.state === 'active' ? stats.color : '#444'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
        >
          {`${data.type.toUpperCase()}-${data.id.split('-')[1] || data.id}`}
        </Text>
      </group>
    </RigidBody>
  );
}

function StandardModel({ state, color, lastHitTime }: { state: EntityState, color: string, lastHitTime: number }) {
  const isFlashing = Date.now() - lastHitTime < 100;
  const baseColor = state === 'disabled' ? '#1a1a1a' : '#0a0a20';
  
  return (
    <>
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={isFlashing ? '#ffffff' : baseColor} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={state === 'disabled' ? '#111' : color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.4, 0.41]}>
        <boxGeometry args={[0.6, 0.1, 0.1]} />
        <meshBasicMaterial color={state === 'disabled' ? '#000' : color} toneMapped={false} />
      </mesh>
    </>
  );
}

function TankModel({ state, color, lastHitTime }: { state: EntityState, color: string, lastHitTime: number }) {
  const isFlashing = Date.now() - lastHitTime < 100;
  const baseColor = state === 'disabled' ? '#1a1a1a' : '#050510';

  return (
    <>
      <mesh castShadow position={[0, 1, 0]}>
        <boxGeometry args={[1.5, 1.2, 1.5]} />
        <meshStandardMaterial color={isFlashing ? '#ffffff' : baseColor} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[1, 0.6, 1]} />
        <meshStandardMaterial color={state === 'disabled' ? '#1a1a1a' : '#0a0a20'} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 1.8, 0.6]}>
        <boxGeometry args={[0.4, 0.4, 0.8]} />
        <meshStandardMaterial color="#111" metalness={1} roughness={0} />
      </mesh>
      <mesh position={[0, 1.8, 1.01]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={state === 'disabled' ? '#000' : color} toneMapped={false} />
      </mesh>
    </>
  );
}

function ScoutModel({ state, color, lastHitTime }: { state: EntityState, color: string, lastHitTime: number }) {
  const isFlashing = Date.now() - lastHitTime < 100;
  const baseColor = state === 'disabled' ? '#1a1a1a' : '#0a0a20';

  return (
    <>
      <mesh castShadow position={[0, 1.2, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial color={isFlashing ? '#ffffff' : baseColor} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={state === 'disabled' ? '#111' : color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.2, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </>
  );
}

function SniperModel({ state, color, lastHitTime }: { state: EntityState, color: string, lastHitTime: number }) {
  const isFlashing = Date.now() - lastHitTime < 100;
  const baseColor = state === 'disabled' ? '#1a1a1a' : '#050510';

  return (
    <>
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 2, 8]} />
        <meshStandardMaterial color={isFlashing ? '#ffffff' : baseColor} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={state === 'disabled' ? '#1a1a1a' : '#0a0a20'} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#111" metalness={1} roughness={0} />
      </mesh>
      <mesh position={[0, 2.5, 1.4]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color={state === 'disabled' ? '#000' : color} toneMapped={false} />
      </mesh>
    </>
  );
}

function GhostModel({ state, color, lastHitTime }: { state: EntityState, color: string, lastHitTime: number }) {
  const isFlashing = Date.now() - lastHitTime < 100;
  const baseColor = state === 'disabled' ? '#1a1a1a' : '#0a0a20';

  return (
    <>
      <mesh castShadow position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial 
          color={isFlashing ? '#ffffff' : baseColor} 
          roughness={0.1} 
          metalness={1} 
          transparent 
          opacity={0.4} 
        />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color={state === 'disabled' ? '#111' : color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 16, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.5} />
      </mesh>
    </>
  );
}
