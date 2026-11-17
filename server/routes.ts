import express, { type Response } from 'express';
import db, {
  findDirectConversationId,
  getConversationParticipantIds,
  isConversationParticipant,
  toPublicUserDTO,
  UserRow,
} from './db.ts';
import { presenceManager } from './presence.ts';
import {
  AuthenticatedRequest,
  EMAIL_REGEX,
  hashPassword,
  requireAuth,
  signToken,
  USERNAME_REGEX,
  verifyPassword,
} from './security.ts';

const router = express.Router();

// ---------------------------------------------------------------------------
// MODULE 1: AUTHENTICATION (REGISTER / LOGIN / ME)
// ---------------------------------------------------------------------------

router.post('/auth/register', async (req, res: Response) => {
  try {
    const fullName = String(req.body.fullName ?? '').trim();
    const username = String(req.body.username ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const confirmPassword = String(req.body.confirmPassword ?? '');
    const profileImage = String(req.body.profileImage ?? '').trim();

    if (fullName.length < 2 || fullName.length > 60) {
      res.status(400).json({ error: 'Full name must be between 2 and 60 characters.' });
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      res.status(400).json({
        error: 'Username must be 3–24 characters using only letters, numbers, or underscores.',
      });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const existingUsername = db
      .prepare(`SELECT id FROM users WHERE username = ?`)
      .get(username);
    if (existingUsername) {
      res.status(409).json({ error: 'This username is already taken.' });
      return;
    }

    const existingEmail = db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .get(email);
    if (existingEmail) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const result = db
      .prepare(
        `INSERT INTO users (full_name, username, email, password, profile_image, bio)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(fullName, username, email, passwordHash, profileImage, '');

    const userId = Number(result.lastInsertRowid);
    const createdRow = db
      .prepare(
        `SELECT id, full_name, username, email, profile_image, bio, created_at FROM users WHERE id = ?`
      )
      .get(userId) as Omit<UserRow, 'password'>;

    const token = signToken({ userId: createdRow.id, username: createdRow.username });
    const userDto = toPublicUserDTO(createdRow, presenceManager.getUserStatus(createdRow.id), true);

    presenceManager.broadcastAll('user:registered', { user: toPublicUserDTO(createdRow, 'OFFLINE') });

    res.status(201).json({ token, user: userDto });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

router.post('/auth/login', async (req, res: Response) => {
  try {
    const identifier = String(req.body.identifier ?? req.body.username ?? req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }

    const userRow = db
      .prepare(`SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1`)
      .get(identifier, identifier.toLowerCase()) as UserRow | undefined;

    if (!userRow) {
      res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
      return;
    }

    const matches = await verifyPassword(password, userRow.password);
    if (!matches) {
      res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
      return;
    }

    const token = signToken({ userId: userRow.id, username: userRow.username });
    const userDto = toPublicUserDTO(userRow, presenceManager.getUserStatus(userRow.id), true);

    res.json({ token, user: userDto });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const u = req.authUser!;
  res.json({
    user: {
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      profileImage: u.profileImage,
      bio: u.bio,
      createdAt: u.createdAt,
      presenceStatus: presenceManager.getUserStatus(u.id),
    },
  });
});

// ---------------------------------------------------------------------------
// MODULE 3 & 4: USERS, DISCOVERY, ONLINE, LIVE, PROFILE & SETTINGS
// ---------------------------------------------------------------------------

function buildUserRelationship(currentUserId: number, targetUserId: number) {
  if (currentUserId === targetUserId) {
    return { relationship: 'SELF', requestId: null, conversationId: null };
  }
  const convId = findDirectConversationId(currentUserId, targetUserId);
  if (convId !== null) {
    return { relationship: 'CONNECTED', requestId: null, conversationId: convId };
  }
  const pending = db
    .prepare(
      `SELECT id, sender_id, receiver_id, status
       FROM chat_requests
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND status = 'PENDING'
       ORDER BY id DESC LIMIT 1`
    )
    .get(currentUserId, targetUserId, targetUserId, currentUserId) as
    | { id: number; sender_id: number; receiver_id: number; status: string }
    | undefined;

  if (pending) {
    return {
      relationship: pending.sender_id === currentUserId ? 'PENDING_OUTGOING' : 'PENDING_INCOMING',
      requestId: pending.id,
      conversationId: null,
    };
  }
  return { relationship: 'NONE', requestId: null, conversationId: null };
}

router.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const filter = String(req.query.filter ?? 'all').toLowerCase();

  let rows: Omit<UserRow, 'password'>[];
  if (q) {
    const like = `%${q}%`;
    rows = db
      .prepare(
        `SELECT id, full_name, username, email, profile_image, bio, created_at
         FROM users
         WHERE LOWER(username) LIKE ? OR LOWER(full_name) LIKE ?
         ORDER BY created_at DESC`
      )
      .all(like, like) as Omit<UserRow, 'password'>[];
  } else {
    rows = db
      .prepare(
        `SELECT id, full_name, username, email, profile_image, bio, created_at
         FROM users
         ORDER BY created_at DESC`
      )
      .all() as Omit<UserRow, 'password'>[];
  }

  const enriched = rows
    .map((row) => {
      const status = presenceManager.getUserStatus(row.id);
      const rel = buildUserRelationship(currentUserId, row.id);
      return {
        ...toPublicUserDTO(row, status),
        ...rel,
      };
    })
    .filter((user) => {
      if (filter === 'online') return user.presenceStatus === 'ONLINE' || user.presenceStatus === 'LIVE';
      if (filter === 'live') return user.presenceStatus === 'LIVE';
      return true;
    });

  res.json({ users: enriched });
});

router.get('/users/online', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const rows = db
    .prepare(
      `SELECT id, full_name, username, email, profile_image, bio, created_at FROM users ORDER BY full_name ASC`
    )
    .all() as Omit<UserRow, 'password'>[];

  const onlineUsers = rows
    .map((row) => {
      const status = presenceManager.getUserStatus(row.id);
      return { ...toPublicUserDTO(row, status), ...buildUserRelationship(currentUserId, row.id) };
    })
    .filter((u) => u.presenceStatus === 'ONLINE' || u.presenceStatus === 'LIVE');

  res.json({ users: onlineUsers });
});

router.get('/users/live', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const rows = db
    .prepare(
      `SELECT id, full_name, username, email, profile_image, bio, created_at FROM users ORDER BY full_name ASC`
    )
    .all() as Omit<UserRow, 'password'>[];

  const liveUsers = rows
    .map((row) => {
      const status = presenceManager.getUserStatus(row.id);
      return { ...toPublicUserDTO(row, status), ...buildUserRelationship(currentUserId, row.id) };
    })
    .filter((u) => u.presenceStatus === 'LIVE');

  res.json({ users: liveUsers });
});

router.get('/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: 'Invalid user ID.' });
    return;
  }

  const row = db
    .prepare(
      `SELECT id, full_name, username, email, profile_image, bio, created_at FROM users WHERE id = ?`
    )
    .get(targetId) as Omit<UserRow, 'password'> | undefined;

  if (!row) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const status = presenceManager.getUserStatus(row.id);
  const rel = buildUserRelationship(currentUserId, row.id);
  const messageCountRow = db
    .prepare(`SELECT COUNT(*) AS count FROM global_messages WHERE sender_id = ?`)
    .get(row.id) as { count: number };

  res.json({
    user: {
      ...toPublicUserDTO(row, status, currentUserId === row.id),
      ...rel,
      globalMessageCount: messageCountRow.count,
    },
  });
});

router.put('/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.authUser!.id;
    const fullName = req.body.fullName !== undefined ? String(req.body.fullName).trim() : undefined;
    const bio = req.body.bio !== undefined ? String(req.body.bio).trim() : undefined;
    const profileImage =
      req.body.profileImage !== undefined ? String(req.body.profileImage).trim() : undefined;
    const currentPassword = req.body.currentPassword ? String(req.body.currentPassword) : '';
    const newPassword = req.body.newPassword ? String(req.body.newPassword) : '';

    if (fullName !== undefined && (fullName.length < 2 || fullName.length > 60)) {
      res.status(400).json({ error: 'Full name must be between 2 and 60 characters.' });
      return;
    }
    if (bio !== undefined && bio.length > 240) {
      res.status(400).json({ error: 'Bio must be 240 characters or less.' });
      return;
    }

    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(currentUserId) as UserRow;

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new password.' });
        return;
      }
      const valid = await verifyPassword(currentPassword, existing.password);
      if (!valid) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        return;
      }
      const nextHash = await hashPassword(newPassword);
      db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(nextHash, currentUserId);
    }

    db.prepare(
      `UPDATE users
       SET full_name = ?, bio = ?, profile_image = ?
       WHERE id = ?`
    ).run(
      fullName ?? existing.full_name,
      bio ?? existing.bio,
      profileImage ?? existing.profile_image,
      currentUserId
    );

    const updated = db
      .prepare(
        `SELECT id, full_name, username, email, profile_image, bio, created_at FROM users WHERE id = ?`
      )
      .get(currentUserId) as Omit<UserRow, 'password'>;

    const dto = toPublicUserDTO(updated, presenceManager.getUserStatus(updated.id), true);
    res.json({ user: dto });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// ---------------------------------------------------------------------------
// DASHBOARD LIVE STATS
// ---------------------------------------------------------------------------

router.get('/dashboard/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const totalUsersRow = db.prepare(`SELECT COUNT(*) AS count FROM users`).get() as { count: number };
  const pendingRequestsRow = db
    .prepare(
      `SELECT COUNT(*) AS count FROM chat_requests WHERE receiver_id = ? AND status = 'PENDING'`
    )
    .get(currentUserId) as { count: number };

  const { onlineCount, liveCount } = presenceManager.getCounts();

  const recentMessages = db
    .prepare(
      `SELECT gm.id, gm.sender_id, gm.message, gm.created_at,
              u.full_name, u.username, u.profile_image
       FROM global_messages gm
       JOIN users u ON u.id = gm.sender_id
       ORDER BY gm.id DESC
       LIMIT 8`
    )
    .all() as Array<{
    id: number;
    sender_id: number;
    message: string;
    created_at: string;
    full_name: string;
    username: string;
    profile_image: string;
  }>;

  const users = db
    .prepare(
      `SELECT id, full_name, username, profile_image, bio, created_at FROM users ORDER BY id DESC LIMIT 30`
    )
    .all() as Array<Omit<UserRow, 'password' | 'email'> & { email?: string }>;

  const activeUsers = users
    .map((u) => ({
      ...toPublicUserDTO({ ...u, email: '' }, presenceManager.getUserStatus(u.id)),
      ...buildUserRelationship(currentUserId, u.id),
    }))
    .sort((a, b) => {
      const rank = { LIVE: 0, ONLINE: 1, OFFLINE: 2 };
      return rank[a.presenceStatus] - rank[b.presenceStatus];
    })
    .slice(0, 6);

  res.json({
    totalUsers: totalUsersRow.count,
    onlineUsers: onlineCount,
    liveUsers: liveCount,
    pendingRequests: pendingRequestsRow.count,
    recentGlobalMessages: recentMessages.reverse().map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.full_name,
      senderUsername: m.username,
      senderAvatar: m.profile_image,
      message: m.message,
      createdAt: m.created_at,
    })),
    recentlyActiveUsers: activeUsers,
  });
});

// ---------------------------------------------------------------------------
// MODULE 2: GLOBAL PUBLIC CHAT
// ---------------------------------------------------------------------------

router.get('/global-messages', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT gm.id, gm.sender_id, gm.message, gm.created_at,
              u.full_name, u.username, u.profile_image
       FROM global_messages gm
       JOIN users u ON u.id = gm.sender_id
       ORDER BY gm.id ASC
       LIMIT 200`
    )
    .all() as Array<{
    id: number;
    sender_id: number;
    message: string;
    created_at: string;
    full_name: string;
    username: string;
    profile_image: string;
  }>;

  res.json({
    messages: rows.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.full_name,
      senderUsername: m.username,
      senderAvatar: m.profile_image,
      senderStatus: presenceManager.getUserStatus(m.sender_id),
      message: m.message,
      createdAt: m.created_at,
    })),
  });
});

