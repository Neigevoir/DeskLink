/**
 * DeskLink signaling server — HTTP static file server + WebSocket signaling.
 *
 * Serves:
 *   /          → public/index.html (web client)
 *   /shared/   → ../../shared/ (ES modules for the web client)
 *
 * WebSocket routing:
 *   register { role: 'agent' }          → creates room, replies with room-created
 *   register { role: 'client', room }   → joins room, replies with join-success / join-error
 *   offer / answer / ice-candidate      → relayed to the other peer in the room
 *
 * @module deskview-server/src/server
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { MessageType, generateRoomCode, createMessage } from '../../shared/protocol.js';
import { Room } from './room.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * Create and start the DeskLink server.
 * @param {number} port
 * @returns {http.Server}
 */
export function createServer(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Map /shared/* to the shared/ directory at the repo root
    if (url.pathname.startsWith('/shared/')) {
      const filePath = path.join(__dirname, '..', '..', 'shared', url.pathname.slice('/shared/'.length));
      serveFile(res, filePath);
      return;
    }

    // Everything else serves from public/
    let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    serveFile(res, filePath);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    /** @type {Room|null} */
    let currentRoom = null;

    ws.on('message', (data) => {
      /** @type {any} */
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch (_) {
        return;
      }

      switch (msg.type) {
        case MessageType.REGISTER: {
          if (msg.role === 'agent') {
            const code = generateRoomCode();
            const room = new Room(code);
            rooms.set(code, room);
            const result = room.register(ws, 'agent');
            if (result.ok) {
              currentRoom = room;
              ws.send(JSON.stringify(createMessage(MessageType.ROOM_CREATED, { room: code })));
              console.log(`Room ${code}: agent joined`);
            }
          } else if (msg.role === 'client') {
            const room = rooms.get(msg.room);
            if (!room) {
              ws.send(JSON.stringify(createMessage(MessageType.JOIN_ERROR, { error: 'Room not found' })));
              return;
            }
            const result = room.register(ws, 'client');
            if (result.ok) {
              currentRoom = room;
              ws.send(JSON.stringify(createMessage(MessageType.JOIN_SUCCESS, { room: room.id })));
              console.log(`Room ${room.id}: client joined`);
            } else {
              ws.send(JSON.stringify(createMessage(MessageType.JOIN_ERROR, { error: result.error })));
            }
          }
          break;
        }

        case MessageType.OFFER:
        case MessageType.ANSWER:
        case MessageType.ICE_CANDIDATE:
          if (currentRoom) {
            currentRoom.relay(ws, msg);
          }
          break;
      }
    });

    ws.on('close', () => {
      if (currentRoom) {
        currentRoom.unregister(ws);
        console.log(`Room ${currentRoom.id}: peer left`);
        if (currentRoom.isEmpty()) {
          rooms.delete(currentRoom.id);
          console.log(`Room ${currentRoom.id}: deleted`);
        }
      }
    });
  });

  server.listen(port);
  return server;
}

// ---- Helpers ----

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * @param {http.ServerResponse} res
 * @param {string} filePath
 */
function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}
