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
import { MultiplayerLobby } from "./components/MultiplayerLobby";
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
  { name: Controls.yawLeft, keys: ["KeyD"] },
  { name: Controls.yawRight, keys: ["KeyA"] },
  { name: Controls.throttleUp, keys: ["KeyW"] },
  { name: Controls.throttleDown, keys: ["KeyS"] },
  { name: Controls.changeView, keys: ["KeyC"] },
  { name: Controls.boost, keys: ["ShiftLeft", "ShiftRight"] },
];

function App() {
  const { connectMultiplayer, disconnectMultiplayer, hasJoinedLobby, lobbyId } = useFlightSim();
  const { phase } = useGame();

  useEffect(() => {
    if (!hasJoinedLobby || !lobbyId) {
      return;
    }

    console.log("Flight Simulator: Connecting to multiplayer...");
    connectMultiplayer(lobbyId);

    return () => {
      console.log("Flight Simulator: Disconnecting from multiplayer...");
      disconnectMultiplayer();
    };
  }, [connectMultiplayer, disconnectMultiplayer, hasJoinedLobby, lobbyId]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <KeyboardControls map={controls}>
        {!hasJoinedLobby && <MultiplayerLobby />}
        {hasJoinedLobby && phase === "ready" && <AircraftSelection />}
        
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
        
        {hasJoinedLobby && phase === "playing" && <HUD />}
      </KeyboardControls>
    </div>
  );
}

export default App;
