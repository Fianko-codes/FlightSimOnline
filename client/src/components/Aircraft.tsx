import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useFlightSim, AircraftType } from "@/lib/stores/useFlightSim";
import { useMouseLook } from "@/hooks/useMouseLook";

const WORLD_SIZE = 10000;
const HALF_WORLD = WORLD_SIZE / 2;

enum Controls {
  // Only keep the ones necessary for the new scheme
  yawLeft = "yawLeft",      // A
  yawRight = "yawRight",    // D
  throttleUp = "throttleUp",    // W
  throttleDown = "throttleDown", // S
  afterburner = "afterburner",  // Shift (NEW – you may need to add to your key handler for "afterburner")
  changeView = "changeView",    // C
  // Keep heli/cyclic's for helicopter special handling if needed
  collectiveUp = "collectiveUp",
  collectiveDown = "collectiveDown",
  cyclicForward = "cyclicForward",
  cyclicBackward = "cyclicBackward",
  cyclicLeft = "cyclicLeft",
  cyclicRight = "cyclicRight",
  tailRotorLeft = "tailRotorLeft",
  tailRotorRight = "tailRotorRight",
}

interface AircraftProps {
  isPlayer?: boolean;
  playerId?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  aircraftType?: AircraftType;
}

interface AircraftPhysics {
  liftCoefficient: number;
  dragCoefficient: number;
  pitchSpeed: number;
  rollSpeed: number;
  yawSpeed: number;
  throttleChangeRate: number;
  maxSpeed: number;
  minFlightSpeed: number;
  fuelConsumptionRate: number;
}

const AIRCRAFT_PHYSICS: Record<AircraftType, AircraftPhysics> = {
  cessna: {
    liftCoefficient: 0.15,
    dragCoefficient: 0.02,
    pitchSpeed: 1.5,
    rollSpeed: 2.0,
    yawSpeed: 1.0,
    throttleChangeRate: 0.5,
    maxSpeed: 80,
    minFlightSpeed: 15,
    fuelConsumptionRate: 0.008
  },
  cargo: {
    liftCoefficient: 0.12,
    dragCoefficient: 0.03,
    pitchSpeed: 0.8,
    rollSpeed: 1.0,
    yawSpeed: 0.6,
    throttleChangeRate: 0.3,
    maxSpeed: 60,
    minFlightSpeed: 25,
    fuelConsumptionRate: 0.015
  },
  fighter: {
    liftCoefficient: 0.18,
    dragCoefficient: 0.015,
    pitchSpeed: 2.5,
    rollSpeed: 3.5,
    yawSpeed: 1.8,
    throttleChangeRate: 0.8,
    maxSpeed: 150,
    minFlightSpeed: 20,
    fuelConsumptionRate: 0.02
  },
  helicopter: {
    liftCoefficient: 0.25, // High lift for vertical flight
    dragCoefficient: 0.025,
    pitchSpeed: 2.0,
    rollSpeed: 2.5,
    yawSpeed: 2.2,
    throttleChangeRate: 0.6,
    maxSpeed: 90,
    minFlightSpeed: 0, // Can hover
    fuelConsumptionRate: 0.012
  },
  glider: {
    liftCoefficient: 0.22,
    dragCoefficient: 0.01, // Very low drag
    pitchSpeed: 1.2,
    rollSpeed: 1.8,
    yawSpeed: 0.8,
    throttleChangeRate: 0.2, // No engine, but we'll use it for gliding speed
    maxSpeed: 70,
    minFlightSpeed: 10,
    fuelConsumptionRate: 0.001 // Minimal fuel use
  },
  bomber: {
    liftCoefficient: 0.14,
    dragCoefficient: 0.035,
    pitchSpeed: 0.6,
    rollSpeed: 0.8,
    yawSpeed: 0.5,
    throttleChangeRate: 0.25,
    maxSpeed: 55,
    minFlightSpeed: 30,
    fuelConsumptionRate: 0.018
  },
  stunt: {
    liftCoefficient: 0.2,
    dragCoefficient: 0.018,
    pitchSpeed: 3.0,
    rollSpeed: 4.0,
    yawSpeed: 2.5,
    throttleChangeRate: 0.7,
    maxSpeed: 120,
    minFlightSpeed: 18,
    fuelConsumptionRate: 0.016
  }
};