router.post('/global-messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const text = String(req.body.message ?? '').trim();
  if (!text) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }
  if (text.length > 2000) {
    res.status(400).json({ error: 'Message exceeds 2000 characters.' });
    return;
  }

  const createdAt = new Date().toISOString();
  const result = db
    .prepare(`INSERT INTO global_messages (sender_id, message, created_at) VALUES (?, ?, ?)`)
    .run(user.id, text, createdAt);

  presenceManager.markUserLiveFromRest(user.id);

  const messageDto = {
    id: Number(result.lastInsertRowid),
    senderId: user.id,
    senderName: user.fullName,
    senderUsername: user.username,
    senderAvatar: user.profileImage,
    senderStatus: presenceManager.getUserStatus(user.id),
    message: text,
    createdAt,
  };

  presenceManager.broadcastAll('global:message', messageDto);
  res.status(201).json({ message: messageDto });
});

// ---------------------------------------------------------------------------
// MODULE 5: PRIVATE CHAT REQUESTS
// ---------------------------------------------------------------------------

router.post('/chat-requests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const senderId = req.authUser!.id;
  const receiverId = Number(req.body.receiverId);

  if (!Number.isInteger(receiverId) || receiverId <= 0) {
    res.status(400).json({ error: 'Valid receiverId is required.' });
    return;
  }
  if (senderId === receiverId) {
    res.status(400).json({ error: 'You cannot send a chat request to yourself.' });
    return;
  }

  const receiver = db
    .prepare(`SELECT id, full_name, username, profile_image FROM users WHERE id = ?`)
    .get(receiverId) as { id: number; full_name: string; username: string; profile_image: string } | undefined;

  if (!receiver) {
    res.status(404).json({ error: 'Target user not found.' });
    return;
  }

  const existingConvId = findDirectConversationId(senderId, receiverId);
  if (existingConvId !== null) {
    res.status(409).json({
      error: 'You are already connected in a private conversation with this user.',
      conversationId: existingConvId,
    });
    return;
  }

  const duplicatePending = db
    .prepare(
      `SELECT id, sender_id FROM chat_requests
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND status = 'PENDING'
       LIMIT 1`
    )
    .get(senderId, receiverId, receiverId, senderId) as { id: number; sender_id: number } | undefined;

  if (duplicatePending) {
    res.status(409).json({
      error:
        duplicatePending.sender_id === senderId
          ? 'A pending chat request to this user already exists.'
          : 'This user has already sent you a pending chat request. Check your incoming requests.',
    });
    return;
  }

  const now = new Date().toISOString();
  const insert = db
    .prepare(
      `INSERT INTO chat_requests (sender_id, receiver_id, status, created_at, updated_at)
       VALUES (?, ?, 'PENDING', ?, ?)`
    )
    .run(senderId, receiverId, now, now);

  const requestDto = {
    id: Number(insert.lastInsertRowid),
    senderId,
    receiverId,
    status: 'PENDING' as const,
    createdAt: now,
    updatedAt: now,
    sender: {
      id: req.authUser!.id,
      fullName: req.authUser!.fullName,
      username: req.authUser!.username,
      profileImage: req.authUser!.profileImage,
      presenceStatus: presenceManager.getUserStatus(senderId),
    },
    receiver: {
      id: receiver.id,
      fullName: receiver.full_name,
      username: receiver.username,
      profileImage: receiver.profile_image,
      presenceStatus: presenceManager.getUserStatus(receiver.id),
    },
  };

  presenceManager.sendToUsers([receiverId], 'request:received', requestDto);
  res.status(201).json({ request: requestDto });
});

