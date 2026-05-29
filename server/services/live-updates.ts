import { Response } from 'express';

export interface SseEvent {
  event: string;
  data: any;
}

export class LiveUpdatesHub {
  private static clients: Map<string, Response> = new Map();

  /**
   * Registers a connected client to the SSE real-time stream.
   */
  static register(clientId: string, res: Response) {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Content-Encoding', 'none'); // Disable buffering on reverse proxies like Nginx
    
    // Send initial handshake connection established state
    this.sendToClient(res, {
      event: 'welcome',
      data: { message: "Apex SACCO Safe Live Feed Synced.", clientId, timestamp: new Date().toISOString() }
    });

    this.clients.set(clientId, res);
    console.log(`[SSE PubSub Hub] Real-time client connected: ${clientId}. Total active listening: ${this.clients.size}`);

    // Clean up connections on close
    res.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[SSE PubSub Hub] Client closed session: ${clientId}. Total active listening: ${this.clients.size}`);
    });
  }

  /**
   * Broadcasts a real-time system payload event to all connected dashboard accounts.
   */
  static broadcast(payload: SseEvent) {
    const serialized = `event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`;
    
    this.clients.forEach((res, clientId) => {
      try {
        res.write(serialized);
        // Explicitly flush to Nginx streams if buffer flush is supported
        if ((res as any).flush) {
          (res as any).flush();
        }
      } catch (err) {
        console.warn(`[SSE PubSub Hub] Failed sending push payload to client: ${clientId}. Discarding stale connection.`);
        this.clients.delete(clientId);
      }
    });
  }

  private static sendToClient(res: Response, payload: SseEvent) {
    res.write(`event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`);
    if ((res as any).flush) {
      (res as any).flush();
    }
  }
}
