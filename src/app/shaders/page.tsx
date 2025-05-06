"use client";
import * as THREE from "three";
import * as React from "react";
import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import TweetGLSLVisualization from "~/components/YoheiShader";
import type { ThreeElements } from "@react-three/fiber";
import SeascapeGLSLVisualization from "~/components/SeaScapeShader";
import WaterGLSLVisualization from "~/components/WaterVisualizationShader";
// import RainforestGLSLVisualization from "~/components/RainforestShader";
import DVDShader from "~/components/DVDShader";

type BoxProps = ThreeElements["mesh"];

function Box(props: BoxProps) {
  // This reference will give us direct access to the THREE.Mesh object
  const ref = useRef<THREE.Mesh>(null!);
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // Rotate mesh every frame, this is outside of React without overhead
  useFrame((state, delta) => (ref.current.rotation.x += 0.01));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}

export default function page() {
  return (
    // <TweetGLSLVisualization />
    // <SeascapeGLSLVisualization />
    // <WaterGLSLVisualization />
    // <RainforestGLSLVisualization />
    <DVDShader />
    // <div className="h-screen w-full">
    //   <Canvas>
    //     <ambientLight intensity={Math.PI / 2} />
    //     <spotLight
    //       position={[10, 10, 10]}
    //       angle={0.15}
    //       penumbra={1}
    //       decay={0}
    //       intensity={Math.PI}
    //     />
    //     <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
    //     <Box position={[-1.2, 0, 0]} />
    //     <Box position={[1.2, 0, 0]} />
    //     <OrbitControls />
    //   </Canvas>
    // </div>
  );
}
