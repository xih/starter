"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// Constants for terrain generation and deformation
const TERRAIN_SIZE = 50;
const GRID_RESOLUTION = 64;
const DEFORMATION_RADIUS = 1.5;
const DEFORMATION_STRENGTH = 0.3;
const DEFORMATION_SMOOTHNESS = 0.8;

// Chunk management constants
const CHUNK_SIZE = 20;
const CHUNK_OVERLAP = 1;
const VISIBLE_CHUNKS_RADIUS = 1;

interface TerrainProps {
  deformationPoint: THREE.Vector3;
}

interface ChunkData {
  x: number;
  z: number;
  key: string;
}

export function Terrain({ deformationPoint }: TerrainProps) {
  // Reference to all terrain chunks
  const chunksRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Track active chunks
  const [chunks, setChunks] = useState<ChunkData[]>([]);

  // Load textures
  const textures = useTexture({
    map: "/textures/snow/snow-color.jpg",
    normalMap: "/textures/snow/snow-normal.jpg",
    roughnessMap: "/textures/snow/snow-roughness.jpg",
    aoMap: "/textures/snow/snow-ao.jpg",
    displacementMap: "/textures/snow/snow-displacement.jpg",
  });

  // Apply texture repetition
  useEffect(() => {
    Object.values(textures).forEach((texture) => {
      if (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(TERRAIN_SIZE / 2, TERRAIN_SIZE / 2);
      }
    });
  }, [textures]);

  // Generate a unique key for each chunk based on its coordinates
  const getChunkKey = useCallback((x: number, z: number) => {
    return `${x},${z}`;
  }, []);

  // Deform the terrain mesh at a specific point
  const deformTerrain = useCallback(
    (point: THREE.Vector3, mesh: THREE.Mesh) => {
      if (!mesh || !mesh.geometry) return;

      // Skip if the point is above the deformation threshold
      if (point.y > 2) return;

      const geometry = mesh.geometry;
      const positionAttribute = geometry.getAttribute("position");
      if (!positionAttribute) return;

      // Temporary vector for calculations
      const tempVector = new THREE.Vector3();
      let hasDeformation = false;

      // Process each vertex in the chunk
      for (let i = 0; i < positionAttribute.count; i++) {
        // Get vertex position in local space
        tempVector.fromBufferAttribute(positionAttribute, i);

        // Convert to world coordinates
        const worldVertex = tempVector.clone().applyMatrix4(mesh.matrixWorld);

        // Calculate distance to deformation point (only in XZ plane)
        const dx = worldVertex.x - point.x;
        const dz = worldVertex.z - point.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Apply deformation if within radius
        if (distance < DEFORMATION_RADIUS) {
          // Calculate deformation strength based on distance
          const influence = 1 - distance / DEFORMATION_RADIUS;
          const deformation =
            DEFORMATION_STRENGTH * Math.pow(influence, DEFORMATION_SMOOTHNESS);

          // Apply deformation (only to Y coordinate)
          tempVector.y -= deformation;

          // Update the position attribute
          positionAttribute.setXYZ(i, tempVector.x, tempVector.y, tempVector.z);

          hasDeformation = true;
        }
      }

      // Update geometry if deformed
      if (hasDeformation) {
        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();
      }
    },
    [],
  );

  // Update visible chunks based on character position
  useEffect(() => {
    // Calculate current chunk
    const centerX = Math.floor(deformationPoint.x / CHUNK_SIZE);
    const centerZ = Math.floor(deformationPoint.z / CHUNK_SIZE);

    // Generate new chunks data
    const newChunks: ChunkData[] = [];

    // Create chunks in a square around the character
    for (
      let x = centerX - VISIBLE_CHUNKS_RADIUS;
      x <= centerX + VISIBLE_CHUNKS_RADIUS;
      x++
    ) {
      for (
        let z = centerZ - VISIBLE_CHUNKS_RADIUS;
        z <= centerZ + VISIBLE_CHUNKS_RADIUS;
        z++
      ) {
        newChunks.push({
          x,
          z,
          key: getChunkKey(x, z),
        });
      }
    }

    setChunks(newChunks);
  }, [deformationPoint.x, deformationPoint.z, getChunkKey]);

  // Store references to chunks and handle deformation
  const setChunkRef = useCallback((mesh: THREE.Mesh | null, key: string) => {
    if (mesh) {
      chunksRef.current.set(key, mesh);
    } else {
      chunksRef.current.delete(key);
    }
  }, []);

  // Apply deformation when character moves
  useEffect(() => {
    chunksRef.current.forEach((mesh) => {
      deformTerrain(deformationPoint, mesh);
    });
  }, [deformationPoint, deformTerrain]);

  return (
    <group>
      {chunks.map((chunk) => (
        <mesh
          key={chunk.key}
          ref={(mesh) => setChunkRef(mesh, chunk.key)}
          position={[chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry
            args={[
              CHUNK_SIZE + CHUNK_OVERLAP * 2,
              CHUNK_SIZE + CHUNK_OVERLAP * 2,
              GRID_RESOLUTION,
              GRID_RESOLUTION,
            ]}
          />
          <meshStandardMaterial
            {...textures}
            displacementScale={0.5}
            color="#ffffff"
          />
        </mesh>
      ))}
    </group>
  );
}
