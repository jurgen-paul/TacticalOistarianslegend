import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface HealthBarProps {
  current: number;
  max: number;
  width?: number;
  height?: number;
  position?: [number, number, number];
}

export function HealthBar({ current, max, width = 1.2, height = 0.12, position = [0, 2.2, 0] }: HealthBarProps) {
  const innerRef = useRef<THREE.Mesh>(null);
  const healthPercent = Math.max(0, Math.min(1, current / max));

  useFrame((state, delta) => {
    if (innerRef.current) {
      innerRef.current.scale.x = THREE.MathUtils.lerp(innerRef.current.scale.x, healthPercent, delta * 10);
      // Offset position to keep it left-aligned as it scales
      innerRef.current.position.x = -width / 2 + (width * innerRef.current.scale.x) / 2;
    }
  });

  return (
    <Billboard position={position}>
      {/* Background */}
      <mesh>
        <planeGeometry args={[width + 0.05, height + 0.05]} />
        <meshBasicMaterial color="#000" transparent opacity={0.6} />
      </mesh>
      {/* Empty Bar */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#333" transparent opacity={0.8} />
      </mesh>
      {/* Health Bar */}
      <mesh ref={innerRef} position={[0, 0, 0.02]} scale={[healthPercent, 1, 1]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={healthPercent > 0.5 ? "#00ffff" : healthPercent > 0.2 ? "#ffaa00" : "#ff0044"} />
      </mesh>
    </Billboard>
  );
}
