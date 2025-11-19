import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useMemo } from "react";

export function Environment() {
  // Load textures - check what's available first
  let grassTexture;
  try {
    grassTexture = useTexture("/textures/grass.png");
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(100, 100);
  } catch (e) {
    console.log("Grass texture not available");
  }

  // Create a grid pattern for the terrain
  const gridHelper = useMemo(() => {
    return <gridHelper args={[2000, 100, "#1a5f1a", "#2d7a2d"]} position={[0, 0, 0]} />;
  }, []);

  return (
    <group>
      {/* Sun/Directional Light */}
      <directionalLight
        position={[100, 100, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.4} />
      
      {/* Hemisphere light for sky/ground gradient */}
      <hemisphereLight
        color="#87CEEB"
        groundColor="#228B22"
        intensity={0.6}
      />

      {/* Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000, 50, 50]} />
        <meshStandardMaterial
          color={grassTexture ? "#ffffff" : "#2d7a2d"}
          map={grassTexture || null}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Grid helper for better depth perception */}
      {gridHelper}

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[1000, 32, 32]} />
        <meshBasicMaterial
          color="#87CEEB"
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>

      {/* Fog for atmosphere */}
      <fog attach="fog" args={["#87CEEB", 100, 800]} />

      {/* Some scattered clouds (simple boxes for performance) */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 1000;
        const y = 40 + Math.random() * 60;
        const z = (Math.random() - 0.5) * 1000;
        const scale = 10 + Math.random() * 20;
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[scale, scale * 0.3, scale * 0.6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}
