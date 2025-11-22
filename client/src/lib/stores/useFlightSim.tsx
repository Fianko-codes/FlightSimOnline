import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { config } from "@/lib/config";

export type CameraView = "chase" | "firstperson" | "external";
export type AircraftType = "cessna" | "cargo" | "fighter" | "helicopter" | "glider" | "bomber" | "stunt";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  fuel: number;
  throttle: number;
  aircraftType: AircraftType;
}

interface FlightSimState {
  // Player state
  playerId: string | null;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  fuel: number;
  throttle: number;
  speed: number;
  altitude: number;
  aircraftType: AircraftType;

  // Camera
  cameraView: CameraView;

  // Multiplayer
  socket: Socket | null;
  otherPlayers: Map<string, PlayerState>;
  isConnected: boolean;
  lobbyId: string | null;
  lobbyName: string | null;
  hasJoinedLobby: boolean;

  // Actions
  setPosition: (position: Vector3) => void;
  setRotation: (rotation: Vector3) => void;
  setVelocity: (velocity: Vector3) => void;
  setThrottle: (throttle: number) => void;
  setFuel: (fuel: number) => void;
  setSpeed: (speed: number) => void;
  setAltitude: (altitude: number) => void;
  setAircraftType: (type: AircraftType) => void;
  setCameraView: (view: CameraView) => void;
  cycleCameraView: () => void;
  consumeFuel: (amount: number) => void;
  refuel: (amount: number) => void;
  joinLobby: (lobbyId: string, lobbyName: string) => void;
  leaveLobby: () => void;

  // Multiplayer actions
  connectMultiplayer: (lobbyId?: string) => void;
  disconnectMultiplayer: () => void;
  updateMultiplayerState: () => void;
  addOtherPlayer: (player: PlayerState) => void;
  updateOtherPlayer: (player: PlayerState) => void;
  removeOtherPlayer: (playerId: string) => void;
}

export const useFlightSim = create<FlightSimState>()(
  subscribeWithSelector((set, get) => ({
    // Initial player state
    playerId: null,
    position: { x: 0, y: 50, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    fuel: 100,
    throttle: 0,
    speed: 0,
    altitude: 50,
    aircraftType: "cessna",

    // Initial camera state
    cameraView: "chase",

    // Initial multiplayer state
    socket: null,
    otherPlayers: new Map(),
    isConnected: false,
    lobbyId: null,
    lobbyName: null,
    hasJoinedLobby: false,

    // Actions
    setPosition: (position) => set({ position }),
    setRotation: (rotation) => set({ rotation }),
    setVelocity: (velocity) => set({ velocity }),
    setThrottle: (throttle) => set({ throttle: Math.max(0, Math.min(1, throttle)) }),
    setFuel: (fuel) => set({ fuel: Math.max(0, Math.min(100, fuel)) }),
    setSpeed: (speed) => set({ speed }),
    setAltitude: (altitude) => set({ altitude }),
    setAircraftType: (type) => set({ aircraftType: type }),

    setCameraView: (view) => set({ cameraView: view }),

    cycleCameraView: () => {
      const views: CameraView[] = ["chase", "firstperson", "external"];
      const currentView = get().cameraView;
      const currentIndex = views.indexOf(currentView);
      const nextIndex = (currentIndex + 1) % views.length;
      set({ cameraView: views[nextIndex] });
    },

    consumeFuel: (amount) => {
      const currentFuel = get().fuel;
      set({ fuel: Math.max(0, currentFuel - amount) });
    },

    refuel: (amount) => {
      const currentFuel = get().fuel;
      set({ fuel: Math.min(100, currentFuel + amount) });
    },

    joinLobby: (lobbyId, lobbyName) => {
      const currentLobby = get().lobbyId;
      if (currentLobby === lobbyId && get().hasJoinedLobby) {
        return;
      }

      get().disconnectMultiplayer();
      set({
        lobbyId,
        lobbyName,
        hasJoinedLobby: true,
        playerId: null,
        otherPlayers: new Map(),
        isConnected: false,
      });
    },

    leaveLobby: () => {
      get().disconnectMultiplayer();
      set({
        lobbyId: null,
        lobbyName: null,
        hasJoinedLobby: false,
        playerId: null,
        otherPlayers: new Map(),
        isConnected: false,
      });
    },

    // Multiplayer actions
    connectMultiplayer: (lobbyIdParam) => {
      const lobbyId = lobbyIdParam || get().lobbyId;
      if (!lobbyId) {
        console.warn("Attempted to connect to multiplayer without a lobby ID");
        return;
      }

      const existingSocket = get().socket;
      if (existingSocket) {
        existingSocket.disconnect();
      }

      const socket = io(config.socketUrl, {
        transports: ['websocket', 'polling'],
        query: { lobbyId }
      });

      socket.on("connect", () => {
        console.log("Connected to multiplayer server");
        set({ isConnected: true });
      });

      socket.on("init", (data: { playerId: string; players: PlayerState[] }) => {
        console.log("Initialized with player ID:", data.playerId);
        set({ playerId: data.playerId });

        // Add all existing players
        const otherPlayers = new Map<string, PlayerState>();
        data.players.forEach(player => {
          if (player.id !== data.playerId) {
            otherPlayers.set(player.id, player);
          }
        });
        set({ otherPlayers });
      });

      socket.on("playerJoined", (player: PlayerState) => {
        console.log("Player joined:", player.id);
        get().addOtherPlayer(player);
      });

      socket.on("playerUpdate", (player: PlayerState) => {
        get().updateOtherPlayer(player);
      });

      socket.on("playerLeft", (playerId: string) => {
        console.log("Player left:", playerId);
        get().removeOtherPlayer(playerId);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from multiplayer server");
        set({ isConnected: false });
      });

      set({ socket });
    },

    disconnectMultiplayer: () => {
      const socket = get().socket;
      if (socket) {
        socket.disconnect();
        set({
          socket: null,
          isConnected: false,
          otherPlayers: new Map(),
          playerId: null
        });
      }
    },

    updateMultiplayerState: () => {
      const socket = get().socket;
      if (socket && socket.connected) {
        const state: PlayerState = {
          id: get().playerId || "",
          position: get().position,
          rotation: get().rotation,
          velocity: get().velocity,
          fuel: get().fuel,
          throttle: get().throttle,
          aircraftType: get().aircraftType
        };
        socket.emit("updateState", state);
      }
    },

    addOtherPlayer: (player) => {
      const otherPlayers = new Map(get().otherPlayers);
      otherPlayers.set(player.id, player);
      set({ otherPlayers });
    },

    updateOtherPlayer: (player) => {
      const otherPlayers = new Map(get().otherPlayers);
      if (otherPlayers.has(player.id)) {
        otherPlayers.set(player.id, player);
        set({ otherPlayers });
      }
    },

    removeOtherPlayer: (playerId) => {
      const otherPlayers = new Map(get().otherPlayers);
      otherPlayers.delete(playerId);
      set({ otherPlayers });
    }
  }))
);
