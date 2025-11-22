import * as THREE from "three";
import { useMemo } from "react";

export function Environment() {
  // Pre-calculate cloud positions (avoid Math.random in render)
  const clouds = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 1000,
      y: 40 + Math.random() * 60,
      z: (Math.random() - 0.5) * 1000,
      scale: 10 + Math.random() * 20
    }));
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
          color="#2d7a2d"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Grid helper for better depth perception */}
      <gridHelper args={[2000, 100, "#1a5f1a", "#2d7a2d"]} position={[0, 0, 0]} />

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

      {/* Scattered clouds */}
      {clouds.map((cloud) => (
        <mesh key={cloud.id} position={[cloud.x, cloud.y, cloud.z]}>
          <boxGeometry args={[cloud.scale, cloud.scale * 0.3, cloud.scale * 0.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}
