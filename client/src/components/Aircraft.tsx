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
    collectivePosition,
    rotorRPM,
    torque,
    verticalSpeed,
    inGroundEffect,
    setCollective,
    updateRotorRPM,
    updateTorque,
    updateVerticalSpeed,
    setInGroundEffect,
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
  const GRAVITY = 9.8;
  const TERRAIN_HEIGHT = 0;

  const lastMultiplayerUpdate = useRef(0);
  const lastCameraToggle = useRef(0);
  const lastFlapsToggle = useRef(0);
  const lastAirbrakeToggle = useRef(0);
  const lastAutoLevelToggle = useRef(0);
  const mouseDeltaRef = useRef({ x: 0, y: 0 });

  // Mouse sensitivity - increased for better control
  const mouseSensitivity = 1.2; // Increased from 0.5

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

    // Calculate current speed first (needed for physics)
    const currentSpeed = Math.sqrt(
      velocity.x * velocity.x +
      velocity.y * velocity.y +
      velocity.z * velocity.z
    );

    // ----------- REALISTIC CONTROL AUTHORITY ----------
    // Controls become less effective at very low and very high speeds
    const normalizedSpeed = currentSpeed / physics.maxSpeed;
    let authority = 1.0;
    if (currentSpeed < physics.minFlightSpeed * 0.5) {
      authority = 0.2; // Minimal control at very low speed
    } else if (currentSpeed < physics.minFlightSpeed) {
      authority = 0.2 + (currentSpeed / physics.minFlightSpeed) * 0.4;
    } else if (normalizedSpeed < 0.8) {
      authority = 0.6 + normalizedSpeed * 0.4; // Progressive increase
    } else {
      // Control stiffening at high speed
      authority = Math.max(0.3, 1.0 - (normalizedSpeed - 0.8) * 1.5);
    }
    updateControlAuthority(authority);

    // ----------- EXPONENTIAL MOUSE CURVES ----------
    // Reduced exponential for easier control
    const applyExponential = (input: number, exp: number = 1.6) => {
      const sign = Math.sign(input);
      return sign * Math.pow(Math.abs(input), exp);
    };

    // Mouse controls with exponential curves and control authority
    if (fuel > 0) {
      const mouseDelta = mouseDeltaRef.current;

      // Apply exponential curve for progressive response
      const pitchInput = applyExponential(mouseDelta.y, 1.6) * mouseSensitivity * authority;
      const rollInput = applyExponential(mouseDelta.x, 1.6) * mouseSensitivity * authority;

      pitch -= pitchInput;
      roll -= rollInput;

      // ----------- ADVERSE YAW ----------
      // Rolling creates yaw in opposite direction (requires rudder to coordinate)
      yaw += rollInput * 0.3; // Roll right → nose yaws left

      mouseDeltaRef.current = { x: 0, y: 0 };
    }

    // ----------- TRIM SYSTEM ----------
    // Apply trim offsets for hands-off flight
    pitch += trimSettings.pitch;
    roll += trimSettings.roll;
    yaw += trimSettings.yaw;

    // ----------- AUTO-LEVEL ASSIST ----------
    if (autoLevelEnabled) {
      const levelingForce = 0.5 * delta;
      pitch += (0 - pitch) * levelingForce; // Return to level pitch
      roll += (0 - roll) * levelingForce;   // Return to level roll
    }

    // Yaw control (A/D keys) with authority scaling
    if (controls.yawLeft) {
      yaw -= physics.yawSpeed * delta * authority;
    }
    if (controls.yawRight) {
      yaw += physics.yawSpeed * delta * authority;
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
    const isBoosting = controls.boost ?? false;
    const maxThrustMultiplier = isBoosting ? 1.5 : 1;

    // Consume fuel based on throttle
    if (fuel > 0 && newThrottle > 0) {
      const boostMultiplier = isBoosting ? 2 : 1;
      consumeFuel(physics.fuelConsumptionRate * newThrottle * delta * boostMultiplier);
    } else if (fuel <= 0) {
      // No fuel - reduce throttle automatically
      newThrottle = Math.max(0, newThrottle - 0.1 * delta);
      setThrottle(newThrottle);
    }

    // ----------- FLAPS CONTROL ----------
    const currentTime = Date.now();
    if (controls.flapsExtend && currentTime - lastFlapsToggle.current > 300) {
      setFlapsPosition(Math.min(1, flapsPosition + 0.33));
      lastFlapsToggle.current = currentTime;
    }
    if (controls.flapsRetract && currentTime - lastFlapsToggle.current > 300) {
      setFlapsPosition(Math.max(0, flapsPosition - 0.33));
      lastFlapsToggle.current = currentTime;
    }

    // ----------- AIRBRAKE CONTROL ----------
    if (controls.airbrake && currentTime - lastAirbrakeToggle.current > 300) {
      toggleAirbrake();
      lastAirbrakeToggle.current = currentTime;
    }

    // ----------- AUTO-LEVEL TOGGLE ----------
    if (controls.autoLevel && currentTime - lastAutoLevelToggle.current > 300) {
      toggleAutoLevel();
      lastAutoLevelToggle.current = currentTime;
    }

    // ----------- TRIM ADJUSTMENT ----------
    if (controls.trimPitchUp) {
      adjustTrim('pitch', 0.15 * delta);
    }
    if (controls.trimPitchDown) {
      adjustTrim('pitch', -0.15 * delta);
    }

    // Limit pitch and roll to realistic ranges
    pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    roll = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, roll));

    // ----------- ANGLE OF ATTACK CALCULATION ----------
    const upVector = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(pitch, yaw, roll, 'XYZ');
    forward.applyEuler(euler);
    upVector.applyEuler(euler);

    // Calculate velocity direction
    const velocityDir = new THREE.Vector3(velocity.x, velocity.y, velocity.z).normalize();
    const aoa = currentSpeed > 5 ? Math.acos(Math.max(-1, Math.min(1, forward.dot(velocityDir)))) : 0;
    updateAngleOfAttack(aoa);

    // ----------- STALL MECHANICS ----------
    const criticalAoA = 0.26; // ~15 degrees
    const isStalling = aoa > criticalAoA && currentSpeed > physics.minFlightSpeed;
    updateStallWarning(isStalling);

    // Calculate thrust based on throttle & afterburner
    const thrust = newThrottle * physics.maxSpeed * maxThrustMultiplier;

    // ----------- LIFT CALCULATION WITH FLAPS ----------
    let lift = 0;
    if (currentSpeed > physics.minFlightSpeed * 0.8 || isStalling) {
      // Base lift from speed and pitch
      let liftCoeff = physics.liftCoefficient;

      // Flaps increase lift coefficient
      liftCoeff += flapsPosition * 0.08;

      // Stall reduces lift dramatically
      if (isStalling) {
        liftCoeff *= 0.3; // 70% lift loss in stall
      }

      lift = liftCoeff * currentSpeed * Math.cos(pitch);
    }

    // ----------- DRAG CALCULATION WITH AIRBRAKES ----------
    let drag = physics.dragCoefficient * currentSpeed * currentSpeed;

    // Flaps add induced drag
    drag += flapsPosition * 0.015 * currentSpeed * currentSpeed;

    // Airbrakes add significant drag
    if (airbrakeDeployed) {
      drag += 0.05 * currentSpeed * currentSpeed;
    }

    // ----------- GROUND EFFECT ----------
    const groundHeight = Math.max(0, storePosition.y - TERRAIN_HEIGHT);
    if (groundHeight < 10 && groundHeight > 0) {
      // Increased lift near ground (cushion effect)
      const groundEffectFactor = 1 + (10 - groundHeight) / 10 * 0.3;
      lift *= groundEffectFactor;
    }

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
      // ========== COMPLETE HELICOPTER PHYSICS ==========
      // This helicopter uses realistic collective/cyclic/pedal controls
      // Calculate current speed
      const heliSpeed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
      );
      const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

      // Override pitch/roll/yaw for helicopter
      pitch = storeRotation.x;
      roll = storeRotation.z;
      yaw = storeRotation.y;

      // COLLECTIVE (W/S)
      let newCollective = collectivePosition;
      if (controls.throttleUp) {
        newCollective = Math.min(1, collectivePosition + 0.6 * delta);
        setCollective(newCollective);
      }
      if (controls.throttleDown) {
        newCollective = Math.max(0, collectivePosition - 0.6 * delta);
        setCollective(newCollective);
      }
      const collectiveBoost = (controls.boost ?? false) ? 0.2 : 0;
      const effectiveCollective = Math.min(1, newCollective + collectiveBoost);

      // ROTOR RPM
      const targetRPM = 100 - (effectiveCollective * 8);
      const newRPM = rotorRPM + (targetRPM - rotorRPM) * 3 * delta;
      updateRotorRPM(newRPM);

      // TORQUE
      const newTorque = effectiveCollective * 85 + heliSpeed * 0.15;
      updateTorque(newTorque);

      // CYCLIC (Mouse)
      const cyclicSens = 1.5; // Increased sensitivity for better control
      if (fuel > 0) {
        const mouseDelta = mouseDeltaRef.current;
        // Direct mouse input without delta multiplication
        pitch -= mouseDelta.y * cyclicSens;
        roll -= mouseDelta.x * cyclicSens;
        mouseDeltaRef.current = { x: 0, y: 0 };
      }

      // PEDALS (A/D)
      const pedalSpeed = 1.5;
      const torqueEffect = effectiveCollective * 0.3;
      if (controls.yawLeft) yaw -= (pedalSpeed + torqueEffect) * delta;
      if (controls.yawRight) yaw += (pedalSpeed - torqueEffect) * delta;
      yaw += torqueEffect * delta * 0.3; // Natural torque

      pitch = Math.max(-0.785, Math.min(0.785, pitch));
      roll = Math.max(-1.047, Math.min(1.047, roll));

      // VERTICAL THRUST
      let verticalThrust = effectiveCollective * 25;

      // GROUND EFFECT
      const groundHeight = Math.max(0, storePosition.y - TERRAIN_HEIGHT);
      const isInGE = groundHeight < 12;
      setInGroundEffect(isInGE);
      if (isInGE) {
        verticalThrust *= 1 + (12 - groundHeight) / 12 * 0.4;
      }

      // TRANSLATIONAL LIFT
      if (horizontalSpeed > 5 && horizontalSpeed < 30) {
        verticalThrust *= 1 + Math.min(0.25, (horizontalSpeed - 5) / 20 * 0.25);
      }

      // FORWARD FLIGHT
      const forward = new THREE.Vector3(0, 0, -1);
      const euler = new THREE.Euler(pitch, yaw, roll, 'XYZ');
      forward.applyEuler(euler);
      const tiltThrust = effectiveCollective * 12;
      const tiltForce = forward.multiplyScalar(tiltThrust * delta);

      // DRAG
      const drag = 0.03 * heliSpeed * heliSpeed;
      const dragFactor = Math.max(0, 1 - drag * delta);

      // UPDATE VELOCITY
      newVelocity = {
        x: (velocity.x + tiltForce.x) * dragFactor,
        y: (velocity.y + (verticalThrust - GRAVITY) * delta) * dragFactor * 0.95,
        z: (velocity.z + tiltForce.z) * dragFactor
      };

      // VORTEX RING STATE
      const descentRate = -newVelocity.y;
      const isVRS = descentRate > 5 && horizontalSpeed < 10 && effectiveCollective > 0.5;
      updateStallWarning(isVRS);
      if (isVRS) newVelocity.y -= 3 * delta;

      updateVerticalSpeed(newVelocity.y);

      // FUEL
      if (fuel > 0 && effectiveCollective > 0) {
        consumeFuel(physics.fuelConsumptionRate * effectiveCollective * delta * 1.5);
      }

      // POSITION
      newPosition.x = storePosition.x + newVelocity.x * delta;
      newPosition.y = storePosition.y + newVelocity.y * delta;
      newPosition.z = storePosition.z + newVelocity.z * delta;

      if (newPosition.y < TERRAIN_HEIGHT + 1) {
        newPosition.y = TERRAIN_HEIGHT + 1;
        newVelocity.y = Math.max(0, newVelocity.y * 0.3);
        if (heliSpeed < 5 && fuel < 100) refuel(20 * delta);
      }

      // World wrapping
      if (newPosition.x > HALF_WORLD) newPosition.x -= WORLD_SIZE;
      if (newPosition.x < -HALF_WORLD) newPosition.x += WORLD_SIZE;
      if (newPosition.z > HALF_WORLD) newPosition.z -= WORLD_SIZE;
      if (newPosition.z < -HALF_WORLD) newPosition.z += WORLD_SIZE;

      setPosition(newPosition);
      setRotation({ x: pitch, y: yaw, z: roll });
      setVelocity(newVelocity);
      setSpeed(heliSpeed);
      setAltitude(newPosition.y);
      groupRef.current.position.set(newPosition.x, newPosition.y, newPosition.z);
      groupRef.current.rotation.set(pitch, yaw, roll);
    }
  });

  return (
    <group ref={groupRef} position={position || [0, 50, 0]}>
      {model ? <primitive object={model} /> : null}
    </group>
  );
}
