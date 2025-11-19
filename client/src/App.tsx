import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { KeyboardControls } from "@react-three/drei";
import "@fontsource/inter";
import { Environment } from "./components/Environment";
import { Aircraft } from "./components/Aircraft";
import { FlightCamera } from "./components/FlightCamera";
import { HUD } from "./components/HUD";
import { MultiplayerPlayers } from "./components/MultiplayerPlayers";
import { AircraftSelection } from "./components/AircraftSelection";
import { useFlightSim } from "./lib/stores/useFlightSim";
import { useGame } from "./lib/stores/useGame";

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

const controls = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.left, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.right, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.yawLeft, keys: ["KeyQ"] },
  { name: Controls.yawRight, keys: ["KeyE"] },
  { name: Controls.throttleUp, keys: ["ShiftLeft", "ShiftRight"] },
  { name: Controls.throttleDown, keys: ["ControlLeft", "ControlRight"] },
  { name: Controls.changeView, keys: ["KeyC"] },
];

function App() {
  const { connectMultiplayer, disconnectMultiplayer } = useFlightSim();
  const { phase } = useGame();

  useEffect(() => {
    console.log("Flight Simulator: Connecting to multiplayer...");
    connectMultiplayer();

    return () => {
      console.log("Flight Simulator: Disconnecting from multiplayer...");
      disconnectMultiplayer();
    };
  }, [connectMultiplayer, disconnectMultiplayer]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <KeyboardControls map={controls}>
        {phase === "ready" && <AircraftSelection />}
        
        <Canvas
          shadows
          camera={{
            position: [0, 60, 30],
            fov: 75,
            near: 0.1,
            far: 2000
          }}
          gl={{
            antialias: true,
            powerPreference: "high-performance"
          }}
        >
          <Suspense fallback={null}>
            <Environment />
            <Aircraft isPlayer={true} />
            <MultiplayerPlayers />
            <FlightCamera />
          </Suspense>
        </Canvas>
        
        {phase === "playing" && <HUD />}
      </KeyboardControls>
    </div>
  );
}

export default App;
