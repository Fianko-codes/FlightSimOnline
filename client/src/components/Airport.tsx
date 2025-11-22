import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

interface AirportProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}

export function Airport({ position, rotation = [0, 0, 0], scale = 1 }: AirportProps) {
    const [model, setModel] = useState<THREE.Group | null>(null);

    useEffect(() => {
        const loader = new GLTFLoader();
        // Use the specific airport model path requested
        loader.load(
            "/models/airport/scene.gltf",
            (gltf) => {
                const scene = gltf.scene;
                // Enable shadows
                scene.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Ensure materials are solid
                        if (child.material) {
                            (child.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
                        }
                    }
                });
                setModel(scene);
            },
            undefined,
            (error) => {
                console.error("Error loading airport model:", error);
            }
        );
    }, []);

    if (!model) return null;

    return (
        <primitive
            object={model}
            position={position}
            rotation={rotation}
            scale={[scale, scale, scale]}
        />
    );
}
