import { useFlightSim, AircraftType } from "@/lib/stores/useFlightSim";
import { useGame } from "@/lib/stores/useGame";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const aircraftData: Record<AircraftType, { name: string; description: string; color: string; icon: string }> = {
  cessna: {
    name: "Cessna 172",
    description: "Light, agile aircraft perfect for beginners. Easy to control with good fuel efficiency.",
    color: "#3b82f6",
    icon: "✈"
  },
  cargo: {
    name: "Cargo Plane",
    description: "Heavy transport aircraft. Slower and less maneuverable but very stable.",
    color: "#f59e0b",
    icon: "✈"
  },
  fighter: {
    name: "Fighter Jet",
    description: "Fast and responsive. Burns fuel quickly but offers incredible speed and agility.",
    color: "#ef4444",
    icon: "✈"
  },
  helicopter: {
    name: "Helicopter",
    description: "Versatile VTOL aircraft. Can hover and fly in any direction. Great maneuverability.",
    color: "#10b981",
    icon: "🚁"
  },
  glider: {
    name: "Glider",
    description: "Ultra-efficient soaring aircraft. Minimal fuel consumption, excellent for long flights.",
    color: "#8b5cf6",
    icon: "🪂"
  },
  bomber: {
    name: "Bomber",
    description: "Heavy, slow, and stable. Built for endurance missions with large fuel capacity.",
    color: "#6b7280",
    icon: "✈"
  },
  stunt: {
    name: "Stunt Plane",
    description: "Extremely agile aerobatic aircraft. Perfect for tricks and high-speed maneuvers.",
    color: "#f59e0b",
    icon: "✈"
  }
};

export function AircraftSelection() {
  const { setAircraftType } = useFlightSim();
  const { start } = useGame();

  const handleSelect = (type: AircraftType) => {
    setAircraftType(type);
    start();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <Card className="w-full max-w-4xl mx-4 bg-gray-900/95 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-4xl text-center text-blue-400">Select Your Aircraft</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(Object.keys(aircraftData) as AircraftType[]).map((type) => {
              const aircraft = aircraftData[type];
              return (
                <div
                  key={type}
                  className="flex flex-col items-center p-5 border-2 border-gray-700 rounded-lg hover:border-blue-500 transition-all cursor-pointer bg-gray-800/50 hover:bg-gray-800/70"
                  onClick={() => handleSelect(type)}
                >
                  <div
                    className="w-20 h-20 rounded-full mb-3 flex items-center justify-center text-3xl"
                    style={{ backgroundColor: aircraft.color }}
                  >
                    {aircraft.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-center">{aircraft.name}</h3>
                  <p className="text-gray-300 text-center text-xs mb-4 min-h-[3rem]">{aircraft.description}</p>
                  <Button
                    onClick={() => handleSelect(type)}
                    className="w-full text-sm"
                    style={{ backgroundColor: aircraft.color }}
                  >
                    Select
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center text-gray-400">
            <p className="text-sm">Click on an aircraft to start flying!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
