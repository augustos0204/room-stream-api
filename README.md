# 🔌 RoomStream - API

A robust and scalable WebSocket API built with **NestJS** and **Socket.IO** for creating and managing real-time chat rooms. Includes a **complete web platform** for managing rooms, applications, and more.

## 📋 Table of Contents

- [Features](#-features)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [WebSocket Events](#-websocket-events)
- [Web Platform](#-web-platform)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 Core Backend Features
- **Real-time room creation and management**
- **Participant system** with customizable names  
- **Real-time messaging** with persistent history
- **Multiple simultaneous rooms** per user
- **Join/leave events** with notifications
- **Comprehensive metrics system** for monitoring
- **Application/API Key management** for integrations

### 🛠️ Backend Architecture  
- **Isolated WebSocket namespace** (`/ws/rooms`)
- **Robust input validation** on all endpoints
- **Automatic disconnection handling**
- **Configurable CORS** for different environments
- **Detailed logging** and error handling
- **Modular NestJS architecture** for scalability
- **Event-driven system** with @nestjs/event-emitter
- **TypeScript implementation** for type safety
- **Flexible storage** (Redis or in-memory)

### 🌐 Web Platform
- **Complete SPA dashboard** at `/platform`
- **Room management interface**
- **Real-time chat interface**
- **Application/API Key management**
- **User profile** (with Supabase auth)
- **GitHub integration** for about page
- **PWA-ready** with manifest files

### 🔐 Authentication
- **Multiple auth methods**: Supabase JWT, API Key, Application Key
- **Per-application API keys** for integrations
- **Periodic token validation** for Supabase

### 🧪 Development Tools
- **Interactive Swagger docs** at `/docs/api`
- **HTTP request files** for endpoint validation  
- **Health checks** and **metrics endpoints**
- **Comprehensive logging** for debugging

## 🚀 Technologies

### Backend
- **[NestJS](https://nestjs.com/)** - Progressive Node.js framework
- **[Socket.IO](https://socket.io/)** - Real-time WebSocket library
- **[TypeScript](https://www.typescriptlang.org/)** - Typed JavaScript
- **[@nestjs/event-emitter](https://docs.nestjs.com/techniques/events)** - Event system
- **[@nestjs/config](https://docs.nestjs.com/techniques/configuration)** - Configuration management
- **[ioredis](https://github.com/redis/ioredis)** - Redis client (optional)
- **[Supabase](https://supabase.com/)** - Authentication & Database (optional)

### Frontend (Platform)
- **[EJS](https://ejs.co/)** - Template engine
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS (via CDN)
- **Custom CSS** - For complex components and animations
- **Vanilla JavaScript** - For interactivity

### DevTools
- **[ESLint](https://eslint.org/)** & **[Prettier](https://prettier.io/)** - Code quality
- **[Jest](https://jestjs.io/)** - Testing framework
- **[Swagger](https://swagger.io/)** - API documentation

## 📦 Installation

### Prerequisites
- **Node.js** >= 18.x
- **pnpm** >= 8.x (recommended) or npm/yarn
- **Redis** (optional, for persistent storage)
- **Supabase** project (optional, for authentication)

### Clone Repository
```bash
git clone https://github.com/augustos0204/room-stream-api.git
cd room-stream-api
```

### Install Dependencies
```bash
pnpm install
# or
npm install
```

## ⚙️ Configuration

### 1. Environment Variables
Copy the example file and configure the variables:

```bash
cp .env.example .env
```

#### Available Variables
```bash
# 🚀 SERVER CONFIGURATION
PORT=3000                    # Server port

# 🌐 CORS CONFIGURATION
CORS_ORIGIN=*               # Allowed origin (* for development)

# 🔌 WEBSOCKET CONFIGURATION
WEBSOCKET_NAMESPACE=/ws/rooms # Socket.IO namespace

# 🔐 SECURITY CONFIGURATION
API_KEY=your-secret-key     # Global API key (optional)
                            # Generate with: openssl rand -hex 32

# 🔑 SUPABASE CONFIGURATION (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# 💾 REDIS CONFIGURATION (optional)
REDIS_URL=redis://localhost:6379

# ⏱️ PRESENCE CONFIGURATION
ROOM_PARTICIPANT_TTL_SECONDS=120  # Participant presence TTL in seconds

# ⏱️ TOKEN VALIDATION
TOKEN_VALIDATION_INTERVAL=300000  # 5 minutes in ms

# 🐙 GITHUB CONFIGURATION (optional)
GITHUB_CACHE_ENABLED=true   # Enable GitHub API cache

# 📱 APPLICATION SETTINGS
APP_NAME="RoomStream API"
APP_VERSION=1.0.0
```

### 2. Available Scripts

#### Development
```bash
pnpm run start:dev          # Server in watch mode
pnpm run start:debug        # Server with debug enabled
```

#### Production
```bash
pnpm run build             # Build for production
pnpm run start:prod        # Run compiled version
```

#### Code Quality
```bash
pnpm run lint              # Run ESLint
pnpm run format            # Format code with Prettier
```

## 🎯 Usage

### Start Server
```bash
pnpm run start:dev
```

The server will be available at:
- **🎯 REST API**: `http://localhost:3000`
- **🔌 WebSocket**: `ws://localhost:3000/ws/rooms`
- **🌐 Web Platform**: `http://localhost:3000/platform`
- **📚 API Docs**: `http://localhost:3000/docs/api`

## 📚 API Endpoints

### Rooms

#### Create Room
```http
POST /rooms
Content-Type: application/json

{
  "name": "My Chat Room"
}
```

#### List All Rooms
```http
GET /rooms
```

#### Get Specific Room
```http
GET /rooms/:id
```

#### Delete Room
```http
DELETE /rooms/:id
```

#### Get Room Messages
```http
GET /rooms/:id/messages
```

#### Get Room Participants
```http
GET /rooms/:id/participants
```

### Applications (Requires Supabase Auth)

#### Create Application
```http
POST /applications
Authorization: Bearer <supabase-jwt>
Content-Type: application/json

{
  "name": "My App",
  "description": "Optional description"
}
```

#### List User's Applications
```http
GET /applications
Authorization: Bearer <supabase-jwt>
```

#### Get Specific Application
```http
GET /applications/:id
Authorization: Bearer <supabase-jwt>
```

#### Update Application
```http
PATCH /applications/:id
Authorization: Bearer <supabase-jwt>
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": true
}
```

#### Delete Application
```http
DELETE /applications/:id
Authorization: Bearer <supabase-jwt>
```

#### Regenerate API Key
```http
POST /applications/:id/regenerate-key
Authorization: Bearer <supabase-jwt>
```

### Monitoring

#### Health Check
```http
GET /health
```

#### System Metrics
```http
GET /metrics
```

#### GitHub Profile (for about page)
```http
GET /api/github/profile
```

## 🔐 Authentication

### Authentication Methods

The API supports multiple authentication methods:

| Method | Use Case | Header/Auth |
|--------|----------|-------------|
| **Application Key** | Server-to-server | `auth.applicationKey` |
| **Supabase JWT** | User authentication | `Authorization: Bearer` |
| **Global API Key** | Simple API access | `x-api-key` header |

### Application Key Authentication

Create an application via the API or Platform to get an API key:

```javascript
// WebSocket connection with application key
const socket = io('http://localhost:3000/ws/rooms', {
  auth: { applicationKey: 'app_your64hexcharacters...' }
});
```

### Supabase Authentication

```javascript
// WebSocket connection with Supabase token
const socket = io('http://localhost:3000/ws/rooms', {
  auth: { token: 'supabase-jwt-token' }
});
```

### Global API Key Authentication

```bash
# REST API
curl -H "x-api-key: your-api-key" http://localhost:3000/rooms

# WebSocket
const socket = io('http://localhost:3000/ws/rooms', {
  auth: { apiKey: 'your-api-key' }
});
```

> **Note**: If no authentication is configured, the API is open (useful for development).

## 🔌 WebSocket Events

### Connection

```javascript
const socket = io('http://localhost:3000/ws/rooms');

// With authentication
const socket = io('http://localhost:3000/ws/rooms', {
  auth: { 
    token: 'supabase-jwt',        // OR
    applicationKey: 'app_...',     // OR
    apiKey: 'global-api-key'
  }
});
```

### Client → Server Events

#### Join Room
```javascript
socket.emit('joinRoom', {
  roomId: 'room-id',
  participantName: 'Your Name' // optional
});
```

#### Leave Room
```javascript
socket.emit('leaveRoom', {
  roomId: 'room-id'
});
```

#### Send Message
```javascript
socket.emit('sendMessage', {
  roomId: 'room-id',
  message: 'Your message here'
});

// Or use 'emit' for custom events
socket.emit('emit', {
  roomId: 'room-id',
  message: 'Custom event data',
  event: 'custom-event-name' // optional, defaults to 'message'
});
```

#### Get Room Info
```javascript
socket.emit('getRoomInfo', {
  roomId: 'room-id'
});
```

#### Update Participant Name
```javascript
socket.emit('updateParticipantName', {
  roomId: 'room-id',
  participantName: 'New Name'
});
```

### Server → Client Events

#### Joined Room
```javascript
socket.on('joinedRoom', (data) => {
  console.log('Joined room:', data);
  // { roomId, roomName, participants, recentMessages }
});
```

#### User Joined
```javascript
socket.on('userJoined', (data) => {
  console.log('User joined:', data);
  // { clientId, participantName, roomId, roomName, participantCount }
});
```

#### User Left
```javascript
socket.on('userLeft', (data) => {
  console.log('User left:', data);
  // { clientId, participantName, roomId, roomName, participantCount }
});
```

#### New Message
```javascript
socket.on('newMessage', (data) => {
  console.log('New message:', data);
  // { id, clientId, message, timestamp, roomId, event }
});
```

#### Room Info
```javascript
socket.on('roomInfo', (data) => {
  console.log('Room info:', data);
  // { id, name, participantCount, participants, messageCount, createdAt }
});
```

#### Name Updated
```javascript
socket.on('participantNameUpdated', (data) => {
  console.log('Name updated:', data);
  // { clientId, participantName, roomId }
});
```

#### Room Deleted
```javascript
socket.on('roomDeleted', (data) => {
  console.log('Room deleted:', data);
  // { roomId, roomName, message }
});
```

#### Errors
```javascript
socket.on('error', (error) => {
  console.error('Error:', error);
  // { message: 'Error description' }
});
```

## 🌐 Web Platform

The web platform at `/platform` provides a complete interface for:

### Available Pages

| Route | Description |
|-------|-------------|
| `/platform` | Dashboard with overview |
| `/platform/rooms` | Room listing and management |
| `/platform/chat` | Real-time chat interface |
| `/platform/applications` | API Key management |
| `/platform/profile` | User profile (requires auth) |
| `/platform/login` | Authentication page |
| `/platform/about` | About page with GitHub integration |
| `/platform/guide` | Documentation and usage guide |
| `/platform/landing` | Landing page |

### Features

- **SPA Architecture**: Smooth navigation without page reloads
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Live room and message updates
- **Dark Mode Ready**: CSS custom properties for theming
- **PWA Support**: Manifest files for installation

## 📁 Project Structure

```
src/
├── 📁 application/           # Application/API Key management
│   ├── application.controller.ts
│   ├── application.module.ts
│   ├── application.service.ts
│   └── dto/
├── 📁 common/                # Shared utilities
│   ├── config/              # Configuration helpers
│   ├── decorators/          # Custom decorators (@Public)
│   ├── dto/                 # Shared DTOs
│   ├── filters/             # Exception filters
│   ├── guards/              # Auth guards
│   ├── interceptors/        # Request interceptors
│   ├── interfaces/          # Shared interfaces
│   └── utils/               # Utility functions
├── 📁 events/                # Event system
│   ├── events.module.ts
│   ├── events.service.ts
│   └── metrics.events.ts
├── 📁 github/                # GitHub integration
│   ├── github.controller.ts
│   ├── github.module.ts
│   └── github.service.ts
├── 📁 health/                # Health checks
│   ├── health.controller.ts
│   ├── health.module.ts
│   └── health.service.ts
├── 📁 memory/                # Storage abstraction
│   ├── adapters/            # In-memory & Redis adapters
│   ├── interfaces/
│   ├── memory.module.ts
│   └── memory.service.ts
├── 📁 metrics/               # System metrics
│   ├── metrics.controller.ts
│   ├── metrics.module.ts
│   └── metrics.service.ts
├── 📁 platform/              # Web platform
│   ├── pages/               # SPA pages (EJS)
│   ├── components/          # Reusable components
│   ├── public/              # Static assets & error pages
│   │   ├── styles/          # CSS files
│   │   ├── scripts/         # JavaScript files
│   │   └── media/           # Images, icons
│   ├── platform.controller.ts
│   ├── platform.module.ts
│   └── pages.service.ts
├── 📁 room/                  # Core - Chat rooms
│   ├── dto/                 # Room DTOs
│   ├── interfaces/          # Room interfaces
│   ├── room.controller.ts   # REST endpoints
│   ├── room.gateway.ts      # WebSocket gateway
│   ├── room.module.ts
│   └── room.service.ts      # Business logic
├── 📁 supabase/              # Supabase integration
│   ├── supabase.module.ts
│   └── supabase.service.ts
├── 📁 types/                 # Shared types
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts                  # Entry point
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pnpm run test

# Tests in watch mode
pnpm run test:watch

# E2E tests
pnpm run test:e2e

# Coverage
pnpm run test:cov
```

### Manual API Testing

Use the Swagger UI at `/docs/api` or the provided `.http` files in the `requests/` folder.

## 📊 Monitoring

### Metrics System
The system automatically collects metrics:

- **Connections**: Connected/disconnected users
- **Rooms**: Created/deleted
- **Messages**: Sent per room
- **Participants**: Room join/leave events

### Logs
Detailed logs for all operations:
```bash
[RoomGateway] Client connected on namespace /ws/rooms: abc123
[RoomService] Room created: room_1234567890_abc (My Room)
[RoomGateway] Client abc123 joined room: room_1234567890_abc
```

## 🤝 Contributing

1. **Fork** the project
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add: AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Commit Standards
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Maintenance

## 🚀 Deployment

### Production Variables
```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com
WEBSOCKET_NAMESPACE=/ws/rooms
API_KEY=your-secure-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REDIS_URL=redis://your-redis-host:6379
```

### Docker
```bash
# Build
docker build -t roomstream-api .

# Run
docker run -p 3000:3000 --env-file .env roomstream-api
```

## 📞 Support

- **Documentation**: Check this README and `/docs/api`
- **Issues**: Use [GitHub Issues](https://github.com/augustos0204/room-stream-api/issues)
- **Contact**: Start a discussion in the repository

---

<p align="center">
  Made with ❤️ using <a href="https://nestjs.com/">NestJS</a> and <a href="https://socket.io/">Socket.IO</a>
</p>
