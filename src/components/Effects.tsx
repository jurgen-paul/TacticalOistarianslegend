/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import * as THREE from 'three';
import { useRef, useMemo, useEffect } from 'react';

export function Effects() {
  const lasers = useGameStore(state => state.lasers);
  const particles = useGameStore(state => state.particles);
  const projectiles = useGameStore(state => state.projectiles);
  const empActiveUntil = useGameStore(state => state.empActiveUntil);
  const playerPos = useGameStore(state => state.playerPosition);

  return (
    <>
      {lasers.map(laser => (
        <group key={laser.id}>
          <Laser start={laser.start} end={laser.end} color={laser.color} />
          <MuzzleFlash position={laser.start} color={laser.color} />
        </group>
      ))}
      {projectiles.map(p => (
        <Projectile key={p.id} position={p.position} color={p.color} />
      ))}
      {particles.map(p => (
        <ParticleBurst key={p.id} position={p.position} color={p.color} />
      ))}
      {Date.now() < empActiveUntil && (
        <EMPBlast position={playerPos} />
      )}
    </>
  );
}

function EMPBlast({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.scale.addScalar(delta * 100);
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity -= delta * 2;
    }
  });

  return (
    <mesh ref={ref} position={[position[0], position[1] + 1, position[2]]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={0.5} wireframe />
    </mesh>
  );
}

function MuzzleFlash({ position, color }: { position: [number, number, number], color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.scale.multiplyScalar(1 - delta * 15);
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity -= delta * 10;
    }
    if (lightRef.current) {
      lightRef.current.intensity *= (1 - delta * 20);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={1} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Laser({ start, end, color }: { start: [number, number, number], end: [number, number, number], color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  
  const { position, rotation, length } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const length = s.distanceTo(e);
    const position = s.clone().lerp(e, 0.5);
    
    const direction = e.clone().sub(s).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction
    );
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    
    return { position, rotation, length };
  }, [start, end]);

  useFrame((_, delta) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 5);
      ref.current.scale.x *= (1 - delta * 2);
      ref.current.scale.y *= (1 - delta * 2);
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <boxGeometry args={[0.15, 0.15, length]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={1} />
    </mesh>
  );
}

function Projectile({ position, color }: { position: [number, number, number], color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z += 5 * state.clock.getDelta();
      ref.current.rotation.x += 2 * state.clock.getDelta();
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function ParticleBurst({ position, color }: { position: [number, number, number], color: string }) {
  const group = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  
  const particles = useMemo(() => {
    return Array.from({ length: 10 }).map(() => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      ),
      size: Math.random() * 0.1 + 0.05
    }));
  }, []);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.children.forEach((child, i) => {
        if (i < particles.length) {
          child.position.addScaledVector(particles[i].velocity, delta);
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, mat.opacity - delta * 2.5);
          child.scale.setScalar(Math.max(0.001, child.scale.x - delta * 1.5));
        }
      });
    }
    if (shockwaveRef.current) {
      shockwaveRef.current.scale.addScalar(delta * 15);
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity -= delta * 4;
    }
  });

  return (
    <group position={position}>
      <group ref={group}>
        {particles.map((p, i) => (
          <mesh key={i}>
            <boxGeometry args={[p.size, p.size, p.size]} />
            <meshBasicMaterial color={color} transparent opacity={1} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.2, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