router.get('/chat-requests/incoming', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const rows = db
    .prepare(
      `SELECT cr.id, cr.sender_id, cr.receiver_id, cr.status, cr.created_at, cr.updated_at,
              u.full_name, u.username, u.profile_image, u.bio
       FROM chat_requests cr
       JOIN users u ON u.id = cr.sender_id
       WHERE cr.receiver_id = ?
       ORDER BY cr.id DESC`
    )
    .all(currentUserId) as Array<{
    id: number;
    sender_id: number;
    receiver_id: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    created_at: string;
    updated_at: string;
    full_name: string;
    username: string;
    profile_image: string;
    bio: string;
  }>;

  res.json({
    requests: rows.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      conversationId:
        r.status === 'ACCEPTED' ? findDirectConversationId(r.sender_id, r.receiver_id) : null,
      otherUser: {
        id: r.sender_id,
        fullName: r.full_name,
        username: r.username,
        profileImage: r.profile_image,
        bio: r.bio,
        presenceStatus: presenceManager.getUserStatus(r.sender_id),
      },
    })),
  });
});

router.get('/chat-requests/outgoing', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const rows = db
    .prepare(
      `SELECT cr.id, cr.sender_id, cr.receiver_id, cr.status, cr.created_at, cr.updated_at,
              u.full_name, u.username, u.profile_image, u.bio
       FROM chat_requests cr
       JOIN users u ON u.id = cr.receiver_id
       WHERE cr.sender_id = ?
       ORDER BY cr.id DESC`
    )
    .all(currentUserId) as Array<{
    id: number;
    sender_id: number;
    receiver_id: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    created_at: string;
    updated_at: string;
    full_name: string;
    username: string;
    profile_image: string;
    bio: string;
  }>;

  res.json({
    requests: rows.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      conversationId:
        r.status === 'ACCEPTED' ? findDirectConversationId(r.sender_id, r.receiver_id) : null,
      otherUser: {
        id: r.receiver_id,
        fullName: r.full_name,
        username: r.username,
        profileImage: r.profile_image,
        bio: r.bio,
        presenceStatus: presenceManager.getUserStatus(r.receiver_id),
      },
    })),
  });
});

