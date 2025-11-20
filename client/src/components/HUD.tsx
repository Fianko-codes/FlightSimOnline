import { useFlightSim } from "@/lib/stores/useFlightSim";

export function HUD() {
  const { speed, altitude, fuel, throttle, cameraView, otherPlayers, lobbyName, lobbyId } = useFlightSim();

  const formatCameraView = (view: string) => {
    switch (view) {
      case "firstperson":
        return "FIRST PERSON";
      case "chase":
        return "THIRD PERSON";
      case "external":
        return "EXTERNAL";
      default:
        return view.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none text-white font-mono">
      {/* Top left - Flight data */}
      <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg backdrop-blur-sm">
        <div className="text-xl font-bold mb-2 text-green-400">FLIGHT DATA</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">SPEED:</span>
            <span className="text-green-400 font-bold">{speed.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">ALTITUDE:</span>
            <span className="text-green-400 font-bold">{altitude.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">THROTTLE:</span>
            <span className="text-green-400 font-bold">{(throttle * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Top right - Fuel gauge */}
      <div className="absolute top-4 right-4 bg-black/70 p-4 rounded-lg backdrop-blur-sm">
        <div className="text-xl font-bold mb-2 text-yellow-400">FUEL</div>
        <div className="w-48 h-8 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-500">
          <div
            className={`h-full transition-all duration-300 ${
              fuel > 50
                ? "bg-green-500"
                : fuel > 20
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${fuel}%` }}
          />
        </div>
        <div className="text-center mt-1 text-sm">
          {fuel > 20 ? (
            <span className="text-green-400">{fuel.toFixed(1)}%</span>
          ) : fuel > 0 ? (
            <span className="text-yellow-400 animate-pulse">
              LOW FUEL: {fuel.toFixed(1)}%
            </span>
          ) : (
            <span className="text-red-500 animate-pulse font-bold">
              NO FUEL!
            </span>
          )}
        </div>
      </div>

      {/* Bottom left - Controls */}
      <div className="absolute bottom-4 left-4 bg-black/70 p-4 rounded-lg backdrop-blur-sm max-w-md">
        <div className="text-xl font-bold mb-2 text-blue-400">CONTROLS</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span className="text-gray-400">Mouse:</span> Pitch (up/down), Roll (left/right)</div>
          <div><span className="text-gray-400">W/S:</span> Throttle</div>
          <div><span className="text-gray-400">A/D:</span> Yaw (rudder)</div>
          <div><span className="text-gray-400">Shift:</span> Afterburner/Boost</div>
          <div className="col-span-2"><span className="text-gray-400">C:</span> Change Camera</div>
          <div className="col-span-2 text-xs text-gray-500 mt-1">Click to lock mouse cursor</div>
        </div>
      </div>

      {/* Bottom right - Camera view & Players */}
      <div className="absolute bottom-4 right-4 bg-black/70 p-4 rounded-lg backdrop-blur-sm">
        <div className="text-xl font-bold mb-2 text-purple-400">INFO</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">VIEW:</span>
            <span className="text-purple-400 font-bold">{formatCameraView(cameraView)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">PLAYERS:</span>
            <span className="text-purple-400 font-bold">{otherPlayers.size + 1}</span>
          </div>
          {lobbyName && (
            <div className="flex flex-col text-right text-xs text-gray-300">
              <span className="font-semibold text-purple-300">{lobbyName}</span>
              {lobbyId && <span className="text-[10px] uppercase tracking-wide opacity-70">{lobbyId}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Center - Attitude indicator */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-32 h-32">
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-0.5 bg-green-400/50"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-full bg-green-400/50"></div>
          </div>
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 rounded-full bg-green-400 border-2 border-white"></div>
          </div>
        </div>
      </div>

      {/* Top center - Warning messages */}
      {fuel <= 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-600/90 px-6 py-3 rounded-lg backdrop-blur-sm animate-pulse">
          <div className="text-2xl font-bold text-white">⚠ ENGINE FAILURE - NO FUEL</div>
        </div>
      )}
      {fuel > 0 && fuel <= 20 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-600/90 px-6 py-3 rounded-lg backdrop-blur-sm">
          <div className="text-xl font-bold text-white">⚠ LOW FUEL WARNING</div>
        </div>
      )}
      {altitude < 10 && altitude > 0 && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-red-600/90 px-6 py-3 rounded-lg backdrop-blur-sm animate-pulse">
          <div className="text-xl font-bold text-white">⚠ PULL UP - LOW ALTITUDE</div>
        </div>
      )}
    </div>
  );
}