const MODEL_PATHS: Record<AircraftType, string> = {
  cessna: "/models/cessna_172/scene.gltf",
  cargo: "/models/cargo/scene.gltf",
  fighter: "/models/fighter_jet/scene.gltf",
  helicopter: "/models/helicopter/scene.gltf",
  glider: "/models/glider/scene.gltf",
  bomber: "/models/bomber/scene.gltf",
  stunt: "/models/stunt_plane/scene.gltf",
};

interface ModelProperties {
  scale: number;
  rotation: [number, number, number];
  path: string;
}

const MODEL_PROPERTIES: Record<AircraftType, ModelProperties> = {
  cessna: { scale: 0.7, rotation: [0, Math.PI, 0], path: "/models/cessna_172/scene.gltf" },
  cargo: { scale: 0.7, rotation: [0, Math.PI, 0], path: "/models/cargo/scene.gltf" },
  fighter: { scale: 12, rotation: [0, Math.PI, 0], path: "/models/fighter_jet/scene.gltf" },
  helicopter: { scale: 10, rotation: [0, 0, 0], path: "/models/helicopter/scene.gltf" },
  glider: { scale: 50, rotation: [0, Math.PI, 0], path: "/models/glider/scene.gltf" },
  bomber: { scale: 16, rotation: [0, Math.PI, 0], path: "/models/bomber/scene.gltf" },
  stunt: { scale: 3, rotation: [0, Math.PI, 0], path: "/models/stunt_plane/scene.gltf" },
};

import { useState, useEffect } from "react";

interface GLTF {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  asset: { [key: string]: any };
  cameras: THREE.Camera[];
  parser: any;
  userData: { [key: string]: any };
}

