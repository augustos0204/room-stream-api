# 🔌 RoomStream - API

A robust and scalable WebSocket API built with **NestJS** and **Socket.IO** for creating and managing real-time chat rooms.

> **⚠️ Note**: This project focuses on **backend implementation**. The web interface at `/view` is a **basic prototype** for development testing and API validation purposes only.

## 📋 Table of Contents

- [Features](#-features)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [WebSocket Events](#-websocket-events)
- [Web Interface](#-web-interface)
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

### 🛠️ Backend Architecture  
- **Isolated WebSocket namespace** (`/ws/rooms`)
- **Robust input validation** on all endpoints
- **Automatic disconnection handling**
- **Configurable CORS** for different environments
- **Detailed logging** and error handling
- **Modular NestJS architecture** for scalability
- **Event-driven system** with @nestjs/event-emitter
- **TypeScript implementation** for type safety

### 🧪 Development Tools
- **Basic web interface** for API testing
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

### Development Interface
- **[Tailwind CSS](https://tailwindcss.com/)** - For basic styling
- **[Alpine.js](https://alpinejs.dev/)** - For simple interactivity
- **HTML5 & JavaScript** - Basic web technologies for testing interface

### DevTools
- **[ESLint](https://eslint.org/)** & **[Prettier](https://prettier.io/)** - Code quality
- **[Jest](https://jestjs.io/)** - Testing framework
- **[TypeScript](https://www.typescriptlang.org/)** - Static typing

## 📦 Installation

### Prerequisites
- **Node.js** >= 18.x
- **pnpm** >= 8.x (recommended) or npm/yarn

### Clone Repository
```bash
git clone https://github.com/your-username/nest-websocket-api.git
cd nest-websocket-api
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
# API_KEY=your-secret-key    # Optional API key for authentication
                              # If not set, authentication is disabled
                              # Generate with: openssl rand -hex 32

# 📱 APPLICATION SETTINGS
APP_NAME="NestJS WebSocket Room API"
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
- **🧪 Testing Interface**: `http://localhost:3000/view` (development tool)

## 📚 API Endpoints

### Rooms

#### Create Room
```http
POST /room
Content-Type: application/json

{
  "name": "My Chat Room"
}
```

#### List All Rooms
```http
GET /room
```

#### Get Specific Room
```http
GET /room/:id
```

#### Delete Room
```http
DELETE /room/:id
```

#### Get Room Messages
```http
GET /room/:id/messages
```

#### Get Room Participants
```http
GET /room/:id/participants
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

## 🔐 Authentication

### API Key Authentication (Optional)

The API supports optional API key authentication for enhanced security. If `API_KEY` is set in your environment variables, all REST API requests and WebSocket connections will require authentication.

#### REST API

Provide the API key in one of three ways:

**1. Header (Recommended)**
```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/room
```

**2. Authorization Header**
```bash
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/room
```

**3. Query Parameter**
```bash
curl http://localhost:3000/room?apiKey=your-api-key
```

#### WebSocket

Provide the API key when connecting:

**1. Auth Option (Recommended)**
```javascript
const socket = io('http://localhost:3000/ws/rooms', {
  auth: { apiKey: 'your-api-key' }
});
```

**2. Query Parameter**
```javascript
const socket = io('http://localhost:3000/ws/rooms?apiKey=your-api-key');
```

**3. Header**
```javascript
const socket = io('http://localhost:3000/ws/rooms', {
  extraHeaders: { 'x-api-key': 'your-api-key' }
});
```

#### Swagger/OpenAPI

Access the interactive API documentation at `http://localhost:3000/api-docs`. When API key authentication is enabled, click the "Authorize" button (lock icon) and enter your API key to test endpoints.

#### Generate Secure Key

```bash
# Generate a random 32-byte hex key
openssl rand -hex 32
```

> **Note**: If `API_KEY` is not set, authentication is **disabled** (useful for development). Set it in production for security.

## 🔌 WebSocket Events

### Connection
Connect to the `/ws/rooms` namespace:

```javascript
const socket = io('http://localhost:3000/ws/rooms');

// With API key authentication (if enabled)
const socket = io('http://localhost:3000/ws/rooms', {
  auth: { apiKey: 'your-api-key' }
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
  // { id, clientId, message, timestamp, roomId }
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

#### Errors
```javascript
socket.on('error', (error) => {
  console.error('Error:', error);
  // { message: 'Error description' }
});
```

## 🧪 Development Testing Interface

### Basic WebSocket Tester (`/view`)
Simple testing interface for API validation during development:

- **Connection testing** - Verify WebSocket connectivity
- **Room operations** - Test creation, joining, and leaving rooms
- **Message flow** - Validate real-time messaging functionality
- **Event monitoring** - View transmitted data and debug issues
- **API endpoint testing** - Quick validation of REST endpoints

> **⚠️ Purpose**: This is a **development tool** for testing backend functionality, not a production UI solution. The interface provides basic visualization to help developers validate API implementation and identify integration issues.

## 📁 Project Structure

```
src/
├── 📁 common/              # Shared utilities
│   └── utils/
│       └── uptime.util.ts
├── 📁 events/              # Event system
│   ├── events.module.ts
│   ├── events.service.ts
│   └── metrics.events.ts
├── 📁 health/              # Health checks
│   ├── health.controller.ts
│   ├── health.module.ts
│   └── health.service.ts
├── 📁 metrics/             # System metrics
│   ├── metrics.controller.ts
│   ├── metrics.module.ts
│   └── metrics.service.ts
├── 📁 room/                # Core - Chat rooms
│   ├── room.controller.ts  # REST endpoints
│   ├── room.gateway.ts     # WebSocket gateway
│   ├── room.module.ts      # Room module
│   └── room.service.ts     # Business logic
├── 📁 views/               # Web interface
│   ├── public/             # Static files
│   │   ├── *.html         # HTML pages
│   │   ├── scripts/       # JavaScript
│   │   └── styles/        # CSS
│   ├── views.controller.ts # Views controller
│   └── views.module.ts     # Views module
├── app.controller.ts       # Main controller
├── app.module.ts          # Root module
├── app.service.ts         # Main service
└── main.ts               # Entry point
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

You can test the REST API using any HTTP client or the provided `.http` files in the `requests/` folder:

```http
### Create a room
POST http://localhost:3000/room
Content-Type: application/json

{
  "name": "Test Room"
}

### List all rooms
GET http://localhost:3000/room

### Get specific room
GET http://localhost:3000/room/{{roomId}}
```

The `/view` interface can also be used for quick visual testing during development.

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
API_KEY=your-secure-api-key-here  # Generate with: openssl rand -hex 32
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## 📞 Support

- **Documentation**: Check this README
- **Issues**: Use [GitHub Issues](https://github.com/augustos0204/nest-websocket-api/issues)
- **Contact**: Start a discussion in the repository

---

<p align="center">
  Made with ❤️ using <a href="https://nestjs.com/">NestJS</a> and <a href="https://socket.io/">Socket.IO</a>
</p>
