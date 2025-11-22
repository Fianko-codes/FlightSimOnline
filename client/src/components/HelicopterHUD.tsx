import { useFlightSim } from "@/lib/stores/useFlightSim";

export function HelicopterHUD() {
    const {
        speed, altitude, fuel, collectivePosition, rotorRPM, torque,
        verticalSpeed, inGroundEffect, cameraView, otherPlayers, lobbyName, lobbyId,
        stallWarning
    } = useFlightSim();

    const formatCameraView = (view: string) => {
        switch (view) {
            case "firstperson": return "COCKPIT";
            case "chase": return "CHASE";
            case "external": return "EXTERNAL";
            default: return view.toUpperCase();
        }
    };

    // Calculate heading (simplified)
    const heading = 0; // Would need rotation.y converted to degrees

    return (
        <div className="fixed inset-0 pointer-events-none text-white font-mono">
            {/* Top Left - Flight Data */}
            <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-xl font-bold mb-2 text-green-400">ROTORCRAFT DATA</div>
                <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-300">SPEED:</span>
                        <span className="text-green-400 font-bold">{speed.toFixed(1)} m/s</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-300">ALT (AGL):</span>
                        <span className="text-green-400 font-bold">{altitude.toFixed(1)} m</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-300">V/S:</span>
                        <span className={`font-bold ${verticalSpeed > 1 ? "text-green-400" :
                                verticalSpeed < -3 ? "text-red-400" : "text-yellow-400"
                            }`}>
                            {verticalSpeed > 0 ? "↑" : verticalSpeed < -0.1 ? "↓" : "−"} {Math.abs(verticalSpeed).toFixed(1)} m/s
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-300">HEADING:</span>
                        <span className="text-green-400 font-bold">{heading.toFixed(0)}°</span>
                    </div>
                </div>
            </div>

            {/* Top Right - Engine & Rotor */}
            <div className="absolute top-4 right-4 bg-black/70 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-xl font-bold mb-2 text-yellow-400">ENGINE</div>

                {/* Rotor RPM Gauge */}
                <div className="mb-3">
                    <div className="text-sm text-gray-300 mb-1">ROTOR RPM</div>
                    <div className="w-48 h-8 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-500 relative">
                        <div
                            className={`h-full transition-all duration-200 ${rotorRPM >= 90 && rotorRPM <= 110 ? "bg-green-500" :
                                    rotorRPM >= 80 && rotorRPM < 90 ? "bg-yellow-500" :
                                        rotorRPM >= 70 && rotorRPM < 80 ? "bg-orange-500" :
                                            "bg-red-500"
                                }`}
                            style={{ width: `${Math.min(100, rotorRPM)}%` }}
                        />
                        {/* Green arc indicator */}
                        <div className="absolute top-0 left-[90%] w-0.5 h-full bg-white/50" />
                        <div className="absolute top-0 left-[110%] w-0.5 h-full bg-white/50" />
                    </div>
                    <div className="text-center mt-1">
                        <span className={`font-bold ${rotorRPM >= 90 && rotorRPM <= 110 ? "text-green-400" :
                                rotorRPM >= 80 ? "text-yellow-400" : "text-red-400"
                            }`}>{rotorRPM.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Torque Meter */}
                <div className="mb-3">
                    <div className="text-sm text-gray-300 mb-1">TORQUE</div>
                    <div className="w-48 h-6 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-500">
                        <div
                            className={`h-full transition-all duration-200 ${torque < 70 ? "bg-green-500" :
                                    torque < 85 ? "bg-yellow-500" :
                                        torque < 95 ? "bg-orange-500" :
                                            "bg-red-500"
                                }`}
                            style={{ width: `${torque}%` }}
                        />
                    </div>
                    <div className="text-center mt-1 text-sm">
                        <span className={`font-bold ${torque < 85 ? "text-green-400" :
                                torque < 95 ? "text-yellow-400" : "text-red-400"
                            }`}>{torque.toFixed(0)}%</span>
                    </div>
                </div>

                {/* Fuel */}
                <div>
                    <div className="text-sm text-gray-300 mb-1">FUEL</div>
                    <div className="w-48 h-6 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-500">
                        <div
                            className={`h-full transition-all duration-300 ${fuel > 50 ? "bg-green-500" :
                                    fuel > 20 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                            style={{ width: `${fuel}%` }}
                        />
                    </div>
                    <div className="text-center mt-1 text-xs text-green-400">{fuel.toFixed(1)}%</div>
                </div>
            </div>

            {/* Bottom Left - Controls & Status */}
            <div className="absolute bottom-4 left-4 bg-black/70 p-4 rounded-lg backdrop-blur-sm max-w-md">
                <div className="text-xl font-bold mb-2 text-blue-400">HELICOPTER CONTROLS</div>

                {/* Collective Indicator */}
                <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm text-gray-400">COLLECTIVE:</span>
                    <div className="flex-1 h-4 bg-gray-700 rounded overflow-hidden border border-gray-500">
                        <div className="h-full bg-blue-400 transition-all" style={{ width: `${collectivePosition * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-blue-400 w-12">{(collectivePosition * 100).toFixed(0)}%</span>
                </div>

                {/* Ground Effect Indicator */}
                {inGroundEffect && (
                    <div className="mb-2 text-sm">
                        <span className="text-green-400">✓ IN GROUND EFFECT</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                    <div><span className="text-gray-400">W/S:</span> Collective</div>
                    <div><span className="text-gray-400">Mouse:</span> Cyclic</div>
                    <div><span className="text-gray-400">A/D:</span> Pedals (yaw)</div>
                    <div><span className="text-gray-400">Shift:</span> Collective boost</div>
                    <div className="col-span-2"><span className="text-gray-400">C:</span> Change Camera</div>
                    <div className="col-span-2 text-xs text-gray-500 mt-1">Click to lock mouse cursor</div>
                </div>
            </div>

            {/* Bottom Right - Info */}
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

            {/* Center - Attitude Indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-32 h-32">
                    {/* Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-cyan-400/50"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-0.5 h-full bg-cyan-400/50"></div>
                    </div>
                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 border-2 border-white"></div>
                    </div>
                </div>
            </div>

            {/* Top Center - Warning Messages */}
            {stallWarning && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-600/90 px-6 py-3 rounded-lg backdrop-blur-sm animate-pulse">
                    <div className="text-2xl font-bold text-white">⚠ VORTEX RING STATE</div>
                    <div className="text-sm text-center">FORWARD CYCLIC + POWER</div>
                </div>
            )}
            {rotorRPM < 80 && (
                <div className="absolute top-28 left-1/2 transform -translate-x-1/2 bg-red-600/90 px-6 py-3 rounded-lg backdrop-blur-sm animate-pulse">
                    <div className="text-xl font-bold text-white">⚠ LOW ROTOR RPM</div>
                </div>
            )}
            {torque > 90 && (
                <div className="absolute top-40 left-1/2 transform -translate-x-1/2 bg-orange-600/90 px-4 py-2 rounded-lg backdrop-blur-sm">
                    <div className="text-lg font-bold text-white">⚠ HIGH TORQUE</div>
                </div>
            )}
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
        </div>
    );
}
