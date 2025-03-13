"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Constants for character movement
const MOVE_SPEED = 0.1;
const ROTATION_SPEED = 0.1;
const GRAVITY = 0.01;
const JUMP_FORCE = 0.3;
const CHARACTER_HEIGHT = 1.7;

// Key mapping for controls
const KEYS = {
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
  Space: "jump",
};

type KeysType = keyof typeof KEYS;
type MovementType = Record<string, boolean>;

interface CharacterProps {
  position: [number, number, number];
  onMove: (position: THREE.Vector3) => void;
}

export function Character({ position, onMove }: CharacterProps) {
  // Reference to the character mesh
  const characterRef = useRef<THREE.Group>(null);

  // Movement state
  const [movement, setMovement] = useState<MovementType>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

  // Physics state
  const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));
  const [isGrounded, setIsGrounded] = useState(true);

  // Direction the character is facing
  const direction = useRef(new THREE.Vector3());

  // Camera for following the character
  const { camera } = useThree();

  // Load character model (using a simple box for now)
  // In a real implementation, you would use useGLTF to load a 3D model

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.code as KeysType;
    if (KEYS[key]) {
      setMovement((prev) => ({ ...prev, [KEYS[key]]: true }));
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.code as KeysType;
    if (KEYS[key]) {
      setMovement((prev) => ({ ...prev, [KEYS[key]]: false }));
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Update character position and rotation each frame
  useFrame(() => {
    if (!characterRef.current) return;

    // Calculate movement direction
    direction.current.set(0, 0, 0);

    if (movement.forward) direction.current.z -= 1;
    if (movement.backward) direction.current.z += 1;
    if (movement.left) direction.current.x -= 1;
    if (movement.right) direction.current.x += 1;

    // Normalize direction vector
    if (direction.current.length() > 0) {
      direction.current.normalize();
    }

    // Apply movement
    const newVelocity = velocity.clone();

    // Apply horizontal movement
    newVelocity.x = direction.current.x * MOVE_SPEED;
    newVelocity.z = direction.current.z * MOVE_SPEED;

    // Apply gravity and jumping
    if (isGrounded && movement.jump) {
      newVelocity.y = JUMP_FORCE;
      setIsGrounded(false);
    } else if (!isGrounded) {
      newVelocity.y -= GRAVITY;
    }

    // Check if character is on the ground
    if (characterRef.current.position.y <= CHARACTER_HEIGHT / 2) {
      characterRef.current.position.y = CHARACTER_HEIGHT / 2;
      newVelocity.y = 0;
      setIsGrounded(true);
    }

    // Update position
    characterRef.current.position.add(newVelocity);

    // Update velocity state
    setVelocity(newVelocity);

    // Rotate character to face movement direction
    if (direction.current.length() > 0) {
      const targetRotation = Math.atan2(
        direction.current.x,
        direction.current.z,
      );
      const currentRotation = characterRef.current.rotation.y;

      // Smoothly rotate towards target direction
      characterRef.current.rotation.y = THREE.MathUtils.lerp(
        currentRotation,
        targetRotation,
        ROTATION_SPEED,
      );
    }

    // Update camera position to follow character
    camera.position.x = characterRef.current.position.x;
    camera.position.z = characterRef.current.position.z + 10;
    camera.lookAt(characterRef.current.position);

    // Notify parent component about position change for terrain deformation
    onMove(characterRef.current.position.clone());
  });

  return (
    <group
      ref={characterRef}
      position={[position[0], CHARACTER_HEIGHT / 2, position[2]]}
    >
      {/* Simple character representation - replace with actual model in production */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.5, CHARACTER_HEIGHT, 0.5]} />
        <meshStandardMaterial color="#1E88E5" />
      </mesh>
    </group>
  );
}