export function Aircraft({ isPlayer = true, playerId, position, rotation, aircraftType: propAircraftType }: AircraftProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls<Controls>();
  const [model, setModel] = useState<THREE.Group | null>(null);

  const {
    position: storePosition,
    rotation: storeRotation,
    velocity,
    throttle,
    fuel,
    aircraftType: storeAircraftType,
    setPosition,
    setRotation,
    setVelocity,
    setThrottle,
    setSpeed,
    setAltitude,
    consumeFuel,
    refuel,
    updateMultiplayerState,
    cycleCameraView
  } = useFlightSim();

  // Determine which aircraft type to use
  const currentAircraftType = isPlayer ? storeAircraftType : (propAircraftType || "cessna");
  const physics = AIRCRAFT_PHYSICS[currentAircraftType];
  const modelProperties = MODEL_PROPERTIES[currentAircraftType];

  const propellerMeshes = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (modelProperties.path) {
      const loader = new GLTFLoader();
      loader.load(
        modelProperties.path,
        (gltf) => {
          const model = gltf.scene as THREE.Group;
          model.scale.set(modelProperties.scale, modelProperties.scale, modelProperties.scale);
          model.rotation.set(modelProperties.rotation[0], modelProperties.rotation[1], modelProperties.rotation[2]);

          // Clear previous meshes
          propellerMeshes.current = [];

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const name = child.name.toLowerCase();
              if (name.includes("propeller") || name.includes("rotor")) {
                propellerMeshes.current.push(child as THREE.Mesh);
              }
            }
          });

          setModel(model);
        },
        undefined,
        (error) => {
          console.error(error);
        }
      );
    }
  }, [modelProperties.path]);

  // Physics constants
  const GRAVITY = 9.8;
  const TERRAIN_HEIGHT = 0;

  const lastMultiplayerUpdate = useRef(0);
  const lastCameraToggle = useRef(0);
  const mouseDeltaRef = useRef({ x: 0, y: 0 });

  // Mouse input will control pitch (Y axis) and roll (X axis) in War Thunder arcade style
  const mouseSensitivity = 0.5; // Tweak as needed for realism/feel

  // Handle mouse look
  const handleMouseMove = useCallback((deltaX: number, deltaY: number) => {
    mouseDeltaRef.current.x += deltaX;
    mouseDeltaRef.current.y += deltaY;
  }, []);

  useMouseLook(handleMouseMove, isPlayer);

  useFrame((state, delta) => {
    if (!groupRef.current || !isPlayer || !model) {
      // For other players, just update position from props
      if (groupRef.current && position && rotation) {
        groupRef.current.position.set(position[0], position[1], position[2]);
        groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
      return;
    }

    // Animate propellers/rotors
    if (propellerMeshes.current.length > 0) {
      const rotationSpeed = (throttle * 20 + 2) * delta * 10; // Base speed + throttle speed
      propellerMeshes.current.forEach((mesh) => {
        // Rotate around the appropriate axis (usually Z for props in these models, Y for heli rotors)
        // We'll try Z first as it was in the original code, but might need adjustment per model
        if (mesh.name.toLowerCase().includes("rotor")) {
          mesh.rotation.y += rotationSpeed;
        } else {
          mesh.rotation.z += rotationSpeed;
        }
      });
    }

    const controls = getKeys();

    // Handle camera view change
    if (controls.changeView) {
      const currentTime = Date.now();
      if (currentTime - lastCameraToggle.current > 300) {
        cycleCameraView();
        lastCameraToggle.current = currentTime;
        console.log("Camera view changed");
      }
    }

    // Get current rotation
    let pitch = storeRotation.x;
    let roll = storeRotation.z;
    let yaw = storeRotation.y;

    // ----------- NEW: Mouse controls pitch & roll; keyboard A/D for yaw ----------

    // Mouse arcade: X → roll, Y → pitch (War Thunder style)
    if (fuel > 0) {
      const mouseDelta = mouseDeltaRef.current;
      pitch -= mouseDelta.y * mouseSensitivity;   // Mouse Y: pitch
      roll -= mouseDelta.x * mouseSensitivity;   // Mouse X: roll
      // Reset after applying
      mouseDeltaRef.current = { x: 0, y: 0 };
    }

    // Yaw control (A/D keys)
    if (controls.yawLeft) {
      yaw -= physics.yawSpeed * delta;
    }
    if (controls.yawRight) {
      yaw += physics.yawSpeed * delta;
    }

    // Throttle control (W/S keys)
    let newThrottle = throttle;
    if (controls.throttleUp) {
      newThrottle = Math.min(1, throttle + physics.throttleChangeRate * delta);
      setThrottle(newThrottle);
    }
    if (controls.throttleDown) {
      newThrottle = Math.max(0, throttle - physics.throttleChangeRate * delta);
      setThrottle(newThrottle);
    }

    // Afterburner/Boost (Shift key)
    // You may need to map this in your input hook as "afterburner"
    const isBoosting = controls.afterburner ?? false;
    const maxThrustMultiplier = isBoosting ? 1.5 : 1; // 1.5x thrust when boosting; tweak for balance

    // Consume fuel based on throttle (skip if no fuel)
    if (fuel > 0 && newThrottle > 0) {
      const boostMultiplier = isBoosting ? 2 : 1; // Optionally boost fuel burn when boosting
      consumeFuel(physics.fuelConsumptionRate * newThrottle * delta * boostMultiplier);
    } else if (fuel <= 0) {
      // No fuel - reduce throttle automatically
      newThrottle = Math.max(0, newThrottle - 0.1 * delta);
      setThrottle(newThrottle);
    }

    // Limit pitch and roll to realistic ranges
    pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    roll = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, roll));

    // Calculate forward vector based on rotation
    const forward = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(pitch, yaw, roll, 'XYZ');
    forward.applyEuler(euler);

    // Calculate thrust based on throttle & afterburner
    const thrust = newThrottle * physics.maxSpeed * maxThrustMultiplier;

    // Calculate current speed from velocity
    const currentSpeed = Math.sqrt(
      velocity.x * velocity.x +
      velocity.y * velocity.y +
      velocity.z * velocity.z
    );

    // Lift force (based on speed and pitch)
    let lift = 0;
    if (currentSpeed > physics.minFlightSpeed) {
      lift = physics.liftCoefficient * currentSpeed * Math.cos(pitch);
    }

    // Drag force
    const drag = physics.dragCoefficient * currentSpeed * currentSpeed;

    // Apply forces
    const thrustForce = forward.multiplyScalar(thrust * delta);

    let newVelocity = {
      x: velocity.x + thrustForce.x,
      y: velocity.y + thrustForce.y + (lift - GRAVITY) * delta,
      z: velocity.z + thrustForce.z
    };

    // Apply drag
    const dragFactor = Math.max(0, 1 - drag * delta);
    newVelocity.x *= dragFactor;
    newVelocity.y *= dragFactor;
    newVelocity.z *= dragFactor;

    // Update position
    const newPosition = {
      x: storePosition.x + newVelocity.x * delta,
      y: storePosition.y + newVelocity.y * delta,
      z: storePosition.z + newVelocity.z * delta
    };

    // Terrain collision and refueling
    if (newPosition.y < TERRAIN_HEIGHT + 2) {
      newPosition.y = TERRAIN_HEIGHT + 2;
      newVelocity.y = Math.max(0, newVelocity.y);

      // If speed is too low, crash
      if (currentSpeed < 5) {
        newVelocity.x *= 0.5;
        newVelocity.z *= 0.5;
      }

      // Refuel when on ground and moving slowly
      if (currentSpeed < 10 && fuel < 100) {
        refuel(20 * delta);
      }
    }

    // World wrapping for infinite loop illusion
    if (newPosition.x > HALF_WORLD) newPosition.x -= WORLD_SIZE;
    if (newPosition.x < -HALF_WORLD) newPosition.x += WORLD_SIZE;
    if (newPosition.z > HALF_WORLD) newPosition.z -= WORLD_SIZE;
    if (newPosition.z < -HALF_WORLD) newPosition.z += WORLD_SIZE;

    // Continue as before...
    setPosition(newPosition);
    setRotation({ x: pitch, y: yaw, z: roll });
    setVelocity(newVelocity);
    setSpeed(currentSpeed);
    setAltitude(newPosition.y);

    // Update mesh transform
    groupRef.current.position.set(newPosition.x, newPosition.y, newPosition.z);
    groupRef.current.rotation.set(pitch, yaw, roll);

    // Send state to multiplayer server (throttled to ~30 updates per second)
    const now = performance.now();
    if (now - lastMultiplayerUpdate.current > 33) {
      updateMultiplayerState();
      lastMultiplayerUpdate.current = now;
    }

    if (currentAircraftType === "helicopter") {
      // Optional: helicopter-specific controls
      if (controls.collectiveUp) {
        newVelocity.y += 5 * delta;
      }
      if (controls.collectiveDown) {
        newVelocity.y -= 5 * delta;
      }

      if (controls.cyclicForward) {
        pitch -= physics.pitchSpeed * delta;
      }
      if (controls.cyclicBackward) {
        pitch += physics.pitchSpeed * delta;
      }
      if (controls.cyclicLeft) {
        roll -= physics.rollSpeed * delta;
      }
      if (controls.cyclicRight) {
        roll += physics.rollSpeed * delta;
      }

      if (controls.tailRotorLeft) {
        yaw -= physics.yawSpeed * delta;
      }
      if (controls.tailRotorRight) {
        yaw += physics.yawSpeed * delta;
      }
    }
  });

  return (
    <group ref={groupRef} position={position || [0, 50, 0]}>
      {model ? <primitive object={model} /> : null}
    </group>
  );
}
