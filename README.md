## Live Streaming Backend (Node.js + Socket.io + Agora)

This backend powers live video rooms with roles (Host, Guest, Audience), Agora tokens, and socket events for chat and moderation.

### Quick Start
1) Install: `npm install`
2) Env: create `.env` (see `.env.example` below). Key vars:
   - `PORT=5000`
   - `DATABASE_URL=<mongo-uri>`
   - `AGORA_APP_ID`, `AGORA_APP_CERT`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
3) Run dev: `npm run dev`
4) (Optional) Ngrok: `ngrok http 5000` and use the https URL for REST and socket.

### Environment Template
See `.env` in repo; important keys:
```
IP_ADDRESS=0.0.0.0
PORT=5000
DATABASE_URL=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
AGORA_APP_ID=...
AGORA_APP_CERT=...
```

### Core Endpoints (REST, base `/api/v1`)
- Auth:
  - `POST /auth/login` → `accessToken`, `refreshToken`
  - `POST /auth/refresh-token`
- Rooms:
  - `POST /rooms` (host create) → returns `room`, `agoraToken`, `agoraUid`, `channelName`
  - `POST /rooms/join-room` → returns `room`, `member`, `agoraToken`, `agoraUid`, `channelName`
  - `GET /rooms/get-all-room` → active rooms + `viewerCount`
  - `GET /rooms/room-user-list/:roomId`
  - `POST /rooms/:roomId/kick|block|mute|end`

### Socket Events (socket.io, base host: `http://<host>:5000`)
- Emit:
  - `join-room { roomId }`
  - `room-message { roomId, senderId, message }`
  - `promote-to-guest { roomId, hostId, targetUserId }`
  - `leave-room { roomId, userId }`
  - `mic-state-changed { roomId, userId, isMuted }`
  - `camera-state-changed { roomId, userId, isCameraOn }`
- Listen:
  - `room-user-list { roomId, members[] }`
  - `viewer-count { roomId, count }`
  - `room-message-receive`
  - `agora-token-update { userId, token, role }` (guest token on promotion; broadcast)
  - `user-promoted { userId }`
  - `user-left { userId }`
  - `user-kicked|user-blocked { userId }`
  - `user-muted { userId, isMuted }`
  - `live-ended { roomId }`
  - `error { message }`
- Behavior: If the host triggers `leave-room`, the server sets room `status=ENDED`, marks members `LEFT`, and emits `live-ended`.

### Agora UID/Token Mapping
- Backend derives a stable numeric UID from Mongo `_id` (`toAgoraUid`: last 8 hex chars → int).
- Tokens are built with that UID and correct role:
  - Host/Guest → `PUBLISHER`
  - Audience → `SUBSCRIBER`
- API responses include `agoraUid` so the client should use that UID when joining the Agora channel.
- Channel name: `channelName` / `roomUniqueId` from create/join response.

### Promotion Flow
- Host emits `promote-to-guest`.
- Server checks host role, enforces max 3 guests, generates guest publisher token with `toAgoraUid(targetUserId)`.
- Emits `agora-token-update` (broadcast, contains `userId`, `token`, `role:'GUEST'`) and `user-promoted`.

### Room Lifecycle Notes
- `/rooms/get-all-room` returns only `status: ACTIVE`.
- Host leaving via `leave-room` ends the room and emits `live-ended`.
- Admin/host can explicitly end via `POST /rooms/:roomId/end`.

### Useful Scripts
- End all rooms / mark members LEFT:
  - `node -r ts-node/register scripts/end_active_rooms.js`
- Delete all rooms and members (destructive):
  - `node -r ts-node/register -e "require('dotenv').config(); const mongoose=require('mongoose'); const { Room, RoomMember } = require('./src/app/modules/room/room.model'); (async()=>{ await mongoose.connect(process.env.DATABASE_URL); await Room.deleteMany({}); await RoomMember.deleteMany({}); process.exit(0); })();"`

### Key File Paths
- Agora token/UID helper: `src/helpers/generateAgoraToken.ts`
- Room service (create/join/tokens): `src/app/modules/room/room.service.ts`
- Room controller (API responses): `src/app/modules/room/room.controller.ts`
- Socket room handler (join/leave/promote): `src/app/socket/module/room/room.handler.ts`

