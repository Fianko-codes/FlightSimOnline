import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";

interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  fuel: number;
  throttle: number;
  aircraftType: string;
}

const players = new Map<string, PlayerState>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
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
    socket.broadcast.emit("playerJoined", newPlayer);
    
    // Handle player state updates
    socket.on("updateState", (state: PlayerState) => {
      players.set(socket.id, { ...state, id: socket.id });
      socket.broadcast.emit("playerUpdate", { ...state, id: socket.id });
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      players.delete(socket.id);
      socket.broadcast.emit("playerLeft", socket.id);
    });
  });

  return httpServer;
}
