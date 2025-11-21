import * as THREE from "three";
import { ProceduralTerrain } from "./ProceduralTerrain";

export function Environment() {
  return (
    <group>
      {/* Sun/Directional Light */}
      <directionalLight
        position={[100, 100, 50]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={2000}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
        shadow-bias={-0.0005}
      />

      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.5} color="#b0c4de" />

      {/* Hemisphere light for sky/ground gradient */}
      <hemisphereLight
        color="#87CEEB"
        groundColor="#3b7a3b"
        intensity={0.8}
      />

      {/* Procedural Infinite Terrain */}
      <ProceduralTerrain />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[4000, 32, 32]} />
        <meshBasicMaterial
          color="#87CEEB"
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>

      {/* Fog for atmosphere - blends terrain into sky */}
      <fog attach="fog" args={["#87CEEB", 200, 2500]} />
    </group>
  );
}