router.post('/chat-requests/:id/accept', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    res.status(400).json({ error: 'Invalid request ID.' });
    return;
  }

  const reqRow = db
    .prepare(`SELECT * FROM chat_requests WHERE id = ?`)
    .get(requestId) as
    | { id: number; sender_id: number; receiver_id: number; status: string }
    | undefined;

  if (!reqRow) {
    res.status(404).json({ error: 'Chat request not found.' });
    return;
  }
  if (reqRow.receiver_id !== currentUserId) {
    res.status(403).json({ error: 'Only the recipient can accept a chat request.' });
    return;
  }
  if (reqRow.status !== 'PENDING') {
    res.status(400).json({ error: `Chat request is already ${reqRow.status.toLowerCase()}.` });
    return;
  }

  const acceptTransaction = db.transaction(() => {
    const now = new Date().toISOString();
    db.prepare(`UPDATE chat_requests SET status = 'ACCEPTED', updated_at = ? WHERE id = ?`).run(
      now,
      requestId
    );

    let conversationId = findDirectConversationId(reqRow.sender_id, reqRow.receiver_id);
    if (conversationId === null) {
      const convResult = db
        .prepare(`INSERT INTO conversations (created_at) VALUES (?)`)
        .run(now);
      conversationId = Number(convResult.lastInsertRowid);
      db.prepare(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)`
      ).run(conversationId, reqRow.sender_id);
      db.prepare(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)`
      ).run(conversationId, reqRow.receiver_id);
    }

    return { conversationId, updatedAt: now };
  });

  const { conversationId, updatedAt } = acceptTransaction();

  presenceManager.sendToUsers([reqRow.sender_id, reqRow.receiver_id], 'request:updated', {
    requestId,
    status: 'ACCEPTED',
    conversationId,
    acceptedBy: {
      id: req.authUser!.id,
      fullName: req.authUser!.fullName,
      username: req.authUser!.username,
    },
  });

  res.json({
    request: {
      id: requestId,
      status: 'ACCEPTED',
      updatedAt,
      conversationId,
    },
  });
});

