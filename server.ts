import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import db, {
  getConversationParticipantIds,
  isConversationParticipant,
  UserRow,
} from './server/db.ts';
import { presenceManager } from './server/presence.ts';
import apiRouter from './server/routes.ts';
import { verifyToken } from './server/security.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', apiRouter);

  const server = http.createServer(app);

  // Authenticated WebSocket Server at /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token') || '';
    const payload = verifyToken(token);

    if (!payload) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const userRow = db
      .prepare(`SELECT id, full_name, username, profile_image FROM users WHERE id = ?`)
      .get(payload.userId) as Pick<UserRow, 'id' | 'full_name' | 'username' | 'profile_image'> | undefined;

    if (!userRow) {
      ws.close(4001, 'Account not found');
      return;
    }

    presenceManager.registerSocket(userRow.id, ws);

    // Send initial presence snapshot to the newly connected socket
    ws.send(
      JSON.stringify({
        event: 'presence:sync',
        payload: {
          presenceMap: presenceManager.getPresenceMap(),
        },
      })
    );

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { event?: string; payload?: Record<string, unknown> };
        const event = parsed.event;
        const data = parsed.payload || {};

        if (event === 'presence:heartbeat') {
          presenceManager.touchActivity(ws, Boolean(data.inChatRoom));
          return;
        }

        if (event === 'presence:chat_state') {
          presenceManager.setChatActivity(ws, Boolean(data.inChatRoom));
          return;
        }

        if (event === 'global:send') {
          const text = String(data.message ?? '').trim();
          if (!text || text.length > 2000) return;

          const createdAt = new Date().toISOString();
          const result = db
            .prepare(`INSERT INTO global_messages (sender_id, message, created_at) VALUES (?, ?, ?)`)
            .run(userRow.id, text, createdAt);

          presenceManager.touchActivity(ws, true);

          const freshUser = db
            .prepare(`SELECT full_name, username, profile_image FROM users WHERE id = ?`)
            .get(userRow.id) as Pick<UserRow, 'full_name' | 'username' | 'profile_image'>;

          const messageDto = {
            id: Number(result.lastInsertRowid),
            senderId: userRow.id,
            senderName: freshUser.full_name,
            senderUsername: freshUser.username,
            senderAvatar: freshUser.profile_image,
            senderStatus: presenceManager.getUserStatus(userRow.id),
            message: text,
            createdAt,
          };

          presenceManager.broadcastAll('global:message', messageDto);
          return;
        }

        if (event === 'private:send') {
          const conversationId = Number(data.conversationId);
          const text = String(data.message ?? '').trim();
          if (!Number.isInteger(conversationId) || conversationId <= 0 || !text || text.length > 2000) {
            return;
          }

          if (!isConversationParticipant(conversationId, userRow.id)) {
            ws.send(
              JSON.stringify({
                event: 'error',
                payload: { message: 'Unauthorized conversation access.' },
              })
            );
            return;
          }

          const createdAt = new Date().toISOString();
          const result = db
            .prepare(
              `INSERT INTO private_messages (conversation_id, sender_id, message, created_at)
               VALUES (?, ?, ?, ?)`
            )
            .run(conversationId, userRow.id, text, createdAt);

          presenceManager.touchActivity(ws, true);

          const freshUser = db
            .prepare(`SELECT full_name, username, profile_image FROM users WHERE id = ?`)
            .get(userRow.id) as Pick<UserRow, 'full_name' | 'username' | 'profile_image'>;

          const messageDto = {
            id: Number(result.lastInsertRowid),
            conversationId,
            senderId: userRow.id,
            senderName: freshUser.full_name,
            senderUsername: freshUser.username,
            senderAvatar: freshUser.profile_image,
            message: text,
            createdAt,
          };

          const participantIds = getConversationParticipantIds(conversationId);
          presenceManager.sendToUsers(participantIds, 'private:message', messageDto);
          return;
        }

        if (event === 'typing:global') {
          presenceManager.broadcastAll('typing:global', {
            userId: userRow.id,
            fullName: userRow.full_name,
            isTyping: Boolean(data.isTyping),
          });
          return;
        }

        if (event === 'typing:private') {
          const conversationId = Number(data.conversationId);
          if (!Number.isInteger(conversationId) || !isConversationParticipant(conversationId, userRow.id)) {
            return;
          }
          const participantIds = getConversationParticipantIds(conversationId);
          presenceManager.sendToUsers(participantIds, 'typing:private', {
            conversationId,
            userId: userRow.id,
            fullName: userRow.full_name,
            isTyping: Boolean(data.isTyping),
          });
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      presenceManager.unregisterSocket(ws);
    });
  });

  // Periodic sweep to clear stale LIVE status after 2 minutes of inactivity
  setInterval(() => {
    presenceManager.sweepIdleLiveUsers();
  }, 15_000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Close the other process or use another port.`);
    } else {
      console.error('HTTP server error:', err);
    }
    process.exit(1);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RelayRoom full-stack server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start RelayRoom server:', err);
  process.exit(1);
});
