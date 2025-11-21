import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

// Create a single noise instance to be shared or create per chunk if needed
// For consistency across chunks, we should use a seeded noise or just one global instance
const noise2D = createNoise2D();

interface TerrainChunkProps {
    position: [number, number, number];
    size: number;
    resolution: number;
    chunkX: number;
    chunkZ: number;
}

export function TerrainChunk({ position, size, resolution, chunkX, chunkZ }: TerrainChunkProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    const { geometry, colors } = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
        const count = geometry.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const positions = geometry.attributes.position;

        // Biome colors
        const deepWater = new THREE.Color("#1a3b6e");
        const water = new THREE.Color("#336699");
        const sand = new THREE.Color("#d2b48c");
        const grass = new THREE.Color("#3b7a3b");
        const forest = new THREE.Color("#1e4d2b");
        const rock = new THREE.Color("#5a5a5a");
        const snow = new THREE.Color("#ffffff");

        for (let i = 0; i < count; i++) {
            const x = positions.getX(i) + chunkX * size;
            const y = positions.getY(i) - chunkZ * size; // Flip Z for correct orientation

            // Multi-octave noise for detail
            let elevation = 0;
            let amplitude = 1;
            let frequency = 0.002;
            let maxElevation = 0;

            for (let j = 0; j < 4; j++) {
                elevation += noise2D(x * frequency, y * frequency) * amplitude;
                maxElevation += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }

            // Normalize and scale
            elevation = elevation / maxElevation; // -1 to 1

            // Apply height map
            let height = 0;
            if (elevation < -0.2) {
                // Water
                height = -2; // Flat water
            } else {
                // Land
                height = Math.pow((elevation + 0.2), 2) * 150;
            }

            positions.setZ(i, height); // Plane is rotated, so Z becomes Y in world space

            // Biome coloring
            let color = new THREE.Color();

            if (elevation < -0.4) color = deepWater;
            else if (elevation < -0.2) color = water;
            else if (elevation < -0.15) color = sand;
            else if (elevation < 0.2) color = grass;
            else if (elevation < 0.5) color = forest;
            else if (elevation < 0.8) color = rock;
            else color = snow;

            // Add some noise to color mixing for variety
            const noiseVal = noise2D(x * 0.05, y * 0.05) * 0.1;
            color.offsetHSL(0, 0, noiseVal);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.computeVertexNormals();
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        return { geometry, colors };
    }, [size, resolution, chunkX, chunkZ]);

    return (
        <mesh
            ref={meshRef}
            position={position}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            castShadow
        >
            <primitive object={geometry} attach="geometry" />
            <meshStandardMaterial
                vertexColors
                roughness={0.8}
                metalness={0.1}
                flatShading
            />
        </mesh>
    );
}
