import type { WebSocket } from 'ws';

interface SocketMetadata {
  userId: number;
  inChatRoom: boolean;
  lastActivityAt: number;
}

const LIVE_IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes of inactivity drops LIVE back to ONLINE

class PresenceManager {
  private userSockets = new Map<number, Set<WebSocket>>();
  private socketMeta = new Map<WebSocket, SocketMetadata>();
  private lastBroadcastSnapshot = new Map<number, 'LIVE' | 'ONLINE' | 'OFFLINE'>();

  registerSocket(userId: number, ws: WebSocket): void {
    let set = this.userSockets.get(userId);
    if (!set) {
      set = new Set<WebSocket>();
      this.userSockets.set(userId, set);
    }
    set.add(ws);
    this.socketMeta.set(ws, {
      userId,
      inChatRoom: false,
      lastActivityAt: Date.now(),
    });
    this.broadcastPresenceIfChanged(userId);
  }

  unregisterSocket(ws: WebSocket): void {
    const meta = this.socketMeta.get(ws);
    if (!meta) return;
    this.socketMeta.delete(ws);
    const set = this.userSockets.get(meta.userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.userSockets.delete(meta.userId);
      }
    }
    this.broadcastPresenceIfChanged(meta.userId);
  }

  setChatActivity(ws: WebSocket, inChatRoom: boolean): void {
    const meta = this.socketMeta.get(ws);
    if (!meta) return;
    meta.inChatRoom = inChatRoom;
    meta.lastActivityAt = Date.now();
    this.broadcastPresenceIfChanged(meta.userId);
  }

  touchActivity(ws: WebSocket, markLive = false): void {
    const meta = this.socketMeta.get(ws);
    if (!meta) return;
    meta.lastActivityAt = Date.now();
    if (markLive) {
      meta.inChatRoom = true;
    }
    this.broadcastPresenceIfChanged(meta.userId);
  }

  markUserLiveFromRest(userId: number): void {
    const set = this.userSockets.get(userId);
    if (!set) return;
    const now = Date.now();
    for (const ws of set) {
      const meta = this.socketMeta.get(ws);
      if (meta) {
        meta.lastActivityAt = now;
        meta.inChatRoom = true;
      }
    }
    this.broadcastPresenceIfChanged(userId);
  }

  getUserStatus(userId: number): 'LIVE' | 'ONLINE' | 'OFFLINE' {
    const set = this.userSockets.get(userId);
    if (!set || set.size === 0) {
      return 'OFFLINE';
    }
    const now = Date.now();
    for (const ws of set) {
      const meta = this.socketMeta.get(ws);
      if (meta && meta.inChatRoom && now - meta.lastActivityAt <= LIVE_IDLE_TIMEOUT_MS) {
        return 'LIVE';
      }
    }
    return 'ONLINE';
  }

  getPresenceMap(): Record<number, 'LIVE' | 'ONLINE'> {
    const map: Record<number, 'LIVE' | 'ONLINE'> = {};
    for (const userId of this.userSockets.keys()) {
      const status = this.getUserStatus(userId);
      if (status !== 'OFFLINE') {
        map[userId] = status;
      }
    }
    return map;
  }

  getCounts(): { onlineCount: number; liveCount: number } {
    let onlineCount = 0;
    let liveCount = 0;
    for (const userId of this.userSockets.keys()) {
      const status = this.getUserStatus(userId);
      if (status === 'LIVE') {
        onlineCount += 1;
        liveCount += 1;
      } else if (status === 'ONLINE') {
        onlineCount += 1;
      }
    }
    return { onlineCount, liveCount };
  }

  broadcastAll(event: string, payload: unknown): void {
    const message = JSON.stringify({ event, payload });
    for (const set of this.userSockets.values()) {
      for (const ws of set) {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  sendToUsers(userIds: number[], event: string, payload: unknown): void {
    const message = JSON.stringify({ event, payload });
    const uniqueIds = new Set(userIds);
    for (const userId of uniqueIds) {
      const set = this.userSockets.get(userId);
      if (!set) continue;
      for (const ws of set) {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  sweepIdleLiveUsers(): void {
    const now = Date.now();
    for (const [userId, set] of this.userSockets.entries()) {
      let changed = false;
      for (const ws of set) {
        const meta = this.socketMeta.get(ws);
        if (meta && meta.inChatRoom && now - meta.lastActivityAt > LIVE_IDLE_TIMEOUT_MS) {
          meta.inChatRoom = false;
          changed = true;
        }
      }
      if (changed) {
        this.broadcastPresenceIfChanged(userId);
      }
    }
  }

  private broadcastPresenceIfChanged(userId: number): void {
    const nextStatus = this.getUserStatus(userId);
    const prevStatus = this.lastBroadcastSnapshot.get(userId) ?? 'OFFLINE';
    if (nextStatus !== prevStatus) {
      if (nextStatus === 'OFFLINE') {
        this.lastBroadcastSnapshot.delete(userId);
      } else {
        this.lastBroadcastSnapshot.set(userId, nextStatus);
      }
      this.broadcastAll('presence:update', {
        userId,
        status: nextStatus,
        presenceMap: this.getPresenceMap(),
      });
    }
  }
}

export const presenceManager = new PresenceManager();
