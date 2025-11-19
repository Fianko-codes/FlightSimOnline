import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";

interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  fuel: number;
  throttle: number;
  aircraftType: string;
}

interface Lobby {
  id: string;
  name: string;
  createdAt: number;
  players: Map<string, PlayerState>;
}

interface LobbySummary {
  id: string;
  name: string;
  playerCount: number;
  createdAt: number;
}

const DEFAULT_LOBBY_ID = "open-skies";
const DEFAULT_LOBBY_NAME = "Open Skies";

const lobbies = new Map<string, Lobby>();

function ensureLobby(id = DEFAULT_LOBBY_ID, name = DEFAULT_LOBBY_NAME): Lobby {
  if (!lobbies.has(id)) {
    lobbies.set(id, {
      id,
      name,
      createdAt: Date.now(),
      players: new Map(),
    });
  }
  return lobbies.get(id)!;
}

function createLobby(name: string): Lobby {
  const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let finalId = `${baseId || "lobby"}-${Math.floor(Math.random() * 9000 + 1000)}`;

  while (lobbies.has(finalId)) {
    finalId = `${baseId || "lobby"}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  const lobby: Lobby = {
    id: finalId,
    name,
    createdAt: Date.now(),
    players: new Map(),
  };

  lobbies.set(finalId, lobby);
  return lobby;
}

function getLobbySummary(lobby: Lobby): LobbySummary {
  return {
    id: lobby.id,
    name: lobby.name,
    createdAt: lobby.createdAt,
    playerCount: lobby.players.size,
  };
}

function cleanupLobby(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;
  if (lobby.id === DEFAULT_LOBBY_ID) return;
  if (lobby.players.size === 0) {
    lobbies.delete(lobbyId);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  ensureLobby();

  const httpServer = createServer(app);
  
  // Set up Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.get("/api/lobbies", (_req, res) => {
    ensureLobby();
    const summaries = Array.from(lobbies.values()).map(getLobbySummary);
    res.json(summaries);
  });

  app.post("/api/lobbies", (req, res) => {
    const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const name = rawName || `Lobby ${lobbies.size + 1}`;
    const lobby = createLobby(name);
    res.status(201).json(getLobbySummary(lobby));
  });

  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    const requestedLobby = socket.handshake.query.lobbyId;
    const lobbyId = typeof requestedLobby === "string" && requestedLobby.length > 0
      ? requestedLobby
      : DEFAULT_LOBBY_ID;
    const lobby = ensureLobby(lobbyId);
    const players = lobby.players;
    socket.join(lobby.id);
    
    // Initialize new player
    const newPlayer: PlayerState = {
      id: socket.id,
      position: { x: 0, y: 50, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      fuel: 100,
      throttle: 0,
      aircraftType: "cessna"
    };
    
    players.set(socket.id, newPlayer);
    
    // Send current players to new player
    socket.emit("init", {
      playerId: socket.id,
      players: Array.from(players.values())
    });
    
    // Notify other players of new player
    socket.to(lobby.id).emit("playerJoined", newPlayer);
    
    // Handle player state updates
    socket.on("updateState", (state: PlayerState) => {
      players.set(socket.id, { ...state, id: socket.id });
      socket.to(lobby.id).emit("playerUpdate", { ...state, id: socket.id });
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      players.delete(socket.id);
      socket.to(lobby.id).emit("playerLeft", socket.id);
      cleanupLobby(lobby.id);
    });
  });

  return httpServer;
}
