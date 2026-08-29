# SuperSonic — Complete Architecture & Implementation Master Guide

> **SuperSonic** is a real-time, synchronized music party platform allowing hosts to create party rooms, upload local MP3 audio files or attach YouTube links, and broadcast playback in true sub-100ms lockstep to hundreds or thousands of participants simultaneously.

---

## 📖 Table of Contents
1. [Platform Overview & Philosophy](#1-platform-overview--philosophy)
2. [High-Level Architecture](#2-high-level-architecture)
3. [The Sub-100ms Synchronization Engine](#3-the-sub-100ms-synchronization-engine)
4. [Step-by-Step Data Flow](#4-step-by-step-data-flow)
5. [Database Schema & Scalability (Supabase)](#5-database-schema--scalability-supabase)
6. [Room Creation & Media Ingestion (MP3 + YouTube)](#6-room-creation--media-ingestion-mp3--youtube)
7. [Host Authority & Moderation Protocol](#7-host-authority--moderation-protocol)
8. [Client-Side Adaptive Audio Steering Engine](#8-client-side-adaptive-audio-steering-engine)
9. [Project Directory Structure](#9-project-directory-structure)
10. [Local Development & Deployment Guide](#10-local-development--deployment-guide)

---

## 1. Platform Overview & Philosophy

SuperSonic is designed around three core principles:
1. **Ultra-Low Latency Synchronization (< 100ms drift)**: When the host hits play, pauses, or seeks, every connected participant's browser responds in unison without audible echo or phase cancellation.
2. **Unified Media Engine (MP3 + YouTube)**: Seamless switching between locally uploaded audio files and YouTube video/audio streams in a single playlist.
3. **Frictionless Onboarding**: Host creates a party in seconds, participants join instantly via a 6-character room code or QR code scan from their phone or browser.

---

## 2. High-Level Architecture

```
                                  ┌──────────────────────────────┐
                                  │      CLIENT BROWSER(S)       │
                                  │  - Next.js 14 Web App        │
                                  │  - HTML5 Audio & YouTube API │
                                  │  - Adaptive Sync Controller  │
                                  └──────────┬────────┬──────────┘
                                             │        │
                     HTTPS / REST / Auth     │        │ WebSockets (Socket.IO)
                                             ▼        ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│       SUPABASE CLOUD         │        │    SUPERSONIC SYNC ENGINE    │
│  - PostgreSQL Database       │        │  - High-precision NTP Timer  │
│  - Supabase Auth (JWT)       │        │  - Monotonic Room State Map  │
│  - Storage Bucket ('audio')  │        │  - Authority Event Dispatcher│
│  - Lightweight Party History │        │  - 3s Drift Re-calibration   │
└──────────────────────────────┘        └──────────────────────────────┘
```

---

## 3. The Sub-100ms Synchronization Engine

### The Latency Problem
In standard web streaming, network latency between the host, server, and participants creates a 500ms–3000ms delay. If a host presses play at 00:10, a participant on a slow connection might start playing at 00:12, destroying the shared listening experience.

### The SuperSonic NTP-like Solution
SuperSonic solves this using a 3-step synchronization algorithm:

#### Step 1: Clock Offset & Round-Trip Calibration
When any client connects to the WebSocket server:
1. The client sends a `sync:ping` packet with timestamp $T_0$ (Client Send Time).
2. The server receives it at $T_1$ and responds immediately at $T_2$ with `sync:pong`.
3. The client receives the pong at $T_3$.
4. Client computes:
   $$\text{Round Trip Time (RTT)} = (T_3 - T_0) - (T_2 - T_1)$$
   $$\text{One-Way Network Delay} = \frac{\text{RTT}}{2}$$
   $$\text{Clock Offset} = \frac{(T_1 - T_0) + (T_2 - T_3)}{2}$$
5. The client takes the **median of 5 rapid samples**, neutralizing momentary network spikes. Now the client knows the exact server time with $\pm 3\text{ms}$ precision.

#### Step 2: Timestamped Playback State
When the host hits **Play** or **Seek**:
1. Host client emits `playback:play` with target position $P$ (seconds).
2. Server stamps the event with authoritative Server Time $T_{\text{server}} = \text{Date.now()}$.
3. Server records:
   $$\text{RoomState} = \{ \text{isPlaying: true}, \text{position: } P, \text{startedAt: } T_{\text{server}} \}$$
4. Server broadcasts the packet to all participants.

#### Step 3: Predictive Target Position & Adaptive Steering
When a participant receives the play command or joins late:
1. Current true server time: $T_{\text{now}} = \text{Date.now()} + \text{ClockOffset}$.
2. Elapsed playback time since event: $\Delta t = \frac{T_{\text{now}} - T_{\text{server}}}{1000}$.
3. Target audio position: $P_{\text{target}} = P + \Delta t$.
4. **Adaptive Playback Steering**:
   - **If $|\text{CurrentPos} - P_{\text{target}}| > 120\text{ms}$**: Hard seek directly to $P_{\text{target}}$.
   - **If $20\text{ms} < |\text{CurrentPos} - P_{\text{target}}| \le 120\text{ms}$**: Micro-adjust playback rate ($0.97\times$ or $1.03\times$) for 300ms to smoothly close the gap without audible skips.
   - **If $|\text{CurrentPos} - P_{\text{target}}| \le 20\text{ms}$**: Perfect lockstep — keep playback rate at $1.00\times$.

---

## 4. Step-by-Step Data Flow

### A. Host Room Creation Flow
1. User logs in via Supabase Auth (or Guest Pass).
2. Host clicks **"Create Party"**.
3. Host sets party name and adds tracks:
   - **MP3 Upload**: Drag & drops files $\rightarrow$ Uploads to Supabase Storage or server upload handler $\rightarrow$ Audio metadata extracted (duration, title).
   - **YouTube Link**: Pastes URL (e.g. `https://youtube.com/watch?v=...`) $\rightarrow$ System extracts video ID and fetches title/thumbnail via oEmbed $\rightarrow$ Added to playlist.
4. Host clicks **"Launch Party"** $\rightarrow$ Server generates unique 6-character room code (e.g. `JAM-882`) and QR code.
5. Server creates high-speed in-memory state entry for the room.

### B. Participant Join Flow
1. Participant visits `https://domain.com/room/JAM-882` or scans QR Code.
2. Client establishes WebSocket connection $\rightarrow$ Performs NTP calibration.
3. Client emits `room:join` with `{ roomId, userId, username }`.
4. Server returns current room state:
   - Current active track
   - Exact playback position at this millisecond
   - Playing status (true/false)
   - Participant list
   - Temporary chat history
5. Participant's player automatically loads current track and seeks to exact computed position.

### C. Live Jamming & Playback Controls
- **Play/Pause/Seek**: Only host can trigger room-wide playback changes.
- **Track Change**: When a track ends or host clicks "Next", server changes `currentTrackIndex` and broadcasts `playback:track_changed`.
- **Participant Local Freedom**: Participants can locally mute or adjust volume on their device without disturbing others.

---

## 5. Database Schema & Scalability (Supabase)

### Scalability Strategy for 2,000+ Users
1. **Separation of Concerns**:
   - High frequency sync packets (every 2-3 seconds per room) run entirely in memory on the WebSocket engine.
   - Low frequency state (room creation, auth, user profiles, party summaries) is stored in Supabase PostgreSQL with indexed queries.
2. **PostgreSQL Tables**:
   - `profiles`: User information, avatars, preferences.
   - `rooms`: Active and past room records.
   - `room_tracks`: Playlist tracks per room.
   - `party_history`: Lightweight summary retained after a room ends (tracks played, peak attendee count, party duration).
3. **Row Level Security (RLS)**:
   - Enforces that only the room host can update room properties or delete the room.

---

## 6. Room Creation & Media Ingestion (MP3 + YouTube)

The platform supports two distinct media types in the same playlist:

```
Playlist Item
 ├── Type: 'mp3'
 │    ├── Direct audio source URL (Supabase Storage / Local / CDN)
 │    └── Rendered via HTML5 <audio> & Web Audio API Visualizer
 └── Type: 'youtube'
      ├── Video ID (11-character YouTube ID)
      └── Rendered via YouTube IFrame Player API with programmatic seekTo() & playVideo()
```

The unified player (`UnifiedPlayer.js`) automatically detects the current track's source type and seamlessly switches between the HTML5 Audio engine and the YouTube IFrame engine, keeping sync controls identical.

---

## 7. Host Authority & Moderation Protocol

| Action | Host Permission | Participant Permission | Server Event |
|---|---|---|---|
| **Play / Pause / Seek** | Allowed | Denied | `playback:play` / `playback:pause` |
| **Change Song** | Allowed | Denied | `playback:change_track` |
| **Add / Reorder Tracks**| Allowed | Denied | `playlist:update` |
| **Send Chat Message** | Allowed | Allowed (unless muted) | `chat:send` |
| **Warn / Mute User** | Allowed | Denied | `moderation:warn_user` / `moderation:toggle_mute` |
| **Kick User** | Allowed | Denied | `moderation:kick_user` |
| **End Party** | Allowed | Denied | `room:end_party` |

---

## 8. Client-Side Adaptive Audio Steering Engine

The client sync hook (`useSyncEngine.js`) continuously checks the audio element or YouTube player:

```js
// Periodic Drift Check (Every 1000ms)
const localTime = Date.now() + clockOffset;
const expectedPos = isPlaying ? (basePosition + (localTime - startedAt) / 1000) : basePosition;
const currentPos = player.getCurrentTime();
const drift = Math.abs(currentPos - expectedPos);

if (drift > 0.12) {
  // Drift is audible (>120ms) -> Hard seek
  player.seekTo(expectedPos);
} else if (drift > 0.03) {
  // Drift is minor (30ms - 120ms) -> Gentle rate steering
  player.setPlaybackRate(currentPos < expectedPos ? 1.03 : 0.97);
} else {
  // Locked in (<30ms) -> Standard rate
  player.setPlaybackRate(1.0);
}
```

---

## 9. Project Directory Structure

```
SuperSonic/
├── server/
│   └── index.js                 # High-performance Socket.IO Sync Server
├── src/
│   ├── app/
│   │   ├── globals.css          # Cyberpunk Glassmorphism Design System
│   │   ├── layout.js            # Root layout with fonts & providers
│   │   ├── page.js              # Grand Landing Page
│   │   ├── auth/page.js         # Sign in / Sign up / Guest Auth
│   │   ├── dashboard/page.js    # Host Dashboard & Party History
│   │   ├── room/
│   │   │   ├── create/page.js   # Room Creation & Media Ingestion
│   │   │   └── [roomId]/page.js # Synchronized Party Room (Host/Participant)
│   │   └── api/
│   │       └── upload/route.js  # Audio upload API route
│   ├── components/
│   │   ├── Navbar.js            # Top header with user profile & room status
│   │   ├── UnifiedPlayer.js     # Master player (MP3 + YouTube)
│   │   ├── AudioVisualizer.js   # Dynamic audio equalizer canvas
│   │   ├── ChatPanel.js         # Real-time room chat with moderation
│   │   ├── PlaylistManager.js   # Host playlist reorder & track selector
│   │   ├── QRCodeModal.js       # QR Code & link sharing modal
│   │   └── ParticipantList.js   # Real-time attendee list & moderation actions
│   ├── context/
│   │   ├── AuthContext.js       # Supabase auth session & guest user state
│   │   └── SocketContext.js     # Global WebSocket provider
│   ├── hooks/
│   │   └── useSyncEngine.js     # NTP sync & drift compensation hook
│   └── lib/
│       ├── supabase/client.js   # Supabase client with auto-mock fallback
│       └── utils.js             # Formatting, YouTube ID parser, UUIDs
├── supabase/
│   └── schema.sql               # PostgreSQL tables, RLS policies, triggers
├── scripts/
│   └── start-all.js             # Concurrent dev server starter
├── package.json
└── PROJECT_IMPLEMENTATION_GUIDE.md # This guide
```

---

## 10. Local Development & Deployment Guide

### Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Run both the Web App (port 3000) and Sync Server (port 3001)
npm run dev:all
```

Open `http://localhost:3000` in your browser.

### Testing Synchronization:
1. Open `http://localhost:3000/room/create` in Chrome.
2. Add an MP3 file or YouTube link and click **"Create & Launch Room"**.
3. Copy the room link and open it in a second browser window (or Incognito / Phone on same Wi-Fi).
4. Hit **Play** on the host window: observe instantaneous, synchronized playback on both windows with < 100ms drift!

### Render Deployment

Render runs the entire application as one web service. The custom entrypoint starts Next.js, Express, and Socket.IO on Render's `PORT`; the browser connects to Socket.IO through the same origin when `NEXT_PUBLIC_SOCKET_URL` is unset.

1. Create a Render Blueprint from `render.yaml`, using the Singapore region for Indian users.
2. Add the Supabase environment variables in Render's Environment tab. Never commit service-role keys.
3. Deploy with the blueprint's `npm ci && npm run build` build command and `npm start` start command.
4. Verify `/api/health` and then test a host plus several participants over the public HTTPS URL.

The current room store is intentionally process-local. Start with one Render instance and load-test it before the event. The included harness defaults to 2,000 users across 200 rooms:

```bash
LOAD_TEST_URL=https://your-render-service.onrender.com npm run load:test
```

Override `LOAD_TEST_USERS` and `LOAD_TEST_ROOMS` to model different room sizes. Record Render CPU, memory, network, connection count, join p95, and playback-event p95. If one instance approaches its limits or a multi-instance deployment is required, add the Socket.IO Redis adapter and move room/session state to shared Redis before enabling horizontal scaling.
