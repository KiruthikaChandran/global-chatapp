# RelayRoom — Real-Time Global Chat Application

RelayRoom is a full-stack real-time global and private messaging application with JWT authentication, BCrypt password encryption, multi-session WebSocket presence tracking (`Online`, `Offline`, `LIVE`), user discovery, private chat requests, and authorized 1-on-1 private conversations.

## Runtime Architecture

- **Live Preview Runtime (Port 3000)**:
  - **Frontend**: React 19, TypeScript, Vite, React Router DOM, Axios, Tailwind CSS v4 (Light & Dark themes).
  - **Backend**: Express.js REST API + `ws` authenticated WebSocket server (`server.ts`, `server/routes.ts`, `server/presence.ts`, `server/security.ts`).
  - **Database**: SQLite relational schema (`server/db.ts`) with foreign keys, unique constraints, and indexes (`users`, `global_messages`, `chat_requests`, `conversations`, `conversation_participants`, `private_messages`).
- **Database & Spring Boot Blueprint**:
  - `database/schema.sql` contains the full MySQL 8 DDL schema.

## Core Modules Implemented

1. **User Registration & Login**: Full validation, duplicate username/email prevention, BCrypt hashing, JWT Bearer auth, protected routes.
2. **Global Public Chat**: Real-time WebSocket message delivery, history persistence, sender avatar/name/timestamp, typing indicator, auto-scroll.
3. **Online & LIVE Presence**: Multi-session socket tracking distinguishing connected `Online` users from active `LIVE` chat participants, plus `Offline` state.
4. **User Discovery**: Live search by display name or `@username`, filter tabs (`All Users`, `Online Users`, `LIVE Users`), public profiles, and connection actions.
5. **Private Chat Requests**: Incoming & outgoing requests, duplicate pending request prevention, `PENDING` / `ACCEPTED` / `REJECTED` workflow with real-time WebSocket notifications.
6. **Private Messaging**: Unlocked exclusively upon request acceptance; backend verifies `conversation_participants` membership on every REST and WebSocket operation.
7. **Settings & Theme**: Profile editor, avatar picker, password change with current-password verification, and persistent Light / Dark mode toggle.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in two browser sessions (e.g., regular + incognito) to test real-time Global Chat, Online/LIVE presence, Chat Requests, and Private Messaging between two accounts.

## REST API Reference

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Authenticate and receive a JWT
- `GET /api/auth/me` — Fetch current authenticated user
- `GET /api/dashboard/stats` — Fetch live counts, recent global messages, and active users
- `GET /api/users?q=&filter=all|online|live` — Search and filter registered users
- `GET /api/users/online` — List currently online users
- `GET /api/users/live` — List currently LIVE chat participants
- `GET /api/users/:id` — Public profile and relationship status
- `PUT /api/users/me` — Update profile or password
- `GET /api/global-messages` & `POST /api/global-messages` — Global chat history & posting
- `POST /api/chat-requests` — Send private chat request
- `GET /api/chat-requests/incoming` & `GET /api/chat-requests/outgoing` — List requests
- `POST /api/chat-requests/:id/accept` & `POST /api/chat-requests/:id/reject` — Respond to requests
- `GET /api/conversations` — List accepted private conversations
- `GET /api/conversations/:id/messages` & `POST /api/conversations/:id/messages` — Private chat history & messaging
- `WS /ws?token=<JWT>` — Real-time WebSocket stream (`global:send`, `private:send`, `presence:heartbeat`, `presence:chat_state`, `typing:global`, `typing:private`)
