import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useFlightSim } from "@/lib/stores/useFlightSim";

export function FlightCamera() {
  const { camera } = useThree();
  const { position, rotation, cameraView } = useFlightSim();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    // Initialize camera position
    camera.position.set(0, 60, 30);
  }, [camera]);

  useFrame(() => {
    const aircraftPos = new THREE.Vector3(position.x, position.y, position.z);
    const aircraftEuler = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ');
    
    // Calculate forward, up, and right vectors
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(aircraftEuler);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(aircraftEuler);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(aircraftEuler);

    let desiredPosition: THREE.Vector3;
    let desiredLookAt: THREE.Vector3;

    switch (cameraView) {
      case "cockpit":
        // First-person view from cockpit
        desiredPosition = aircraftPos.clone().add(forward.clone().multiplyScalar(2));
        desiredPosition.add(up.clone().multiplyScalar(1));
        desiredLookAt = aircraftPos.clone().add(forward.clone().multiplyScalar(50));
        break;

      case "external":
        // Free camera circling the aircraft
        const angle = Date.now() * 0.0003;
        const radius = 40;
        desiredPosition = new THREE.Vector3(
          aircraftPos.x + Math.cos(angle) * radius,
          aircraftPos.y + 15,
          aircraftPos.z + Math.sin(angle) * radius
        );
        desiredLookAt = aircraftPos.clone();
        break;

      case "chase":
      default:
        // Third-person chase camera
        const offset = forward.clone().multiplyScalar(-25);
        offset.add(up.clone().multiplyScalar(8));
        desiredPosition = aircraftPos.clone().add(offset);
        desiredLookAt = aircraftPos.clone().add(forward.clone().multiplyScalar(20));
        break;
    }

    // Smooth camera movement
    targetPosition.current.lerp(desiredPosition, 0.1);
    targetLookAt.current.lerp(desiredLookAt, 0.1);

    camera.position.copy(targetPosition.current);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}
