import { useFlightSim } from "@/lib/stores/useFlightSim";
import { Aircraft } from "./Aircraft";
import { useMemo } from "react";

export function MultiplayerPlayers() {
  const { otherPlayers } = useFlightSim();

  const playersList = useMemo(() => {
    return Array.from(otherPlayers.values());
  }, [otherPlayers]);

  return (
    <>
      {playersList.map((player) => (
        <Aircraft
          key={player.id}
          isPlayer={false}
          playerId={player.id}
          position={[player.position.x, player.position.y, player.position.z]}
          rotation={[player.rotation.x, player.rotation.y, player.rotation.z]}
          aircraftType={player.aircraftType}
        />
      ))}
    </>
  );
}
