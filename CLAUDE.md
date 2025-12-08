# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RoomStream is a real-time WebSocket API built with NestJS and Socket.IO for creating and managing chat rooms. The focus is on backend implementation - the `/view` web interface is a basic development testing tool, not a production UI.

## Essential Commands

### Development
```bash
pnpm run start:dev          # Start dev server with watch mode
pnpm run start:debug        # Start with debug enabled
```

### Building
```bash
pnpm run build             # Build for production
pnpm run start:prod        # Run compiled version
```

### Testing
```bash
pnpm run test              # Run unit tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:e2e          # Run e2e tests
pnpm run test:cov          # Run tests with coverage
```

### Code Quality
```bash
pnpm run lint              # Run ESLint with auto-fix
pnpm run format            # Format code with Prettier
```

## Architecture Overview

### Module Structure

The application follows NestJS modular architecture with clear separation of concerns:

- **RoomModule** - Core business logic for chat rooms
  - `RoomService`: In-memory storage and room operations (Map-based)
  - `RoomGateway`: WebSocket event handlers using Socket.IO
  - `RoomController`: REST API endpoints
    - `POST /room` - Create new room
    - `GET /room` - List all rooms
    - `GET /room/:id` - Get specific room
    - `DELETE /room/:id` - Delete room
    - `GET /room/:id/messages` - Get all room messages
    - `GET /room/:id/participants` - Get all room participants

- **EventsModule** - Event-driven communication layer
  - Uses `@nestjs/event-emitter` (EventEmitter2) for internal events
  - `EventsService`: Type-safe wrapper for emitting/subscribing to metrics events
  - All events follow `metrics:*` naming convention

- **MetricsModule** - System monitoring and observability
  - `MetricsService`: Listens to all `metrics:*` events and maintains counters
  - Tracks: connections, rooms, messages, uptime
  - Provides `/metrics` endpoint for observability

- **HealthModule** - Service health monitoring
  - Provides `/health` endpoint

- **ViewsModule** - Serves basic development UI
  - Serves static HTML/CSS/JS from `src/views/public/`
  - `/view` route for development testing interface

### Data Flow

1. **WebSocket Events** → RoomGateway handles Socket.IO events
2. **Business Logic** → RoomService manages room state (in-memory Maps)
3. **Event Emission** → Service operations emit `metrics:*` events via EventsService
4. **Metrics Collection** → MetricsService listens to events and updates counters
5. **REST API** → RoomController provides HTTP endpoints for room management

### State Management

**Critical**: All room state is stored in-memory using JavaScript Maps:
- `RoomService.rooms`: `Map<string, Room>` - main room storage
- Each `Room` contains:
  - `participants`: `string[]` - socket client IDs
  - `participantNames`: `Map<string, string | null>` - client ID to name mapping
  - `messages`: `RoomMessage[]` - message history

**No database is used** - state is lost on server restart.

### WebSocket Configuration

- **Namespace**: `/ws/rooms` (configurable via `WEBSOCKET_NAMESPACE` env var)
- **Transports**: websocket, polling
- **CORS**: Configured via `CORS_ORIGIN` env var (default: `*` for development)
- **Events**: joinRoom, leaveRoom, sendMessage, getRoomInfo, updateParticipantName

### Client Lifecycle

1. Client connects to `/ws/rooms` namespace → triggers `metrics:client-connected`
2. Client emits `joinRoom` → joins Socket.IO room + added to RoomService participants
3. Disconnection → automatically removed from all rooms (see `handleDisconnect` in RoomGateway)

## API Documentation (Swagger/OpenAPI)

The application includes comprehensive API documentation using Swagger/OpenAPI:

### Access
- **Documentation UI**: `/api-docs` - Interactive Swagger interface
- Auto-generated from NestJS decorators and DTOs
- Customized with alphabetical sorting and clean UI

### Implementation
- All REST endpoints use Swagger decorators:
  - `@ApiTags()` - Group endpoints by module
  - `@ApiOperation()` - Describe endpoint purpose
  - `@ApiResponse()` - Document response schemas
  - `@ApiParam()` - Document URL parameters
  - `@ApiBody()` - Document request body
- Configuration in `main.ts:16-40`
- Packages: `@nestjs/swagger`, `swagger-ui-express`

### Tags
- `rooms` - Chat room management endpoints
- `health` - Service health check
- `metrics` - System monitoring and observability

## Important Implementation Details

### ID Generation

- Room IDs: `room_{timestamp}_{random9chars}` (see `RoomService.generateRoomId`)
- Message IDs: `msg_{timestamp}_{random9chars}` (see `RoomService.generateMessageId`)

### Participant Name System

- Participants can optionally provide a name when joining
- Names can be updated via `updateParticipantName` event
- Names are stored in `participantNames` Map and broadcast to room on updates

### Message History

- All messages are kept in memory in `Room.messages` array
- When joining, clients receive last 10 messages (see `joinedRoom` event in RoomGateway:113)
- No message persistence or pagination
- Full message history available via `GET /room/:id/messages` REST endpoint