router.post('/chat-requests/:id/reject', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    res.status(400).json({ error: 'Invalid request ID.' });
    return;
  }

  const reqRow = db
    .prepare(`SELECT * FROM chat_requests WHERE id = ?`)
    .get(requestId) as
    | { id: number; sender_id: number; receiver_id: number; status: string }
    | undefined;

  if (!reqRow) {
    res.status(404).json({ error: 'Chat request not found.' });
    return;
  }
  if (reqRow.receiver_id !== currentUserId) {
    res.status(403).json({ error: 'Only the recipient can reject a chat request.' });
    return;
  }
  if (reqRow.status !== 'PENDING') {
    res.status(400).json({ error: `Chat request is already ${reqRow.status.toLowerCase()}.` });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE chat_requests SET status = 'REJECTED', updated_at = ? WHERE id = ?`).run(
    now,
    requestId
  );

  presenceManager.sendToUsers([reqRow.sender_id], 'request:updated', {
    requestId,
    status: 'REJECTED',
    conversationId: null,
  });

  res.json({
    request: {
      id: requestId,
      status: 'REJECTED',
      updatedAt: now,
    },
  });
});

// ---------------------------------------------------------------------------
// MODULE 6: PRIVATE MESSAGING & CONVERSATIONS
// ---------------------------------------------------------------------------

router.get('/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const rows = db
    .prepare(
      `SELECT c.id AS conversation_id, c.created_at AS conversation_created_at,
              u.id AS partner_id, u.full_name, u.username, u.profile_image, u.bio
       FROM conversation_participants cp_self
       JOIN conversations c ON c.id = cp_self.conversation_id
       JOIN conversation_participants cp_other
         ON cp_other.conversation_id = c.id AND cp_other.user_id != ?
       JOIN users u ON u.id = cp_other.user_id
       WHERE cp_self.user_id = ?
       ORDER BY c.id DESC`
    )
    .all(currentUserId, currentUserId) as Array<{
    conversation_id: number;
    conversation_created_at: string;
    partner_id: number;
    full_name: string;
    username: string;
    profile_image: string;
    bio: string;
  }>;

  const conversations = rows.map((row) => {
    const lastMsg = db
      .prepare(
        `SELECT id, sender_id, message, created_at
         FROM private_messages
         WHERE conversation_id = ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(row.conversation_id) as
      | { id: number; sender_id: number; message: string; created_at: string }
      | undefined;

    return {
      id: row.conversation_id,
      createdAt: row.conversation_created_at,
      partner: {
        id: row.partner_id,
        fullName: row.full_name,
        username: row.username,
        profileImage: row.profile_image,
        bio: row.bio,
        presenceStatus: presenceManager.getUserStatus(row.partner_id),
      },
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            senderId: lastMsg.sender_id,
            message: lastMsg.message,
            createdAt: lastMsg.created_at,
          }
        : null,
    };
  });

  conversations.sort((a, b) => {
    const timeA = a.lastMessage ? a.lastMessage.createdAt : a.createdAt;
    const timeB = b.lastMessage ? b.lastMessage.createdAt : b.createdAt;
    return timeB.localeCompare(timeA);
  });

  res.json({ conversations });
});

