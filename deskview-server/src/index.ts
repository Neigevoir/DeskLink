import os from 'os';
import { CONFIG } from '@desklink/shared';
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

function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const addrs: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addrs.push(iface.address);
      }
    }
  }
  return addrs;
}