### Room Deletion

- Rooms can be deleted via REST API (`DELETE /room/:id`) or by service method
- `RoomService.deleteRoom(roomId)` removes room from Map and emits `metrics:room-deleted` event
- Deletion does not automatically disconnect active participants (handle via WebSocket events if needed)

### Participant Information Retrieval

- `RoomService.getParticipantsWithNames(roomId)` returns array of `{clientId, name}` objects
- Used by REST endpoints and WebSocket events to provide participant details
- Available via `GET /room/:id/participants` endpoint

### Event-Driven Metrics

The metrics system is fully event-driven:
1. RoomService/RoomGateway emit events via `EventsService.emitMetricsEvent()`
2. MetricsService subscribes to all `metrics:*` events on module init
3. Event types are strictly typed via `MetricsEvents` interface (see `events/metrics.events.ts`)

Event types tracked:
- `metrics:client-connected` - Client connects to WebSocket
- `metrics:client-disconnected` - Client disconnects from WebSocket
- `metrics:room-created` - New room created
- `metrics:room-deleted` - Room deleted
- `metrics:user-joined-room` - User joins a room
- `metrics:user-left-room` - User leaves a room
- `metrics:message-sent` - Message sent in room

## Configuration

Environment variables (see `.env.example`):
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - CORS allowed origin (default: `*`)
- `WEBSOCKET_NAMESPACE` - Socket.IO namespace (default: `/ws/rooms`)
- `API_KEY` - API key for authentication (optional, if not set auth is disabled)
- `SUPABASE_URL` - Supabase project URL (optional, for Supabase authentication)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (optional, for Supabase authentication)
- `APP_NAME` - Application name (used in Docker deployments)
- `APP_VERSION` - Application version (used in Docker deployments)

**Note**: `APP_NAME` and `APP_VERSION` are primarily used in Docker Compose configurations (`docker-compose.yml`, `docker-compose.coolify.yml`, `docker-compose.dev.yml`) as environment variables passed to containers for deployment tracking and identification.

## Security & Authentication

### API Key Authentication

The API supports optional API key authentication for both REST API and WebSocket connections:

**Configuration:**
- Set `API_KEY` environment variable to enable authentication
- If not set, authentication is disabled (useful for development)
- Generate a secure key: `openssl rand -hex 32`

**REST API Authentication:**
The API key can be provided in two ways (checked in order):
1. `x-api-key` header (recommended)
2. `apiKey` query parameter

**Note**: The `Authorization` header is reserved exclusively for Supabase JWT tokens.

Example:
```bash
# Using header (recommended)
curl -H "x-api-key: your-api-key" http://localhost:3000/room

# Using query parameter
curl http://localhost:3000/room?apiKey=your-api-key

# With both API Key AND Supabase token
curl -H "x-api-key: your-api-key" \
     -H "Authorization: Bearer supabase-jwt-token" \
     http://localhost:3000/room
```

**WebSocket Authentication:**
For WebSocket connections, provide the API key in one of these ways:
1. `auth.apiKey` in connection options (recommended)
2. `x-api-key` in headers
3. `apiKey` query parameter

Example (client-side):
```javascript
// Socket.IO client
const socket = io('/ws/rooms', {
  auth: { apiKey: 'your-api-key' }
});

// Alternative: via query
const socket = io('/ws/rooms?apiKey=your-api-key');
```

**Swagger/OpenAPI:**
When API_KEY is configured, Swagger UI will show a lock icon on endpoints. Click "Authorize" to enter your API key for testing.

**Implementation Details:**
- Guard: `src/common/guards/api-key.guard.ts` - Applied globally to all REST endpoints
- WebSocket: Validated in `RoomGateway.handleConnection()` before accepting connections
- Failed auth returns `401 Unauthorized` for REST, disconnects WebSocket clients
- All auth failures are logged with client IP/address for security monitoring

### Supabase Authentication

The API supports optional Supabase authentication for both REST API and WebSocket connections:

**Configuration:**
- Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables to enable authentication
- If not set, Supabase authentication is disabled
- Get credentials from your Supabase project: https://app.supabase.com/project/_/settings/api

**Module Structure:**
- **SupabaseModule** - Supabase integration module
  - `SupabaseService`: JWT token validation and user authentication
  - Validates tokens using `supabase.auth.getUser(token)`

**REST API Authentication:**
Provide JWT token via `Authorization` header:

```bash
curl -H "Authorization: Bearer <supabase-jwt-token>" http://localhost:3000/room
```

**WebSocket Authentication:**
For WebSocket connections, provide the JWT token in one of these ways:
1. `auth.token` in connection options (recommended)
2. `Authorization` header as Bearer token

Example (client-side):
```javascript
// Socket.IO client - recommended
const socket = io('/ws/rooms', {
  auth: { token: 'supabase-jwt-token' }
});

// Alternative: via Authorization header
const socket = io('/ws/rooms', {
  extraHeaders: {
    'Authorization': 'Bearer supabase-jwt-token'
  }
});
```

