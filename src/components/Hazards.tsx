import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { soundManager } from '../lib/sounds';

export function Hazards() {
  const hazards = useGameStore(state => state.hazards);

  return (
    <group>
      {hazards.map(h => (
        <Hazard key={h.id} data={h} />
      ))}
    </group>
  );
}

function Hazard({ data }: { data: any }) {
  if (data.type === 'laser') {
    return <LaserGrid data={data} />;
  }
  if (data.type === 'disruptor') {
    return <DisruptorPillar data={data} />;
  }
  return <ToxicGas data={data} />;
}

function LaserGrid({ data }: { data: any }) {
  const ref = useRef<THREE.Group>(null);
  const distortionRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const prevActive = useRef(data.isActive);

  useEffect(() => {
    if (data.isActive !== prevActive.current) {
      if (data.isActive) {
        soundManager.play('alert', 0.3);
      } else {
        soundManager.play('hover', 0.2);
      }
      prevActive.current = data.isActive;
    }
  }, [data.isActive]);

  useFrame((state) => {
    const now = Date.now();
    const timeSinceToggle = now - data.lastToggleTime;
    const isCharging = !data.isActive && timeSinceToggle > 2000;
    const t = state.clock.getElapsedTime();

    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        if (child.name === 'beam') {
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (data.isActive) {
            mat.opacity = 0.4 + Math.sin(t * 15 + i) * 0.2;
            child.visible = true;
            // Pulsing scale for "glow" effect
            const s = 1 + Math.sin(t * 20) * 0.05;
            child.scale.set(s, 1, s);
          } else if (isCharging) {
            // Flickering charge effect
            mat.opacity = Math.random() > 0.5 ? 0.3 : 0.1;
            child.visible = true;
            child.scale.set(0.5, 1, 0.5);
          } else {
            child.visible = false;
          }
        }
      });
    }

    if (flashRef.current) {
      const flashTime = 2800; // Flash 200ms before activation (3000ms interval)
      if (!data.isActive && timeSinceToggle > flashTime) {
        flashRef.current.visible = true;
        (flashRef.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * 100) * 0.4 + 0.6;
        flashRef.current.scale.setScalar(1 + Math.sin(t * 50) * 0.1);
      } else {
        flashRef.current.visible = false;
      }
    }

    if (distortionRef.current) {
      distortionRef.current.visible = data.isActive;
      if (data.isActive) {
        distortionRef.current.scale.set(
          1 + Math.sin(t * 10) * 0.02,
          1,
          1 + Math.cos(t * 10) * 0.02
        );
      }
    }
  });

  return (
    <group position={data.position}>
      <group ref={ref}>
        {/* Vertical Laser Beams */}
        {Array.from({ length: 3 }).map((_, i) => (
          <group key={i} position={[(i - 1) * (data.size[0] / 2), 0, 0]}>
            <mesh name="beam" position={[0, data.size[1] / 2, 0]}>
              <boxGeometry args={[0.1, data.size[1], data.size[2]]} />
              <meshBasicMaterial color="#ff0000" transparent opacity={0.5} toneMapped={false} />
            </mesh>
            {/* Bright Beam Core */}
            <mesh position={[0, data.size[1] / 2, 0]} visible={data.isActive}>
              <boxGeometry args={[0.02, data.size[1], data.size[2]]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Intense Flash Mesh */}
      <mesh ref={flashRef} position={[0, data.size[1] / 2, 0]} visible={false}>
        <boxGeometry args={[data.size[0], data.size[1], data.size[2]]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.8} toneMapped={false} />
      </mesh>

      {/* Distortion / Heat Haze Effect */}
      <group ref={distortionRef}>
        <mesh position={[0, data.size[1] / 2, 0]}>
          <boxGeometry args={[data.size[0] + 0.2, data.size[1], data.size[2] + 0.1]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.05} toneMapped={false} />
        </mesh>
      </group>
      
      {/* Base emitters */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[data.size[0], 0.2, data.size[2]]} />
        <meshStandardMaterial color="#222" metalness={0.8} />
      </mesh>
    </group>
  );
}

function ToxicGas({ data }: { data: any }) {
  const ref = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Group>(null);

  const particles = useRef(Array.from({ length: 24 }).map(() => ({
    initialY: Math.random() * data.size[1],
    radius: (0.1 + Math.random() * 0.9) * (data.size[0] / 2),
    speed: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 1.2 + 0.6),
    verticalSpeed: Math.random() * 0.8 + 0.3,
    offset: Math.random() * Math.PI * 2,
    size: Math.random() * 0.4 + 0.1
  })));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.scale.set(
        1 + Math.sin(t * 1.5) * 0.03,
        1 + Math.cos(t * 1.2) * 0.05,
        1 + Math.sin(t * 1.7) * 0.03
      );
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + Math.sin(t * 3) * 0.05;
    }

    if (coreRef.current) {
        coreRef.current.rotation.y += 0.01;
        coreRef.current.rotation.x += 0.005;
        coreRef.current.scale.setScalar(0.9 + Math.sin(t * 4) * 0.1);
    }

    if (particlesRef.current) {
      particlesRef.current.children.forEach((p, i) => {
        const data_p = particles.current[i];
        // Complex turbulent swirling
        const angle = t * data_p.speed + data_p.offset;
        const drift = Math.sin(t * 0.5 + data_p.offset) * 2;
        p.position.x = Math.cos(angle) * (data_p.radius + drift);
        p.position.z = Math.sin(angle) * (data_p.radius + drift);
        // Vertical bobbing with more range
        p.position.y = data_p.initialY + Math.sin(t * data_p.verticalSpeed + data_p.offset) * 0.8;
        
        p.rotation.y += 0.04;
        p.rotation.z += 0.02;
      });
    }
  });

  return (
    <group position={data.position}>
      {/* Outer Fog Shell (Refractive/Distortion Feel) */}
      <mesh ref={ref} position={[0, data.size[1] / 2, 0]}>
        <boxGeometry args={data.size} />
        <meshBasicMaterial color="#00ff44" transparent opacity={0.15} toneMapped={false} />
      </mesh>

      {/* Internal Dense Core */}
      <mesh ref={coreRef} position={[0, data.size[1] / 2, 0]}>
        <sphereGeometry args={[data.size[0] / 3, 16, 16]} />
        <meshBasicMaterial color="#00aa33" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      
      <group ref={particlesRef}>
        {particles.current.map((p, i) => (
          <mesh key={i} scale={p.size}>
            <dodecahedronGeometry args={[1]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#44ff88" : "#22cc66"} transparent opacity={0.7} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function DisruptorPillar({ data }: { data: any }) {
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef1.current) {
      ringRef1.current.rotation.y = t * 2;
      ringRef1.current.rotation.z = Math.sin(t) * 0.5;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.y = -t * 1.5;
      ringRef2.current.rotation.x = Math.cos(t) * 0.5;
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(t * 10) * 0.2;
      beamRef.current.scale.set(
        1 + Math.sin(t * 20) * 0.1,
        1,
        1 + Math.sin(t * 20) * 0.1
      );
    }
  });

  return (
    <group position={data.position}>
      {/* Pillar Core */}
      <mesh position={[0, data.size[1] / 2, 0]}>
        <cylinderGeometry args={[0.5, 0.8, data.size[1], 8]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Energy Beam */}
      <mesh ref={beamRef} position={[0, data.size[1] / 2, 0]}>
        <cylinderGeometry args={[0.2, 0.2, data.size[1] + 1, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      
      {/* Rotating Induction Rings */}
      <mesh ref={ringRef1} position={[0, data.size[1] * 0.8, 0]}>
        <torusGeometry args={[1.5, 0.1, 16, 32]} />
        <meshStandardMaterial color="#333" metalness={1} />
      </mesh>
      <mesh ref={ringRef2} position={[0, data.size[1] * 0.4, 0]}>
        <torusGeometry args={[2, 0.1, 16, 32]} />
        <meshStandardMaterial color="#333" metalness={1} />
      </mesh>
      
      {/* Ground Base */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[2, 2.5, 0.5, 8]} />
        <meshStandardMaterial color="#222" metalness={0.8} />
      </mesh>
    </group>
  );
}
