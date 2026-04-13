import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WSClient {
  ws: WebSocket;
  subscriptions: Set<string>;
}

let wss: WebSocketServer;
const clients: Map<string, WSClient> = new Map();

function broadcast(channel: string, data: any) {
  const message = JSON.stringify({ channel, data });
  clients.forEach((client) => {
    if (client.subscriptions.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

export function setupIncidentWS() {
  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, { ws, subscriptions: new Set() });
    console.log(`[WS] Client connected: ${clientId}`);

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        const client = clients.get(clientId);
        
        if (msg.type === 'subscribe' && msg.channels) {
          msg.channels.forEach((ch: string) => client?.subscriptions.add(ch));
          ws.send(JSON.stringify({ type: 'subscribed', channels: Array.from(client?.subscriptions || []) }));
        }
        
        if (msg.type === 'unsubscribe' && msg.channels) {
          msg.channels.forEach((ch: string) => client?.subscriptions.delete(ch));
        }
      } catch (e) {
        console.error('[WS] Invalid message:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`[WS] Client disconnected: ${clientId}`);
    });
  });

  console.log('[WS] Incident WebSocket server initialized on /api/ws');
  return wss;
}

export function broadcastIncident(incident: any) {
  broadcast('incidents', { type: 'new', incident });
}

export function broadcastAlert(alert: any) {
  broadcast('alerts', { type: 'new', alert });
}

export function broadcastTelemetry(data: any) {
  broadcast('telemetry', data);
}