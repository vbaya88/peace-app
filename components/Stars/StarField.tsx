"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Star {
  position: THREE.Vector3;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  color: THREE.Color;
}

function Stars() {
  const pointsRef = useRef<THREE.Points>(null);
  const COUNT = 6000;

  const { positions, sizes, opacities, speeds, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const opacities = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    const colors = new Float32Array(COUNT * 3);

    const palette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#b8d4ff"),
      new THREE.Color("#ffd6a5"),
      new THREE.Color("#d5f0ff"),
      new THREE.Color("#fffbe6"),
    ];

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 30 + Math.random() * 70;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = Math.random() * 1.5 + 0.3;
      opacities[i] = Math.random() * 0.7 + 0.3;
      speeds[i] = Math.random() * 0.5 + 0.2;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return { positions, sizes, opacities, speeds, colors };
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.008;
      pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.003) * 0.02;
    }
  });

  const posAttr = useMemo(() => new THREE.BufferAttribute(positions, 3), [positions]);
  const colAttr = useMemo(() => new THREE.BufferAttribute(colors, 3), [colors]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <primitive object={posAttr} attach="attributes-position" />
        <primitive object={colAttr} attach="attributes-color" />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

interface StarFieldProps {
  className?: string;
}

export default function StarField({ className }: StarFieldProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0} />
        <Stars />
      </Canvas>
    </div>
  );
}
