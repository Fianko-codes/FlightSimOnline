import * as THREE from "three";
import { useState, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";

const CHUNK_SIZE = 2000;
const RENDER_DISTANCE = 2; // Radius of chunks to render (1 = 3x3, 2 = 5x5)

// Simple pseudo-random number generator for deterministic chunks
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function TerrainChunk({ x, z }: { x: number; z: number }) {
  const position = useMemo(() => [x * CHUNK_SIZE, 0, z * CHUNK_SIZE] as [number, number, number], [x, z]);

  // Deterministic clouds for this chunk
  const clouds = useMemo(() => {
    const chunkSeed = x * 1000 + z;
    const cloudCount = 10 + Math.floor(seededRandom(chunkSeed) * 20);

    return Array.from({ length: cloudCount }).map((_, i) => {
      const seed = chunkSeed + i;
      return {
        x: (seededRandom(seed) - 0.5) * CHUNK_SIZE,
        y: 100 + seededRandom(seed + 1) * 200,
        z: (seededRandom(seed + 2) - 0.5) * CHUNK_SIZE,
        scale: 5 + seededRandom(seed + 3) * 15,
      };
    });
  }, [x, z]);

  return (
    <group position={position}>
      {/* Ground Plane for this chunk */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[CHUNK_SIZE, CHUNK_SIZE]} />
        <meshStandardMaterial color="#2d7a2d" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Simple Clouds */}
      {clouds.map((cloud, i) => (
        <mesh key={i} position={[cloud.x, cloud.y, cloud.z]}>
          <boxGeometry args={[cloud.scale * 3, cloud.scale, cloud.scale * 2]} />
          <meshStandardMaterial color="white" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function Environment() {
  const { camera } = useThree();
  const [currentChunk, setCurrentChunk] = useState({ x: 0, z: 0 });

  useFrame(() => {
    // Calculate which chunk the camera is currently in
    const chunkX = Math.round(camera.position.x / CHUNK_SIZE);
    const chunkZ = Math.round(camera.position.z / CHUNK_SIZE);

    if (chunkX !== currentChunk.x || chunkZ !== currentChunk.z) {
      setCurrentChunk({ x: chunkX, z: chunkZ });
    }
  });

  // Calculate visible chunks based on render distance
  const visibleChunks = useMemo(() => {
    const chunks = [];
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
      for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
        chunks.push({
          x: currentChunk.x + x,
          z: currentChunk.z + z,
          key: `${currentChunk.x + x},${currentChunk.z + z}`
        });
      }
    }
    return chunks;
  }, [currentChunk]);

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 100, 50]} intensity={1.5} castShadow />

      {/* Sky & Atmosphere */}
      <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
      <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <fog attach="fog" args={["#87CEEB", 200, CHUNK_SIZE * RENDER_DISTANCE]} />

      {/* Render Visible Chunks */}
      {visibleChunks.map((chunk) => (
        <TerrainChunk key={chunk.key} x={chunk.x} z={chunk.z} />
      ))}
    </group>
  );
}