router.get('/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.authUser!.id;
  const conversationId = Number(req.params.id);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    res.status(400).json({ error: 'Invalid conversation ID.' });
    return;
  }

  if (!isConversationParticipant(conversationId, currentUserId)) {
    res.status(403).json({
      error: 'Access denied. You are not an authorized participant of this private conversation.',
    });
    return;
  }

  const rows = db
    .prepare(
      `SELECT pm.id, pm.conversation_id, pm.sender_id, pm.message, pm.created_at,
              u.full_name, u.username, u.profile_image
       FROM private_messages pm
       JOIN users u ON u.id = pm.sender_id
       WHERE pm.conversation_id = ?
       ORDER BY pm.id ASC
       LIMIT 300`
    )
    .all(conversationId) as Array<{
    id: number;
    conversation_id: number;
    sender_id: number;
    message: string;
    created_at: string;
    full_name: string;
    username: string;
    profile_image: string;
  }>;

  res.json({
    messages: rows.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: m.full_name,
      senderUsername: m.username,
      senderAvatar: m.profile_image,
      message: m.message,
      createdAt: m.created_at,
    })),
  });
});

router.post('/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.authUser!;
  const conversationId = Number(req.params.id);
  const text = String(req.body.message ?? '').trim();

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    res.status(400).json({ error: 'Invalid conversation ID.' });
    return;
  }
  if (!isConversationParticipant(conversationId, currentUser.id)) {
    res.status(403).json({
      error: 'Access denied. Private messaging is restricted to accepted conversation participants.',
    });
    return;
  }
  if (!text) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }
  if (text.length > 2000) {
    res.status(400).json({ error: 'Message exceeds 2000 characters.' });
    return;
  }

  const createdAt = new Date().toISOString();
  const insert = db
    .prepare(
      `INSERT INTO private_messages (conversation_id, sender_id, message, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(conversationId, currentUser.id, text, createdAt);

  presenceManager.markUserLiveFromRest(currentUser.id);

  const messageDto = {
    id: Number(insert.lastInsertRowid),
    conversationId,
    senderId: currentUser.id,
    senderName: currentUser.fullName,
    senderUsername: currentUser.username,
    senderAvatar: currentUser.profileImage,
    message: text,
    createdAt,
  };

  const participantIds = getConversationParticipantIds(conversationId);
  presenceManager.sendToUsers(participantIds, 'private:message', messageDto);

  res.status(201).json({ message: messageDto });
});

export default router;