**User Data Flow:**
When a user is authenticated via Supabase:
1. Token is validated during WebSocket connection (`handleConnection`)
2. User data is stored in `client.data.user` (from `@supabase/supabase-js` User type)
3. User's display name is automatically set from Supabase:
   - Priority: `user.email` → `user.user_metadata.name` → `'User'`
4. Users authenticated via Supabase **cannot** update their participant name
   - `updateParticipantName` event is blocked for authenticated users
   - Name always comes from Supabase user data

**Implementation Details:**
- Guard: `src/common/guards/supabase-auth.guard.ts` - Applied globally to all REST endpoints
- Service: `src/supabase/supabase.service.ts` - Token validation and user retrieval
- WebSocket: Validated in `RoomGateway.handleConnection()` before accepting connections
- Bypass global guard with `@Public()` decorator (same as API Key)
- User object includes: `id`, `email`, `user_metadata`, and other Supabase user fields
- Failed auth returns `401 Unauthorized` for REST, disconnects WebSocket clients
- All auth failures are logged with client IP/address for security monitoring

**Swagger/OpenAPI:**
When Supabase is configured, Swagger UI will show a lock icon on endpoints. Click "Authorize" to enter your Supabase JWT token for testing.

**Authentication Hierarchy (Either/Or):**
The system supports flexible authentication - you can use **either** API Key **or** Supabase token:

1. **If only `API_KEY` is configured:**
   - API Key is required (via `x-api-key` header or `apiKey` query parameter)

2. **If only `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured:**
   - Supabase JWT token is required (via `Authorization: Bearer <token>` header)

3. **If both are configured:**
   - You can provide **either** API Key **or** Supabase token (not both required)
   - API Key is checked first - if valid, Supabase validation is skipped
   - If no API Key, Supabase token is required

4. **If neither is configured:**
   - No authentication required (useful for development)

**Important**: Each authentication method uses different headers to avoid conflicts:
- **API Key**: `x-api-key` header (recommended) or `apiKey` query parameter
- **Supabase**: `Authorization: Bearer <jwt-token>` header (exclusive)

**Usage Examples:**

```bash
# Option 1: Only API Key
curl -H "x-api-key: your-api-key" \
     http://localhost:3000/room

# Option 2: Only Supabase token
curl -H "Authorization: Bearer supabase-jwt-token" \
     http://localhost:3000/room

# Option 3: Both (optional - either one is enough)
curl -H "x-api-key: your-api-key" \
     -H "Authorization: Bearer supabase-jwt-token" \
     http://localhost:3000/room
```

```javascript
// WebSocket examples

// Option 1: Only API Key
const socket = io('/ws/rooms', {
  auth: { apiKey: 'your-api-key' }
});

// Option 2: Only Supabase token
const socket = io('/ws/rooms', {
  auth: { token: 'supabase-jwt-token' }
});

// Option 3: Both (optional - either one is enough)
const socket = io('/ws/rooms', {
  auth: {
    apiKey: 'your-api-key',
    token: 'supabase-jwt-token'
  }
});
```

**Participant Name Behavior:**
- **Anonymous users**: Can set and update participant names via `participantName` in `joinRoom` and `updateParticipantName` events
- **Supabase authenticated users**: Name is automatically derived from Supabase user data and cannot be manually updated

## Testing Endpoints

- **REST API**: `http://localhost:${PORT}` (default: 3000)
- **WebSocket**: `/ws/rooms` namespace
- **Dev UI**: `/view` - Basic development testing interface
- **API Docs**: `/api-docs` - Interactive Swagger/OpenAPI documentation
- **Health**: `/health` - Service health check
- **Metrics**: `/metrics` - System metrics and observability

## Common Patterns

### Adding New WebSocket Events

1. Add event handler in `RoomGateway` with `@SubscribeMessage('eventName')`
2. Implement logic in `RoomService` if needed
3. Emit metrics event via `EventsService` if tracking is needed
4. Add metrics event type to `MetricsEvents` interface if new event type
5. Subscribe to event in `MetricsService` if tracking is needed

### Adding New REST Endpoints

1. Add endpoint in `RoomController` with NestJS HTTP decorators (`@Get`, `@Post`, `@Delete`, etc.)
2. Add Swagger decorators for API documentation:
   - `@ApiOperation({ summary: 'Description' })`
   - `@ApiResponse({ status: 200, description: 'Success case' })`
   - `@ApiParam()` / `@ApiBody()` for parameters
3. Implement validation using DTOs if needed
4. Add proper error handling with `HttpException` and status codes
5. Test endpoint via `/api-docs` Swagger interface
6. Update CLAUDE.md documentation if it's a significant addition

### Adding New Metrics

1. Define event payload type in `events/metrics.events.ts`
2. Add to `MetricsEvents` union type
3. Emit event from service/gateway using `EventsService.emitMetricsEvent()`
4. Add listener in `MetricsService.setupEventListeners()`
5. Update metrics response structure in `types/metrics.types.ts` if needed
