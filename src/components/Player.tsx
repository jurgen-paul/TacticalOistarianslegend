/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { soundManager } from '../lib/sounds';

const SPEED = 12;
const MAX_LASER_DIST = 100;

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  
  const playerState = useGameStore(state => state.playerState);
  const gameState = useGameStore(state => state.gameState);
  const addLaser = useGameStore(state => state.addLaser);
  const hitEnemy = useGameStore(state => state.hitEnemy);
  const addParticles = useGameStore(state => state.addParticles);
  const triggerDash = useGameStore(state => state.triggerDash);
  const triggerEMP = useGameStore(state => state.triggerEMP);
  const dashCooldown = useGameStore(state => state.dashCooldown);
  const empCooldown = useGameStore(state => state.empCooldown);
  const weaponAttachments = useGameStore(state => state.weaponAttachments);

  const keys = useRef({ 
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    shift: false, e: false
  });
  const isAiming = useRef(false);
  const lastEmitTime = useRef(0);
  const lastShootTime = useRef(0);

  const gunGroupRef = useRef<THREE.Group>(null);
  const gunVisualRef = useRef<THREE.Group>(null);
  const gunBarrelRef = useRef<THREE.Group>(null);

  // More robust mobile detection (checks for touch support)
  const isTouchDevice = useRef(false);
  useEffect(() => {
    isTouchDevice.current = window.matchMedia('(pointer: coarse)').matches || 
                           'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right click
        isAiming.current = true;
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isAiming.current = false;
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const updatePlayerPosition = useGameStore(state => state.updatePlayerPosition);

  // Shooting logic function
  const shoot = () => {
    if (gameState !== 'playing' || playerState !== 'active') return;
    
    // Rate limit shooting
    const now = Date.now();
    const baseFireRate = 200;
    const fireRateBoost = weaponAttachments.barrel.stats.fireRateBoost || 0;
    const fireRate = baseFireRate * (1 - fireRateBoost);
    
    if (now - lastShootTime.current < fireRate) return;
    lastShootTime.current = now;

    // Raycast from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Start raycast slightly ahead of the camera to avoid hitting the player's own collider
    const rayStart = camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(0.8));
    const ray = new rapier.Ray(rayStart, raycaster.ray.direction);
    
    const baseRange = MAX_LASER_DIST;
    const rangeBoost = weaponAttachments.barrel.stats.rangeBoost || 0;
    const range = baseRange + rangeBoost;
    
    const hit = world.castRay(ray, range, true);

    const startPosVec = new THREE.Vector3();
    if (gunBarrelRef.current) {
      gunBarrelRef.current.getWorldPosition(startPosVec);
    } else {
      startPosVec.copy(camera.position);
    }
    const startPos: [number, number, number] = [startPosVec.x, startPosVec.y, startPosVec.z];

    // Apply recoil
    if (gunVisualRef.current) {
      const recoilReduction = weaponAttachments.grip.stats.recoilReduction || 0;
      const recoilFactor = 1 - recoilReduction;
      gunVisualRef.current.position.z = -0.4 * recoilFactor;
      gunVisualRef.current.rotation.x = 0.1 * recoilFactor;
    }

    soundManager.play('shoot', 0.4);

    let endPos: [number, number, number];

    if (hit) {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      endPos = [hitPoint.x, hitPoint.y, hitPoint.z];
      
      const collider = hit.collider;
      const rb = collider.parent();
      if (rb && rb.userData) {
        const userData = rb.userData as { name?: string };
        const name = userData.name;
        
        if (name) {
          // Check if it's a bot
          if (name.startsWith('bot-')) {
            hitEnemy(name, true);
          } 
          // Check if it's another player (socket ID)
          else if (name !== 'player' && useGameStore.getState().otherPlayers[name]) {
            hitEnemy(name, true);
          }
        }
      }
      
      addParticles(endPos, '#00ffff');
    } else {
      endPos = [
        camera.position.x + raycaster.ray.direction.x * MAX_LASER_DIST,
        camera.position.y + raycaster.ray.direction.y * MAX_LASER_DIST,
        camera.position.z + raycaster.ray.direction.z * MAX_LASER_DIST
      ];
    }

    addLaser(startPos, endPos, '#00ffff');
  };

  const hoverSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (gameState === 'playing' && playerState === 'active') {
      hoverSoundRef.current = soundManager.play('hover', 0, true) || null;
    } else {
      if (hoverSoundRef.current) {
        hoverSoundRef.current.pause();
        hoverSoundRef.current = null;
      }
    }
    return () => {
      if (hoverSoundRef.current) {
        hoverSoundRef.current.pause();
        hoverSoundRef.current = null;
      }
    };
  }, [gameState, playerState]);

  useFrame((_, delta) => {
    if (!body.current || gameState !== 'playing') return;

    const mobileInput = useGameStore.getState().mobileInput;

    // Handle Mobile Shooting
    if (mobileInput.shooting) {
      shoot();
    }

    // Movement
    const velocity = body.current.linvel();
    
    const k = keys.current;
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // Combine keyboard and joystick input
    // Joystick Y is inverted (up is negative), so we negate it for forward movement
    // Actually, in Joystick component: Up is negative Y.
    // Forward movement should be positive.
    // Let's assume Joystick Up -> y < 0.
    // We want moveZ to be negative for forward.
    // So if joystick.y is -1, moveZ should be -1.
    // So we add joystick.y directly?
    // Wait, standard WASD: W -> moveZ = -1 (forward in Threejs is -Z usually? No, camera looks down -Z).
    // Yes, forward is -Z.
    // W key: moveZ = -1.
    // Joystick Up (y < 0): moveZ should be negative.
    // So we add mobileInput.move.y.
    
    const moveZ = (k.w ? 1 : 0) - (k.s ? 1 : 0) + (mobileInput.move.y * -1); // Invert joystick Y to match W/S logic (W is +1 in my logic below? No wait)
    
    // Original logic:
    // const moveZ = (k.w ? 1 : 0) - (k.s ? 1 : 0);
    // const direction = new THREE.Vector3();
    // direction.addScaledVector(forward, moveZ);
    
    // If I press W, moveZ is 1.
    // forward vector points in camera direction.
    // If I add scaled vector (forward * 1), I move forward.
    // So W -> 1 is correct.
    
    // Joystick Up -> y is negative (e.g. -1).
    // We want to move forward (1).
    // So we need -y.
    const joyMoveZ = -mobileInput.move.y;
    
    // Joystick Right -> x is positive.
    // D key -> moveX = 1.
    // We want moveX = 1.
    const joyMoveX = mobileInput.move.x;

    const combinedMoveZ = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + joyMoveZ;
    const combinedMoveX = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + joyMoveX;

    const direction = new THREE.Vector3();
    direction.addScaledVector(forward, combinedMoveZ);
    direction.addScaledVector(right, combinedMoveX);
    
    if (direction.lengthSq() > 0) {
      // Clamp length to 1 to prevent faster diagonal movement if both inputs active (though rare)
      if (direction.lengthSq() > 1) direction.normalize();
      direction.multiplyScalar(SPEED);
    }

    body.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Update hover sound volume based on speed
    if (hoverSoundRef.current) {
      const speed = direction.length();
      hoverSoundRef.current.volume = THREE.MathUtils.lerp(hoverSoundRef.current.volume, speed > 0.1 ? 0.15 : 0.05, delta * 5);
    }

    // Mobile Look Rotation
    if (Math.abs(mobileInput.look.x) > 0.01 || Math.abs(mobileInput.look.y) > 0.01) {
      const lookSpeed = 2.0 * delta;
      camera.rotation.y -= mobileInput.look.x * lookSpeed;
      camera.rotation.x -= mobileInput.look.y * lookSpeed;
      
      // Clamp pitch to avoid flipping
      camera.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation.x));
    }

    // Subtle Aim Assist for Mobile
    if (isTouchDevice.current && gameState === 'playing' && playerState === 'active') {
      const enemies = useGameStore.getState().enemies;
      let bestTarget: THREE.Vector3 | null = null;
      let minAngle = 0.15; // Sticky radius (radians)

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);

      enemies.forEach(enemy => {
        if (enemy.state !== 'active') return;
        const enemyPos = new THREE.Vector3(enemy.position[0], enemy.position[1] + 1, enemy.position[2]);
        const toEnemy = enemyPos.clone().sub(camera.position).normalize();
        const angle = forward.angleTo(toEnemy);
        
        if (angle < minAngle) {
          minAngle = angle;
          bestTarget = enemyPos;
        }
      });

      if (bestTarget) {
        // Calculate target rotation
        const lookAtMatrix = new THREE.Matrix4().lookAt(camera.position, bestTarget, camera.up);
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
        const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat, 'YXZ');
        
        // Nudge camera towards target
        const nudgeFactor = mobileInput.shooting ? 3.0 : 1.0; // Stronger pull when shooting
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetEuler.y, delta * nudgeFactor);
        camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetEuler.x, delta * nudgeFactor);
      }
    }

    // Ability Triggers
    if (keys.current.shift && Date.now() > dashCooldown) {
      triggerDash();
      const dashDir = direction.clone().normalize();
      if (dashDir.lengthSq() === 0) {
        camera.getWorldDirection(dashDir);
        dashDir.y = 0;
        dashDir.normalize();
      }
      body.current.applyImpulse({ x: dashDir.x * 40, y: 0, z: dashDir.z * 40 }, true);
    }

    if (keys.current.e && Date.now() > empCooldown) {
      triggerEMP();
    }

    // Update camera position to follow rigid body
    const pos = body.current.translation();
    camera.position.set(pos.x, pos.y + 1.6, pos.z); // Eye level (raised from 0.8)

    // Handle Zoom
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFOV = isAiming.current ? 75 / (weaponAttachments.scope.stats.zoomFactor || 1) : 75;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, delta * 10);
      camera.updateProjectionMatrix();
    }

    // Sync gun to camera
    if (gunGroupRef.current) {
      gunGroupRef.current.position.copy(camera.position);
      gunGroupRef.current.quaternion.copy(camera.quaternion);
    }
    
    // Recover recoil
    if (gunVisualRef.current) {
      gunVisualRef.current.position.z = THREE.MathUtils.lerp(gunVisualRef.current.position.z, -0.6, delta * 15);
      gunVisualRef.current.rotation.x = THREE.MathUtils.lerp(gunVisualRef.current.rotation.x, 0, delta * 15);
    }

    // Emit position to server
    const now = Date.now();
    if (now - lastEmitTime.current > 50) {
      updatePlayerPosition([pos.x, pos.y, pos.z], camera.rotation.y);
      lastEmitTime.current = now;
    }
  });

  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement && gameState === 'playing' && playerState === 'active') {
        shoot();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [gameState, playerState, camera, world, rapier, hitEnemy, addParticles, addLaser]);

  return (
    <>
      {!isTouchDevice.current && <PointerLockControls />}
      <RigidBody
        ref={body}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, 2, 0]}
        enabledRotations={[false, false, false]}
        userData={{ name: 'player' }}
        friction={0}
      >
        <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} friction={0} />
      </RigidBody>

      {/* First Person Tactical Emitter */}
      <group ref={gunGroupRef}>
        <group ref={gunVisualRef} position={[0.4, -0.4, -0.7]}>
          {/* Main Chassis */}
          <mesh position={[0, 0, 0.2]}>
            <boxGeometry args={[0.12, 0.18, 0.5]} />
            <meshStandardMaterial color="#050510" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Power Core */}
          <mesh position={[0, 0.05, 0.1]}>
            <boxGeometry args={[0.08, 0.08, 0.2]} />
            <meshBasicMaterial color="#00ffff" toneMapped={false} />
          </mesh>
          {/* Dual Barrels */}
          <mesh position={[-0.03, 0.02, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#111" metalness={1} roughness={0} />
          </mesh>
          <mesh position={[0.03, 0.02, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#111" metalness={1} roughness={0} />
          </mesh>
          {/* Holographic Sight */}
          {weaponAttachments.scope.id !== 'scope-none' && (
            <group position={[0, 0.12, 0.1]}>
              <mesh>
                <boxGeometry args={[0.06, 0.08, 0.1]} />
                <meshStandardMaterial color="#222" metalness={0.8} />
              </mesh>
              <mesh position={[0, 0.02, -0.05]}>
                <boxGeometry args={[0.01, 0.05, 0.01]} />
                <meshBasicMaterial color="#00ffff" opacity={0.5} transparent toneMapped={false} />
              </mesh>
              {weaponAttachments.scope.id === 'scope-2x' && (
                <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
                  <meshStandardMaterial color="#111" />
                </mesh>
              )}
            </group>
          )}
          
          {/* Grip */}
          {weaponAttachments.grip.id !== 'grip-none' && (
            <mesh position={[0, -0.15, 0.1]} rotation={[weaponAttachments.grip.id === 'grip-angled' ? 0.5 : 0, 0, 0]}>
              <boxGeometry args={[0.04, 0.15, 0.04]} />
              <meshStandardMaterial color="#222" metalness={0.5} />
            </mesh>
          )}

          {/* Barrel Extensions */}
          {weaponAttachments.barrel.id !== 'barrel-none' && (
            <group position={[0, 0.02, -0.45]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
                <meshStandardMaterial color={weaponAttachments.barrel.id === 'barrel-rapid' ? "#ff4400" : "#333"} metalness={0.8} />
              </mesh>
            </group>
          )}

          {/* Barrel Tip Reference */}
          <group ref={gunBarrelRef} position={[0, 0.02, -0.4]} />
        </group>
      </group>
    </>
  );
}