### Endpoint Reference (requests, responses, expectations)
- `POST /api/v1/auth/login`
  - Body: `{ email, password }`
  - Success: `{ success, data: { user, accessToken, refreshToken } }`
  - Use `accessToken` (raw) in `Authorization`.
- `POST /api/v1/auth/refresh-token`
  - Body: `{ token: <refreshToken> }`
  - Success: `{ accessToken }`

- `POST /api/v1/rooms` (Host create)
  - Header: `Authorization: <accessToken>`
  - Body: `{ roomName }`
  - Success: `{ success, room: [...], agoraToken, agoraUid, channelName }`
  - Expect: `agoraUid` numeric, role = publisher, channelName = roomUniqueId.

- `POST /api/v1/rooms/join-room`
  - Header: `Authorization: <accessToken>`
  - Body: `{ roomId }`
  - Success: `{ success, room, member, agoraToken, agoraUid, channelName, created }`
  - Expect: role derived from member (HOST/GUEST→publisher, AUDIENCE→subscriber).

- `GET /api/v1/rooms/get-all-room`
  - Header: `Authorization: <accessToken>`
  - Success: `{ success, rooms: [ { ...room, viewerCount } ] }`
  - Returns only `status: ACTIVE`.

- `GET /api/v1/rooms/room-user-list/:roomId`
  - Header: `Authorization: <accessToken>`
  - Success: `{ success, users: [ { userId, role, status, createdAt } ] }`

- Host controls (all require `Authorization: <accessToken>`)
  - `POST /api/v1/rooms/:roomId/kick` `{ targetUserId }` → `{ success, data }` + socket `user-kicked`
  - `POST /api/v1/rooms/:roomId/block` `{ targetUserId }` → `{ success, data }` + socket `user-blocked`
  - `POST /api/v1/rooms/:roomId/mute` `{ targetUserId, isMuted }` → `{ success, data }` + socket `user-muted`
  - `POST /api/v1/rooms/:roomId/end` → `{ success, data }` + socket `live-ended`

- Update / Delete (auth)
  - `PUT /api/v1/rooms/update-room/:id` `{ roomName?, status?, settings? }`
  - `DELETE /api/v1/rooms/deleteRoom/:id`

### Socket Reference (events, payloads, expectations)
Base: `http://<host>:5000` (socket.io, websocket)

Emit:
- `join-room { roomId }` → expect `room-user-list`, `viewer-count`
- `room-message { roomId, senderId, message }` → expect `room-message-receive`
- `promote-to-guest { roomId, hostId, targetUserId }` → expect `agora-token-update`, `user-promoted`
- `leave-room { roomId, userId }`
- `mic-state-changed { roomId, userId, isMuted }`
- `camera-state-changed { roomId, userId, isCameraOn }`

Listen:
- `room-user-list { roomId, members[] }`
- `viewer-count { roomId, count }`
- `room-message-receive { roomId, senderId, text, ... }`
- `agora-token-update { userId, token, role }` (guest token on promotion; broadcast; guest filters by userId)
- `user-promoted { userId }`
- `user-left { userId }`
- `user-kicked { userId }`
- `user-blocked { userId }`
- `user-muted { userId, isMuted }`
- `live-ended { roomId }`
- `mic-state-changed { userId, isMuted }`
- `camera-state-changed { userId, isCameraOn }`
- `error { message }`

Server behaviors:
- Host `leave-room` → room `ENDED`, members `LEFT`, emits `live-ended`.
- Promote enforces max 3 guests; emits guest publisher token using `toAgoraUid(targetUserId)`.

### Testing Expectations
- Tokens: `agoraToken` built with `agoraUid` (numeric from backend) and correct role.
- Client must use `agoraUid` from API responses as Agora UID for both host and audience.
- Channel: always `channelName`/`roomUniqueId` from API.
- Viewer count updates on join/leave and after kicks/blocks.
- `/rooms/get-all-room` returns only ACTIVE; ended rooms won’t show once ended.

### Testing Notes
- Use `Authorization: <accessToken>` (no `Bearer` prefix).
- Host create → join Agora with `channelName` + `agoraToken` + `agoraUid`.
- Audience join → use returned `channelName` + `agoraToken` + `agoraUid`.
- Promotion → guest uses `agora-token-update` for token (publisher) and rejoins as publisher with their `agoraUid`.
