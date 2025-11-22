import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useFlightSim, AircraftType } from "@/lib/stores/useFlightSim";

interface CameraOffset {
  thirdPerson: {
    distance: number;
    height: number;
    lookAtDistance: number;
  };
  firstPerson: {
    forward: number;
    up: number;
  };
}

const CAMERA_OFFSETS: Record<AircraftType, CameraOffset> = {
  cessna: {
    thirdPerson: { distance: -25, height: 8, lookAtDistance: 20 },
    firstPerson: { forward: 2.5, up: 0.3 },
  },
  cargo: {
    thirdPerson: { distance: -50, height: 15, lookAtDistance: 40 },
    firstPerson: { forward: 2.5, up: 5 },
  },
  fighter: {
    thirdPerson: { distance: -20, height: 6, lookAtDistance: 15 },
    firstPerson: { forward: 2.5, up: 0.3 },
  },
  helicopter: {
    thirdPerson: { distance: -22, height: 7, lookAtDistance: 17 },
    firstPerson: { forward: 2.5, up: 0.5 },
  },
  glider: {
    thirdPerson: { distance: -30, height: 10, lookAtDistance: 25 },
    firstPerson: { forward: 2.5, up: 0.4 },
  },
  bomber: {
    thirdPerson: { distance: -60, height: 18, lookAtDistance: 45 },
    firstPerson: { forward: 2.5, up: 5 },
  },
  stunt: {
    thirdPerson: { distance: -23, height: 7, lookAtDistance: 18 },
    firstPerson: { forward: 2.5, up: 0.3 },
  },
};

export function FlightCamera() {
  const { camera } = useThree();
  const { position, rotation, cameraView, aircraftType } = useFlightSim();
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
    const cameraOffset = CAMERA_OFFSETS[aircraftType];

    switch (cameraView) {
      case "firstperson":
        // True first-person view from inside cockpit
        // Position camera at cockpit position (slightly forward and up from center)
        desiredPosition = aircraftPos.clone();
        desiredPosition.add(forward.clone().multiplyScalar(cameraOffset.firstPerson.forward)); // Slightly forward
        desiredPosition.add(up.clone().multiplyScalar(cameraOffset.firstPerson.up)); // Slightly up (cockpit height)

        // Look in the direction the aircraft is facing
        desiredLookAt = desiredPosition.clone().add(forward.clone().multiplyScalar(100));
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
        const offset = forward
          .clone()
          .multiplyScalar(cameraOffset.thirdPerson.distance);
        offset.add(up.clone().multiplyScalar(cameraOffset.thirdPerson.height));
        desiredPosition = aircraftPos.clone().add(offset);
        desiredLookAt = aircraftPos
          .clone()
          .add(forward.clone().multiplyScalar(cameraOffset.thirdPerson.lookAtDistance));
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
