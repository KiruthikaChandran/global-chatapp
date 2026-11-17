type EventCallback = (payload: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private shouldReconnect = false;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private inChatRoom = false;
  private listeners = new Map<string, Set<EventCallback>>();

  connect(token: string): void {
    if (this.socket && this.token === token && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.disconnect();
    this.token = token;
    this.shouldReconnect = true;
    this.openSocket();
  }

  private openSocket(): void {
    if (!this.token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(this.token)}`;

    const ws = new WebSocket(wsUrl);
    this.socket = ws;

    ws.onopen = () => {
      this.emitLocal('ws:connected', { connected: true });
      if (this.inChatRoom) {
        this.send('presence:chat_state', { inChatRoom: true });
      }
      this.startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { event: string; payload: unknown };
        this.emitLocal(parsed.event, parsed.payload);
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onclose = (ev) => {
      this.stopHeartbeat();
      this.emitLocal('ws:connected', { connected: false });
      if (ev.code === 4001) {
        this.shouldReconnect = false;
        return;
      }
      if (this.shouldReconnect) {
        this.reconnectTimer = window.setTimeout(() => {
          this.openSocket();
        }, 2500);
      }
    };

    ws.onerror = () => {
      // Handled by onclose
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.inChatRoom = false;
    this.token = null;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send('presence:heartbeat', { inChatRoom: this.inChatRoom });
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  setInChatRoom(active: boolean): void {
    this.inChatRoom = active;
    this.send('presence:chat_state', { inChatRoom: active });
  }

  send(event: string, payload: Record<string, unknown>): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, payload }));
      return true;
    }
    return false;
  }

  on(event: string, callback: EventCallback): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  }

  private emitLocal(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      cb(payload);
    }
  }
}

export const websocketService = new WebSocketService();
