import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useFlightSim } from "@/lib/stores/useFlightSim";

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
}

export function Aircraft({ isPlayer = true, playerId, position, rotation }: AircraftProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls<Controls>();
  
  const {
    position: storePosition,
    rotation: storeRotation,
    velocity,
    throttle,
    fuel,
    setPosition,
    setRotation,
    setVelocity,
    setThrottle,
    setSpeed,
    setAltitude,
    consumeFuel,
    updateMultiplayerState,
    cycleCameraView
  } = useFlightSim();

  // Physics constants
  const GRAVITY = 9.8;
  const LIFT_COEFFICIENT = 0.15;
  const DRAG_COEFFICIENT = 0.02;
  const PITCH_SPEED = 1.5;
  const ROLL_SPEED = 2.0;
  const YAW_SPEED = 1.0;
  const THROTTLE_CHANGE_RATE = 0.5;
  const MAX_SPEED = 100;
  const MIN_FLIGHT_SPEED = 20;
  const FUEL_CONSUMPTION_RATE = 0.01;
  const TERRAIN_HEIGHT = 0;

  const lastMultiplayerUpdate = useRef(0);
  const lastCameraToggle = useRef(0);

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

    // Throttle control
    let newThrottle = throttle;
    if (controls.throttleUp) {
      newThrottle = Math.min(1, throttle + THROTTLE_CHANGE_RATE * delta);
      setThrottle(newThrottle);
    }
    if (controls.throttleDown) {
      newThrottle = Math.max(0, throttle - THROTTLE_CHANGE_RATE * delta);
      setThrottle(newThrottle);
    }

    // Only allow control if there's fuel
    if (fuel > 0) {
      // Pitch control (W/S - nose up/down)
      if (controls.forward) {
        pitch -= PITCH_SPEED * delta;
      }
      if (controls.backward) {
        pitch += PITCH_SPEED * delta;
      }

      // Roll control (A/D - roll left/right)
      if (controls.left) {
        roll -= ROLL_SPEED * delta;
      }
      if (controls.right) {
        roll += ROLL_SPEED * delta;
      }

      // Yaw control (Q/E - turn left/right)
      if (controls.yawLeft) {
        yaw -= YAW_SPEED * delta;
      }
      if (controls.yawRight) {
        yaw += YAW_SPEED * delta;
      }

      // Consume fuel based on throttle
      if (newThrottle > 0) {
        consumeFuel(FUEL_CONSUMPTION_RATE * newThrottle * delta);
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
    const thrust = newThrottle * MAX_SPEED;

    // Calculate current speed from velocity
    const currentSpeed = Math.sqrt(
      velocity.x * velocity.x + 
      velocity.y * velocity.y + 
      velocity.z * velocity.z
    );

    // Lift force (based on speed and pitch)
    let lift = 0;
    if (currentSpeed > MIN_FLIGHT_SPEED) {
      lift = LIFT_COEFFICIENT * currentSpeed * Math.cos(pitch);
    }

    // Drag force
    const drag = DRAG_COEFFICIENT * currentSpeed * currentSpeed;

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

    // Terrain collision
    if (newPosition.y < TERRAIN_HEIGHT + 2) {
      newPosition.y = TERRAIN_HEIGHT + 2;
      newVelocity.y = Math.max(0, newVelocity.y);
      
      // If speed is too low, crash
      if (currentSpeed < 5) {
        newVelocity.x *= 0.5;
        newVelocity.z *= 0.5;
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

  // Simple aircraft model
  return (
    <group ref={groupRef} position={position || [0, 50, 0]}>
      {/* Fuselage */}
      <mesh castShadow>
        <boxGeometry args={[1, 0.8, 4]} />
        <meshStandardMaterial color={isPlayer ? "#3b82f6" : "#ef4444"} />
      </mesh>
      
      {/* Cockpit */}
      <mesh position={[0, 0.5, 0.5]} castShadow>
        <boxGeometry args={[0.8, 0.6, 1.5]} />
        <meshStandardMaterial color={isPlayer ? "#1e40af" : "#991b1b"} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[8, 0.2, 1.5]} />
        <meshStandardMaterial color={isPlayer ? "#60a5fa" : "#f87171"} />
      </mesh>
      
      {/* Tail wing */}
      <mesh position={[0, 0, -2]} castShadow>
        <boxGeometry args={[3, 0.15, 0.8]} />
        <meshStandardMaterial color={isPlayer ? "#60a5fa" : "#f87171"} />
      </mesh>
      
      {/* Vertical stabilizer */}
      <mesh position={[0, 1, -2]} castShadow>
        <boxGeometry args={[0.2, 1.5, 0.8]} />
        <meshStandardMaterial color={isPlayer ? "#60a5fa" : "#f87171"} />
      </mesh>
      
      {/* Propeller (visual only) */}
      <mesh position={[0, 0, 2.2]} rotation={[0, 0, isPlayer ? throttle * Math.PI * 10 : 0]}>
        <boxGeometry args={[2, 0.1, 0.1]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}
