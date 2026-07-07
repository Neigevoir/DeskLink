/**
 * DeskLink signaling server entry point.
 *
 * Starts the HTTP + WebSocket server and prints local network addresses
 * so the web client can be accessed from mobile devices on the same LAN.
 *
 * @module deskview-server/src/index
 */

import os from 'os';
import { CONFIG } from '../../shared/protocol.js';
import { createServer } from './server.js';

const PORT = CONFIG.DEFAULT_SIGNAL_PORT;

createServer(PORT);

const addrs = getLocalIPs();
console.log('\n  DeskLink Signaling Server\n');
console.log(`  Local:    http://localhost:${PORT}`);
for (const addr of addrs) {
  console.log(`  Network:  http://${addr}:${PORT}`);
}
console.log('\n  Web client: open the Network URL above in your browser.\n');

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addrs.push(iface.address);
      }
    }
  }
  return addrs;
}
