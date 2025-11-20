# Flight Simulator - Multiplayer 3D Game

## Overview

This is a real-time multiplayer flight simulator built with React Three Fiber for 3D rendering and Socket.io for multiplayer networking. Players control aircraft in a shared 3D environment with realistic flight physics including gravity, lift, drag, and fuel management. The application features multiple camera views (chase, cockpit, external), a HUD display showing flight data, and real-time synchronization of player positions across connected clients.

## System Architecture

### Frontend Architecture

**3D Rendering Engine**: React Three Fiber (@react-three/fiber) is used as the primary 3D rendering solution, built on top of Three.js. This provides a declarative React-based approach to building 3D scenes.

**Component Structure**: The application follows a modular component architecture:
- `Aircraft.tsx` - Handles individual aircraft rendering and physics simulation
- `Environment.tsx` - Renders the 3D world (terrain, lighting, clouds)
- `FlightCamera.tsx` - Manages camera positioning and view modes
- `HUD.tsx` - Displays overlay flight information
- `MultiplayerPlayers.tsx` - Renders other connected players' aircraft

**State Management**: Zustand is used for client-side state management with multiple stores:
- `useFlightSim` - Core flight simulation state (position, rotation, velocity, fuel, multiplayer connections)
- `useGame` - Game phase management (ready, playing, ended)
- `useAudio` - Audio playback control and muting

The Zustand stores use the `subscribeWithSelector` middleware to enable fine-grained reactivity.

**UI Framework**: The application uses Radix UI primitives with Tailwind CSS for styling. A comprehensive component library is included in `client/src/components/ui/` providing buttons, cards, dialogs, and other interface elements.

**Build System**: Vite is configured as the build tool with React plugin support. Special configuration includes GLSL shader support via `vite-plugin-glsl` and custom asset handling for 3D models and audio files (.gltf, .glb, .mp3, .ogg, .wav).

### Backend Architecture

**Server Framework**: Express.js serves as the HTTP server framework, handling both API routes and static file serving.

**Real-time Communication**: Socket.io is integrated for WebSocket-based real-time multiplayer functionality. The server maintains a `Map` of connected players and broadcasts position updates.

**Development vs Production**: The architecture uses environment-aware setup:
- Development: Vite dev server runs in middleware mode with HMR
- Production: Pre-built static files are served from the `dist/public` directory

**Code Organization**: Server code is split into:
- `server/index.ts` - Express app setup, middleware, error handling
- `server/routes.ts` - Socket.io connection handling and multiplayer game logic
- `server/vite.ts` - Vite integration for development
- `server/storage.ts` - Data access layer (currently in-memory, database-ready interface)

### Data Storage Solutions

**Database ORM**: Drizzle ORM is configured for PostgreSQL with schema defined in `shared/schema.ts`. Currently defines a `users` table with username/password fields.

**Database Provider**: Neon serverless PostgreSQL (@neondatabase/serverless) is the chosen database provider, optimized for serverless environments.

**In-Memory Fallback**: A `MemStorage` class provides an in-memory implementation of the storage interface for development or testing without a database connection.

**Schema Management**: Drizzle Kit handles migrations with configuration pointing to `./migrations` directory. Schema validation uses Zod for type-safe inserts.

### External Dependencies

**3D Graphics Stack**:
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Helper components for R3F (cameras, controls, loaders)
- `@react-three/postprocessing` - Post-processing effects

**Real-time Communication**:
- `socket.io` (server) and `socket.io-client` (client) - WebSocket-based bidirectional communication for multiplayer

**Database & ORM**:
- `drizzle-orm` - TypeScript ORM with PostgreSQL dialect
- `@neondatabase/serverless` - Neon PostgreSQL client
- `drizzle-kit` - CLI for schema management and migrations

**UI Component Libraries**:
- `@radix-ui/*` - Headless accessible UI primitives (27+ component packages)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Type-safe variant styling
- `lucide-react` - Icon library

**State & Data Fetching**:
- `zustand` - Lightweight state management
- `@tanstack/react-query` - Server state management and caching

**Fonts & Assets**:
- `@fontsource/inter` - Self-hosted Inter font family

**Build Tools**:
- `vite` - Fast build tool and dev server
- `esbuild` - JavaScript bundler for server code
- `tsx` - TypeScript execution for development
- `vite-plugin-glsl` - GLSL shader support

**Session Management**:
- `connect-pg-simple` - PostgreSQL session store (configured but not actively used in current implementation)