import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useFlightSim } from "@/lib/stores/useFlightSim";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface LobbySummary {
  id: string;
  name: string;
  playerCount: number;
  createdAt: number;
}

export function MultiplayerLobby() {
  const { joinLobby, hasJoinedLobby } = useFlightSim();
  const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sortedLobbies = useMemo(() => {
    return [...lobbies].sort((a, b) => b.playerCount - a.playerCount);
  }, [lobbies]);

  const fetchLobbies = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/lobbies");
      if (!response.ok) {
        throw new Error("Failed to load lobby list");
      }
      const data: LobbySummary[] = await response.json();
      setLobbies(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load lobbies";
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasJoinedLobby) {
      fetchLobbies();
      const interval = setInterval(fetchLobbies, 8000);
      return () => clearInterval(interval);
    }
  }, [fetchLobbies, hasJoinedLobby]);

  const handleCreateLobby = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newLobbyName.trim();
    if (!name) {
      setError("Enter a lobby name to create a session");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to create lobby");
      }

      const lobby: LobbySummary = await response.json();
      setNewLobbyName("");
      setLobbies((prev) => [lobby, ...prev.filter((l) => l.id !== lobby.id)]);
      joinLobby(lobby.id, lobby.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create lobby";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (hasJoinedLobby) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <Card className="w-full max-w-5xl bg-slate-950/90 border-slate-800 text-white">
        <CardHeader className="space-y-2">
          <CardTitle className="text-4xl text-blue-300">Multiplayer Lobby</CardTitle>
          <CardDescription className="text-slate-300 text-base">
            Join an existing flight session or create your own airspace lobby.
          </CardDescription>
          {error && (
            <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          <form onSubmit={handleCreateLobby} className="flex flex-col gap-3 md:flex-row">
            <Input
              value={newLobbyName}
              onChange={(e) => setNewLobbyName(e.target.value)}
              placeholder="Call your lobby something memorable..."
              className="bg-slate-900/80 border-slate-700 text-white"
              disabled={isCreating}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create & Join"}
              </Button>
              <Button type="button" variant="secondary" onClick={fetchLobbies} disabled={isRefreshing}>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="text-lg font-semibold text-slate-200">
              Available Lobbies
            </div>
            {isLoading ? (
              <div className="text-center text-slate-400">Loading lobbies...</div>
            ) : sortedLobbies.length === 0 ? (
              <div className="text-center text-slate-400">
                No active lobbies yet — create one to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sortedLobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg ring-1 ring-white/5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-400">{lobby.name}</div>
                        <div className="text-sm text-slate-400">Session ID: {lobby.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-300">{lobby.playerCount}</div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Pilots
                        </div>
                      </div>
                    </div>
                    <Button
                      className="mt-4 w-full"
                      onClick={() => joinLobby(lobby.id, lobby.name)}
                    >
                      Join Lobby
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

