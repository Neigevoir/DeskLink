import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, type WebSocket } from 'ws';
import { MessageType, generateRoomCode, createMessage, type SignalMessage } from '@desklink/shared';
import { Room } from './room.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rooms = new Map<string, Room>();

export function createServer(port: number): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname.startsWith('/shared/')) {
      const filePath = path.join(__dirname, '..', '..', 'shared', 'dist', url.pathname.slice('/shared/'.length));
      serveFile(res, filePath);
      return;
    }

    let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    serveFile(res, filePath);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoom: Room | null = null;

    ws.on('message', (data: Buffer) => {
      let msg: SignalMessage;
      try {
        msg = JSON.parse(data.toString()) as SignalMessage;
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
            const room = rooms.get(msg.room as string);
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

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function serveFile(res: http.ServerResponse, filePath: string): void {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      });
      res.end(data);
    }
  });
}
