import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ObjectiveData } from '../store';

interface ObjectiveProps {
  data: ObjectiveData;
}

export function Objective({ data }: ObjectiveProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
      const scale = 1 + Math.sin(t * 2) * 0.05;
      ringRef.current.scale.set(scale, scale, 1);
    }
    if (coreRef.current) {
      coreRef.current.position.y = 1 + Math.sin(t * 3) * 0.2;
      coreRef.current.rotation.y = t;
    }
  });

  const progressColor = data.controlledBy === 'player' 
    ? '#00ff88' 
    : (data.isBeingCaptured ? '#00ffff' : (data.progress > 0 ? '#4488ff' : '#444444'));

  return (
    <group position={data.position}>
      {/* Capture Zone Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[7.8, 8, 32]} />
        <meshBasicMaterial color={progressColor} transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {/* Ground Decal / Glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[8, 16]} />
        <meshBasicMaterial color={progressColor} transparent opacity={0.05} toneMapped={false} />
      </mesh>

      {/* Central Core Structure */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]}>
          {data.type === 'capture' ? (
            <cylinderGeometry args={[0.5, 0.8, 1, 6]} />
          ) : (
            <boxGeometry args={[1.2, 0.8, 2]} />
          )}
          <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
        </mesh>
        
        <mesh ref={coreRef} position={[0, 1, 0]}>
          {data.type === 'capture' ? (
            <octahedronGeometry args={[0.6]} />
          ) : (
            <sphereGeometry args={[0.5, 16, 16]} />
          )}
          <meshBasicMaterial color={progressColor} toneMapped={false} />
        </mesh>

        {/* Progress Indicator Bar (3D) */}
        <group position={[0, 2.5, 0]}>
          <mesh>
            <boxGeometry args={[2, 0.1, 0.1]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.5} />
          </mesh>
          <mesh position={[(-1 + (data.progress / 100)), 0, 0.01]}>
            <boxGeometry args={[(data.progress / 100) * 2, 0.1, 0.1]} />
            <meshBasicMaterial color={progressColor} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
