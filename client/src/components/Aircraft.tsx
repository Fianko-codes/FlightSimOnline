import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useFlightSim, AircraftType } from "@/lib/stores/useFlightSim";
import { useMouseLook } from "@/hooks/useMouseLook";

enum Controls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  yawLeft = "yawLeft",
  yawRight = "yawRight",
  throttleUp = "throttleUp",
  throttleDown = "throttleDown",
  changeView = "changeView",
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

export function Aircraft({ isPlayer = true, playerId, position, rotation, aircraftType: propAircraftType }: AircraftProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls<Controls>();
  
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

  // Physics constants
  const GRAVITY = 9.8;
  const TERRAIN_HEIGHT = 0;

  const lastMultiplayerUpdate = useRef(0);
  const lastCameraToggle = useRef(0);
  const mouseDeltaRef = useRef({ x: 0, y: 0 });

  // Handle mouse look
  const handleMouseMove = useCallback((deltaX: number, deltaY: number) => {
    mouseDeltaRef.current.x += deltaX;
    mouseDeltaRef.current.y += deltaY;
  }, []);

  useMouseLook(handleMouseMove, isPlayer);

  useFrame((state, delta) => {
    if (!groupRef.current || !isPlayer) {
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

    // Apply mouse look (pitch and yaw)
    if (fuel > 0) {
      const mouseDelta = mouseDeltaRef.current;
      pitch -= mouseDelta.y;
      yaw += mouseDelta.x;
      
      // Reset mouse delta after applying
      mouseDeltaRef.current = { x: 0, y: 0 };
    }

    // Throttle control
    let newThrottle = throttle;
    if (controls.throttleUp) {
      newThrottle = Math.min(1, throttle + physics.throttleChangeRate * delta);
      setThrottle(newThrottle);
    }
    if (controls.throttleDown) {
      newThrottle = Math.max(0, throttle - physics.throttleChangeRate * delta);
      setThrottle(newThrottle);
    }

    // Only allow control if there's fuel
    if (fuel > 0) {
      // Pitch control (W/S - nose up/down)
      if (controls.forward) {
        pitch -= physics.pitchSpeed * delta;
      }
      if (controls.backward) {
        pitch += physics.pitchSpeed * delta;
      }

      // Roll control (A/D - roll left/right)
      if (controls.left) {
        roll -= physics.rollSpeed * delta;
      }
      if (controls.right) {
        roll += physics.rollSpeed * delta;
      }

      // Yaw control (Q/E - turn left/right)
      if (controls.yawLeft) {
        yaw -= physics.yawSpeed * delta;
      }
      if (controls.yawRight) {
        yaw += physics.yawSpeed * delta;
      }

      // Consume fuel based on throttle
      if (newThrottle > 0) {
        consumeFuel(physics.fuelConsumptionRate * newThrottle * delta);
      }
    } else {
      // No fuel - reduce throttle
      newThrottle = Math.max(0, newThrottle - 0.1 * delta);
      setThrottle(newThrottle);
    }

    // Limit pitch and roll
    pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    roll = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, roll));

    // Calculate forward vector based on rotation
    const forward = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(pitch, yaw, roll, 'XYZ');
    forward.applyEuler(euler);

    // Calculate thrust based on throttle
    const thrust = newThrottle * physics.maxSpeed;

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

    // Update store
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
  });

  // Aircraft visual properties based on type
  const getAircraftVisuals = () => {
    switch (currentAircraftType) {
      case "cessna":
        return {
          mainColor: isPlayer ? "#3b82f6" : "#ef4444",
          accentColor: isPlayer ? "#60a5fa" : "#f87171",
          darkColor: isPlayer ? "#1e40af" : "#991b1b",
          fuselageSize: [1, 0.8, 4] as [number, number, number],
          cockpitSize: [0.8, 0.6, 1.5] as [number, number, number],
          wingSize: [8, 0.2, 1.5] as [number, number, number],
          tailSize: [3, 0.15, 0.8] as [number, number, number],
          stabilizerSize: [0.2, 1.5, 0.8] as [number, number, number],
          propellerSize: [2, 0.1, 0.1] as [number, number, number]
        };
      case "cargo":
        return {
          mainColor: isPlayer ? "#f59e0b" : "#dc2626",
          accentColor: isPlayer ? "#fbbf24" : "#f87171",
          darkColor: isPlayer ? "#b45309" : "#991b1b",
          fuselageSize: [1.5, 1.2, 5] as [number, number, number],
          cockpitSize: [1.2, 0.8, 1.8] as [number, number, number],
          wingSize: [10, 0.3, 2] as [number, number, number],
          tailSize: [4, 0.2, 1] as [number, number, number],
          stabilizerSize: [0.3, 2, 1] as [number, number, number],
          propellerSize: [2.5, 0.12, 0.12] as [number, number, number]
        };
      case "fighter":
        return {
          mainColor: isPlayer ? "#ef4444" : "#3b82f6",
          accentColor: isPlayer ? "#f87171" : "#60a5fa",
          darkColor: isPlayer ? "#991b1b" : "#1e40af",
          fuselageSize: [0.8, 0.6, 4.5] as [number, number, number],
          cockpitSize: [0.7, 0.5, 1.2] as [number, number, number],
          wingSize: [6, 0.15, 1.2] as [number, number, number],
          tailSize: [2.5, 0.12, 0.7] as [number, number, number],
          stabilizerSize: [0.15, 1.2, 0.7] as [number, number, number],
          propellerSize: [0.5, 0.5, 1] as [number, number, number]
        };
      case "helicopter":
        return {
          mainColor: isPlayer ? "#10b981" : "#dc2626",
          accentColor: isPlayer ? "#34d399" : "#f87171",
          darkColor: isPlayer ? "#059669" : "#991b1b",
          fuselageSize: [1.2, 1.0, 3.5] as [number, number, number],
          cockpitSize: [1.0, 0.7, 1.3] as [number, number, number],
          wingSize: [0.3, 0.3, 0.3] as [number, number, number], // No wings, but we'll add rotor
          tailSize: [0.2, 0.2, 1.5] as [number, number, number],
          stabilizerSize: [0.15, 0.8, 0.6] as [number, number, number],
          propellerSize: [6, 0.1, 0.1] as [number, number, number] // Main rotor
        };
      case "glider":
        return {
          mainColor: isPlayer ? "#8b5cf6" : "#dc2626",
          accentColor: isPlayer ? "#a78bfa" : "#f87171",
          darkColor: isPlayer ? "#6d28d9" : "#991b1b",
          fuselageSize: [0.6, 0.5, 5] as [number, number, number],
          cockpitSize: [0.5, 0.4, 1] as [number, number, number],
          wingSize: [12, 0.1, 1] as [number, number, number],
          tailSize: [4, 0.1, 0.6] as [number, number, number],
          stabilizerSize: [0.1, 1.8, 0.6] as [number, number, number],
          propellerSize: [0.3, 0.3, 0.3] as [number, number, number] // No propeller
        };
      case "bomber":
        return {
          mainColor: isPlayer ? "#6b7280" : "#dc2626",
          accentColor: isPlayer ? "#9ca3af" : "#f87171",
          darkColor: isPlayer ? "#374151" : "#991b1b",
          fuselageSize: [1.8, 1.4, 6] as [number, number, number],
          cockpitSize: [1.4, 1.0, 2] as [number, number, number],
          wingSize: [14, 0.4, 2.5] as [number, number, number],
          tailSize: [5, 0.25, 1.2] as [number, number, number],
          stabilizerSize: [0.4, 2.5, 1.2] as [number, number, number],
          propellerSize: [3, 0.15, 0.15] as [number, number, number]
        };
      case "stunt":
        return {
          mainColor: isPlayer ? "#f59e0b" : "#3b82f6",
          accentColor: isPlayer ? "#fbbf24" : "#60a5fa",
          darkColor: isPlayer ? "#d97706" : "#1e40af",
          fuselageSize: [0.7, 0.5, 3.5] as [number, number, number],
          cockpitSize: [0.6, 0.4, 1] as [number, number, number],
          wingSize: [5, 0.12, 1] as [number, number, number],
          tailSize: [2, 0.1, 0.6] as [number, number, number],
          stabilizerSize: [0.12, 1, 0.6] as [number, number, number],
          propellerSize: [1.8, 0.08, 0.08] as [number, number, number]
        };
    }
  };

  const visuals = getAircraftVisuals();

  // Simple aircraft model
  return (
    <group ref={groupRef} position={position || [0, 50, 0]}>
      {/* Fuselage */}
      <mesh castShadow>
        <boxGeometry args={visuals.fuselageSize} />
        <meshStandardMaterial color={visuals.mainColor} />
      </mesh>
      
      {/* Cockpit */}
      <mesh position={[0, 0.5, -0.5]} castShadow>
        <boxGeometry args={visuals.cockpitSize} />
        <meshStandardMaterial color={visuals.darkColor} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={visuals.wingSize} />
        <meshStandardMaterial color={visuals.accentColor} />
      </mesh>
      
      {/* Tail wing */}
      <mesh position={[0, 0, 2]} castShadow>
        <boxGeometry args={visuals.tailSize} />
        <meshStandardMaterial color={visuals.accentColor} />
      </mesh>
      
      {/* Vertical stabilizer */}
      <mesh position={[0, 1, 2]} castShadow>
        <boxGeometry args={visuals.stabilizerSize} />
        <meshStandardMaterial color={visuals.accentColor} />
      </mesh>
      
      {/* Propeller (visual only) - for cessna, cargo, bomber, and stunt */}
      {(currentAircraftType === "cessna" || currentAircraftType === "cargo" || 
        currentAircraftType === "bomber" || currentAircraftType === "stunt") && (
        <mesh position={[0, 0, -2.2]} rotation={[0, 0, isPlayer ? throttle * Math.PI * 10 : 0]}>
          <boxGeometry args={visuals.propellerSize} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      )}
      
      {/* Jet engines for fighter */}
      {currentAircraftType === "fighter" && (
        <>
          <mesh position={[0, -0.3, 2.5]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 1, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Afterburner effect when throttle is high */}
          {isPlayer && throttle > 0.5 && (
            <mesh position={[0, -0.3, 3]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.35, 0.8, 8]} />
              <meshStandardMaterial 
                color="#ff6600" 
                emissive="#ff6600" 
                emissiveIntensity={throttle * 2}
              />
            </mesh>
          )}
        </>
      )}

      {/* Helicopter main rotor */}
      {currentAircraftType === "helicopter" && (
        <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, isPlayer ? throttle * Math.PI * 8 : 0]}>
          <boxGeometry args={visuals.propellerSize} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      )}

      {/* Helicopter tail rotor */}
      {currentAircraftType === "helicopter" && (
        <mesh position={[0, 0.5, 2]} rotation={[0, Math.PI / 2, isPlayer ? throttle * Math.PI * 12 : 0]}>
          <boxGeometry args={[1.5, 0.08, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      )}
    </group>
  );
}
