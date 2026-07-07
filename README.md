# DeskLink

WebRTC-based remote desktop control demo with peer-to-peer chat. Built to demonstrate architecture design, module organization, and WebRTC proficiency.

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│    deskview-agent    │         │   deskview-client    │
│    (Electron)        │         │   (Electron / Web)   │
│                      │         │                      │
│  ┌────────────────┐  │         │  ┌────────────────┐  │
│  │  renderer/app  │  │         │  │  renderer/app  │  │
│  │  (thin glue)   │  │         │  │  (thin glue)   │  │
│  └───────┬────────┘  │         │  └───────┬────────┘  │
│          │ imports    │         │          │ imports    │
│  ┌───────┴────────┐  │         │  ┌───────┴────────┐  │
│  │   shared/       │  │         │  │   shared/       │  │
│  │  ┌───────────┐  │  │         │  │  ┌───────────┐  │  │
│  │  │ signaling │  │◄├─────────┼─┼─►│ signaling │  │  │
│  │  │ webrtc    │  │  │ WebRTC  │  │  │ webrtc    │  │  │
│  │  │ chat      │  │  │ P2P     │  │  │ chat      │  │  │
│  │  │ protocol  │  │  │─────────┼──┼─►│ protocol  │  │  │
│  │  └───────────┘  │  │         │  │  └───────────┘  │  │
│  └─────────────────┘  │         │  └─────────────────┘  │
│         │              │         │         │              │
└─────────┼──────────────┘         └─────────┼──────────────┘
          │                                  │
          │     deskview-server              │
          │     ┌──────────────┐             │
          └────►│ room.js      │◄────────────┘
                │ server.js    │
                │ (WebSocket   │
                │  signaling)  │
                └──────────────┘
```

### Key design decisions

- **Zero build step** — ES modules work natively in Node 18+, Electron renderers, and modern browsers. JSDoc + `jsconfig.json` provides editor-level type checking without compilation.
- **Shared modules eliminate duplication** — `SignalingClient`, `WebRTCManager`, and `ChatUI` live in `shared/` and are imported by all three clients (agent renderer, Electron client renderer, web client). Each client is a ~60-line `app.js` that wires shared modules to its DOM.
- **Room-based signaling** — The server maps each agent-client pair to a room identified by a 4-letter human-readable code. Multiple sessions can coexist.
- **Exponential-backoff reconnect** — `SignalingClient` retries with capped exponential backoff, demonstrating production readiness thinking.

## Project Structure

```
DeskLink/
├── shared/                     # Shared modules (imported by all clients)
│   ├── protocol.js             # Message types, config, helpers
│   ├── signaling.js            # SignalingClient (WebSocket + reconnect)
│   ├── webrtc.js               # WebRTCManager (PeerConnection + DataChannel)
│   └── chat.js                 # ChatUI (DOM component)
├── deskview-server/            # Signaling server
│   ├── src/
│   │   ├── index.js            # Entry point
│   │   ├── server.js           # HTTP + WSS factory
│   │   ├── room.js             # Room (agent+client pair)
│   │   └── public/index.html   # Web client (mobile-friendly)
│   └── package.json
├── deskview-agent/             # Electron agent (screen capture)
│   ├── src/
│   │   ├── main.js             # Electron main process
│   │   ├── preload.js          # Context bridge
│   │   └── renderer/
│   │       ├── index.html      # Pure HTML+CSS
│   │       └── app.js          # Thin controller (~60 lines)
│   └── package.json
├── deskview-client/            # Electron client (viewer)
│   ├── src/
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── renderer/
│   │       ├── index.html
│   │       └── app.js
│   └── package.json
├── jsconfig.json               # Editor type checking (zero runtime cost)
└── README.md
```

## Requirements

- Node.js >= 18
- npm >= 9

## Install

```bash
cd deskview-server && npm install
cd ../deskview-agent && npm install
cd ../deskview-client && npm install
```

## Run

Open three terminals:

### 1. Signaling server

```bash
cd deskview-server && npm start
```

### 2. Agent (on the machine to be controlled)

```bash
cd deskview-agent && npm start
```

1. Select a screen/window from the dropdown
2. Click **Start Sharing**
3. Note the 4-letter room code displayed in the UI

### 3. Client (on the controlling machine)

**Electron client:**

```bash
cd deskview-client && npm start
```

Enter the room code → view remote screen + chat.

**Web client (mobile-friendly):**

Open `http://<server-ip>:3099` in a browser. Enter the room code → view + chat.

## WebRTC Flow

1. Agent registers → server creates room, returns code
2. Client joins room with code
3. Server notifies both peers when the room is ready
4. Agent creates offer → server relays to client
5. Client creates answer → server relays to agent
6. ICE candidates exchanged → P2P connection established
7. Video track + DataChannel (chat) flow directly between peers

> Demo uses Google public STUN servers (LAN only). Cross-network needs a TURN server.
