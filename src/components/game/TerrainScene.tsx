"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  useTexture,
  Sky,
  Stars,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { Character } from "./Character";
import { Terrain } from "./Terrain";

// Constants for the scene
const CAMERA_POSITION = [0, 5, 10] as const;
const LIGHT_INTENSITY = 1.5;
const AMBIENT_INTENSITY = 0.5;

export default function TerrainScene() {
  return (
    <Canvas shadows>
      <Scene />
    </Canvas>
  );
}

function Scene() {
  const [characterPosition, setCharacterPosition] = useState(
    new THREE.Vector3(0, 0, 0),
  );

  // Handle character movement and update position for terrain deformation
  const handleCharacterMove = useCallback((newPosition: THREE.Vector3) => {
    setCharacterPosition(newPosition);
  }, []);

  return (
    <>
      {/* Environment */}
      <color attach="background" args={["#87CEEB"]} />
      <fog attach="fog" args={["#87CEEB", 30, 100]} />
      <ambientLight intensity={AMBIENT_INTENSITY} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={LIGHT_INTENSITY}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Sky
        distance={450000}
        sunPosition={[10, 5, 10]}
        inclination={0.5}
        azimuth={0.25}
      />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
      />

      {/* Camera and Controls */}
      <PerspectiveCamera makeDefault position={CAMERA_POSITION} fov={60} />
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={5}
        maxDistance={30}
      />

      {/* Game Elements */}
      <Character position={[0, 0, 0]} onMove={handleCharacterMove} />
      <Terrain deformationPoint={characterPosition} />
    </>
  );
}
