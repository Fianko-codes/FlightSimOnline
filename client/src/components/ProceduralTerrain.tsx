import { useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useFlightSim } from "@/lib/stores/useFlightSim";
import { TerrainChunk } from "./TerrainChunk";

const CHUNK_SIZE = 1000;
const CHUNK_RESOLUTION = 64;
const RENDER_DISTANCE = 2; // Radius of chunks to render (2 = 5x5 grid)

export function ProceduralTerrain() {
    const { position } = useFlightSim();
    const [chunks, setChunks] = useState<{ key: string; x: number; z: number }[]>([]);

    useFrame(() => {
        const currentChunkX = Math.floor(position.x / CHUNK_SIZE);
        const currentChunkZ = Math.floor(position.z / CHUNK_SIZE);

        const newChunks = [];
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                const chunkX = currentChunkX + x;
                const chunkZ = currentChunkZ + z;
                newChunks.push({
                    key: `${chunkX},${chunkZ}`,
                    x: chunkX,
                    z: chunkZ,
                });
            }
        }

        // Only update if chunks have changed (simple check by key comparison of first/last)
        // For better performance, we should diff more intelligently, but this is a start
        const currentKeys = chunks.map(c => c.key).sort().join("|");
        const newKeys = newChunks.map(c => c.key).sort().join("|");

        if (currentKeys !== newKeys) {
            setChunks(newChunks);
        }
    });

    return (
        <group>
            {chunks.map((chunk) => (
                <TerrainChunk
                    key={chunk.key}
                    position={[chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE]}
                    size={CHUNK_SIZE}
                    resolution={CHUNK_RESOLUTION}
                    chunkX={chunk.x}
                    chunkZ={chunk.z}
                />
            ))}
        </group>
    );
}
