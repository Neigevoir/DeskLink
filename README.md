# DeskLink

WebRTC-based remote desktop control demo with peer-to-peer chat.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shared protocol | TypeScript (compiled to JS for web client) |
| Agent UI | Electron + React 19 + TypeScript |
| Client UI | Electron + React 19 + TypeScript |
| Web client | Vanilla JS (mobile-friendly, no build step) |
| Signaling server | Node.js + TypeScript (run with tsx) |
| Build tool | electron-vite 5 |

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│    deskview-agent    │         │   deskview-client    │
│    (Electron+React)  │         │   (Electron+React)   │
│                      │         │                      │
│  ┌────────────────┐  │         │  ┌────────────────┐  │
│  │  App.tsx       │  │         │  │  App.tsx       │  │
│  │  AgentView.tsx  │  │         │  │  JoinView.tsx  │  │
│  │  ChatView.tsx   │  │         │  │  ClientView.tsx│  │
│  └───────┬────────┘  │         │  │  ChatView.tsx   │  │
│          │ imports    │         │  └───────┬────────┘  │
│  ┌───────┴────────┐  │         │  ┌───────┴────────┐  │
│  │ @desklink/shared│  │         │  │ @desklink/shared│  │
│  │  ┌───────────┐  │  │         │  │  ┌───────────┐  │  │
│  │  │ signaling │  │◄├─────────┼─┼─►│ signaling │  │  │
│  │  │ webrtc    │  │  │ WebRTC  │  │  │ webrtc    │  │  │
│  │  │ protocol  │  │  │ P2P     │  │  │ protocol  │  │  │
│  │  └───────────┘  │  │─────────┼──┼─►│           │  │  │
│  └─────────────────┘  │         │  └─────────────────┘  │
└─────────┼──────────────┘         └─────────┼──────────────┘
          │                                  │
          │     deskview-server              │
          │     ┌──────────────┐             │
          └────►│ room.ts      │◄────────────┘
                │ server.ts    │
                │ (WebSocket   │
                │  signaling)  │
                └──────────────┘
```

## Project Structure

```
DeskLink/
├── package.json                 # npm workspaces root
├── tsconfig.base.json           # Shared TS compiler options
├── shared/                      # @desklink/shared
│   ├── src/
│   │   ├── index.ts             # Barrel export
│   │   ├── protocol.ts          # Message types, config, helpers
│   │   ├── signaling.ts         # SignalingClient (WebSocket + reconnect)
│   │   ├── webrtc.ts            # WebRTCManager
│   │   └── chat.ts              # ChatMessage type + helper
│   └── dist/                    # Compiled JS for web client
├── deskview-server/             # @desklink/server
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── server.ts            # HTTP + WSS factory
│   │   ├── room.ts              # Room (agent+client pair)
│   │   └── public/index.html    # Web client (mobile-friendly)
│   └── package.json
├── deskview-agent/              # @desklink/agent
│   ├── electron.vite.config.ts
│   ├── src/
│   │   ├── main/index.ts        # Electron main process
│   │   ├── preload/index.ts     # Context bridge
│   │   └── renderer/
│   │       ├── index.html
│   │       └── src/
│   │           ├── main.tsx     # React entry
│   │           ├── App.tsx      # Root component
│   │           └── components/
│   │               ├── AgentView.tsx
│   │               └── ChatView.tsx
│   └── package.json
└── deskview-client/             # @desklink/client
    ├── electron.vite.config.ts
    ├── src/
    │   ├── main/index.ts
    │   ├── preload/index.ts
    │   └── renderer/
    │       ├── index.html
    │       └── src/
    │           ├── main.tsx
    │           ├── App.tsx
    │           └── components/
    │               ├── JoinView.tsx
    │               ├── ClientView.tsx
    │               └── ChatView.tsx
    └── package.json
```

## Requirements

- Node.js >= 18
- npm >= 9

## Install

```bash
npm install
```

A single `npm install` at the repo root installs all four workspace packages.

## Run

Open three terminals:

### 1. Signaling server

```bash
npm -w @desklink/server run dev
```

### 2. Agent (on the machine to be controlled)

```bash
npm -w @desklink/agent run dev
```

1. Select a screen/window from the dropdown
2. Click **Start Sharing**
3. Note the 4-letter room code displayed in the UI

### 3. Client (on the controlling machine)

**Electron client:**

```bash
npm -w @desklink/client run dev
```

Enter the room code -> view remote screen + chat.

**Web client (mobile-friendly):**

Open `http://<server-ip>:3099` in a browser. Enter the room code -> view + chat.

## Build

```bash
npm run build:shared        # Compile shared/ TS to JS
npm -w @desklink/agent run build   # Package agent for distribution
npm -w @desklink/client run build  # Package client for distribution
```

## WebRTC Flow

1. Agent registers -> server creates room, returns code
2. Client joins room with code
3. Server notifies both peers when the room is ready
4. Agent creates offer -> server relays to client
5. Client creates answer -> server relays to agent
6. ICE candidates exchanged -> P2P connection established
7. Video track + DataChannel (chat) flow directly between peers

> Demo uses Google public STUN servers (LAN only). Cross-network needs a TURN server.
