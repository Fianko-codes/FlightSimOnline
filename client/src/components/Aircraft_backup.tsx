import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useFlightSim, AircraftType } from "@/lib/stores/useFlightSim";
import { useMouseLook } from "@/hooks/useMouseLook";

const WORLD_SIZE = 2000;
const HALF_WORLD = WORLD_SIZE / 2;

enum Controls {
  yawLeft = "yawLeft",
  yawRight = "yawRight",
  throttleUp = "throttleUp",
  throttleDown = "throttleDown",
  boost = "boost",
  changeView = "changeView",
  flapsExtend = "flapsExtend",
  flapsRetract = "flapsRetract",
  airbrake = "airbrake",
  autoLevel = "autoLevel",
  trimPitchUp = "trimPitchUp",
  trimPitchDown = "trimPitchDown",
  // Helicopter controls
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
    flapsPosition,
    airbrakeDeployed,
    trimSettings,
    autoLevelEnabled,
    angleOfAttack,
    stallWarning,
    controlAuthority,
    setPosition,
    setRotation,
    setVelocity,
    setThrottle,
    setSpeed,
    setAltitude,
    consumeFuel,
    refuel,
    updateMultiplayerState,
    cycleCameraView,
    setFlapsPosition,
    toggleAirbrake,
    adjustTrim,
    toggleAutoLevel,
    updateAngleOfAttack,
    updateStallWarning,
    updateControlAuthority,
  } = useFlightSim();

  // Determine which aircraft type to use
  const currentAircraftType = isPlayer ? storeAircraftType : (propAircraftType || "cessna");
  const physics = AIRCRAFT_PHYSICS[currentAircraftType];
  const modelProperties = MODEL_PROPERTIES[currentAircraftType];

  useEffect(() => {
    if (modelProperties.path) {
      const loader = new GLTFLoader();
      loader.load(
        modelProperties.path,
        (gltf) => {
          const model = gltf.scene as THREE.Group;
          model.scale.set(modelProperties.scale, modelProperties.scale, modelProperties.scale);
          model.rotation.set(modelProperties.rotation[0], modelProperties.rotation[1], modelProperties.rotation[2]);

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.name.toLowerCase().includes("propeller")) {
              (child as THREE.Mesh).rotation.z = throttle * Math.PI * 10;
            }
            if ((child as THREE.Mesh).isMesh && child.name.toLowerCase().includes("rotor")) {
              (child as THREE.Mesh).rotation.z = throttle * Math.PI * 10;
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
