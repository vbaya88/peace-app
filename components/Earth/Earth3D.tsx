"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";

// ─── Earth Surface ────────────────────────────────────────────────────────────
function EarthSurface() {
  const meshRef = useRef<THREE.Mesh>(null);

  const [earthMap, earthNormal, earthSpecular, earthClouds] = useTexture([
    "/textures/earth_daymap.jpg",
    "/textures/earth_normal.jpg",
    "/textures/earth_specular.jpg",
    "/textures/earth_clouds.png",
  ]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef} name="earth-surface">
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        map={earthMap}
        normalMap={earthNormal}
        normalScale={new THREE.Vector2(0.1, 0.1)}
        specularMap={earthSpecular}
        specular={new THREE.Color("gray")}
        shininess={10}
      />
    </mesh>
  );
}

// ─── Cloud Layer ─────────────────────────────────────────────────────────────
function CloudLayer() {
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [cloudTexture] = useTexture(["/textures/earth_clouds.png"]);

  useFrame(() => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0015;
    }
  });

  return (
    <mesh ref={cloudsRef} scale={[1.01, 1.01, 1.01]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        map={cloudTexture}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Atmosphere Glow ─────────────────────────────────────────────────────────
function Atmosphere() {
  return (
    <Sphere args={[1.15, 64, 64]}>
      <meshBasicMaterial
        color="#4fa3d8"
        transparent
        opacity={0.06}
        side={THREE.BackSide}
      />
    </Sphere>
  );
}

// ─── Inner Core (subtle glow) ─────────────────────────────────────────────────
function CoreGlow() {
  return (
    <Sphere args={[1.02, 32, 32]}>
      <meshBasicMaterial
        color="#1a4a8a"
        transparent
        opacity={0.15}
        side={THREE.BackSide}
      />
    </Sphere>
  );
}

// ─── Main Earth Scene ────────────────────────────────────────────────────────
function EarthScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.2}
        color="#fff8e7"
      />
      <pointLight position={[-10, -5, -10]} intensity={0.1} color="#334477" />

      {/* Earth */}
      <EarthSurface />
      <CloudLayer />
      <CoreGlow />
      <Atmosphere />

      {/* Controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={1.8}
        maxDistance={5}
        autoRotate
        autoRotateSpeed={0.4}
        zoomSpeed={0.6}
      />
    </>
  );
}

// ─── Exported Canvas Component ───────────────────────────────────────────────
interface Earth3DProps {
  className?: string;
}

export default function Earth3D({ className }: Earth3DProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
      >
        <EarthScene />
      </Canvas>
    </div>
  );
}
