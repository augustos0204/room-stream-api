# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RoomStream is a real-time WebSocket API built with NestJS and Socket.IO for creating and managing chat rooms. The project includes both a **robust backend API** and a **complete web platform** at `/platform` with dashboard, chat interface, application management, and more.

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
  - `RoomService`: Room operations and business logic (uses MemoryService for storage)
  - `RoomGateway`: WebSocket event handlers using Socket.IO
  - `RoomController`: REST API endpoints
    - `POST /room` - Create new room
    - `GET /room` - List all rooms
    - `GET /room/:id` - Get specific room
    - `DELETE /room/:id` - Delete room
    - `GET /room/:id/messages` - Get all room messages
    - `GET /room/:id/participants` - Get all room participants

- **ApplicationModule** - Application/API Key management
  - `ApplicationService`: CRUD operations for applications (stored in Supabase)
  - `ApplicationController`: REST API endpoints (requires Supabase auth)
    - `POST /application` - Create new application
    - `GET /application` - List user's applications
    - `GET /application/:id` - Get specific application
    - `PATCH /application/:id` - Update application
    - `DELETE /application/:id` - Delete application
    - `POST /application/:id/regenerate-key` - Regenerate API key
  - API Key format: `app_{64 random hex characters}`

- **MemoryModule** - Storage abstraction layer (Global module)
  - `MemoryService`: Automatic storage adapter selection (Redis or in-memory)
  - `InMemoryStorageAdapter`: Volatile in-memory storage using Maps
  - `RedisStorageAdapter`: Persistent storage using Redis
  - `IStorageAdapter`: Interface contract for storage implementations

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

- **PlatformModule** - Web platform (SPA)
  - `PlatformController`: Routes for web interface
  - `PagesService`: File-based routing for SPA pages
  - Serves from `src/platform/`
  - **Pages** (SPA, rendered inside `index.ejs`):
    - `dashboard` - Main dashboard
    - `rooms` - Room listing and management
    - `chat` - Chat interface
    - `applications` - Application/API Key management
    - `profile` - User profile
    - `login` - Authentication
    - `about` - About page (GitHub integration)
    - `guide` - Documentation/guide
  - **Standalone pages** (rendered directly):
    - `landing` - Landing page
  - **Error pages**: `403.ejs`, `404.ejs`, `500.ejs`
  - **Assets**: `/platform/assets/styles/`, `/platform/assets/scripts/`, `/platform/assets/media/`

- **GithubModule** - GitHub API integration
  - `GithubService`: Fetches GitHub user data, repos, social accounts
  - `GithubController`: REST endpoint `/api/github/profile`
  - In-memory cache with 5-minute TTL
  - Configuration: `GITHUB_CACHE_ENABLED` env var

- **SupabaseModule** - Supabase integration
  - `SupabaseService`: JWT token validation and user authentication
  - Used for both REST and WebSocket authentication
  - Also used by ApplicationModule for database operations

### Data Flow

1. **WebSocket Events** → RoomGateway handles Socket.IO events
2. **Business Logic** → RoomService manages room state (via MemoryService)
3. **Event Emission** → Service operations emit `metrics:*` events via EventsService
4. **Metrics Collection** → MetricsService listens to events and updates counters
5. **REST API** → RoomController provides HTTP endpoints for room management

### State Management

**Storage Abstraction**: The application uses a flexible storage architecture via `MemoryModule`:

- **MemoryModule** - Storage abstraction layer
  - `MemoryService`: Main service that automatically selects storage adapter
  - `IStorageAdapter`: Interface defining storage operations contract
  - **Adapters**:
    - `InMemoryStorageAdapter`: Default fallback, uses JavaScript Maps (volatile)
    - `RedisStorageAdapter`: Optional persistent storage using Redis

**Adapter Selection** (automatic):
- If `REDIS_URL` environment variable is set → Uses Redis adapter
- If `REDIS_URL` is not set → Uses in-memory adapter (default)

**Data Storage Structure**:
- Each `Room` contains:
  - `participants`: `string[]` - **hybrid keys** (userId for Supabase users, applicationId for apps, clientId for anonymous)
  - `participantNames`: `Map<string, string | null>` - hybrid key to name mapping
  - `participantSupabaseUsers`: `Map<string, SupabaseUserData | null>` - Supabase user data by hybrid key
  - `messages`: `RoomMessage[]` - message history (includes optional `userId` field)

**Hybrid Key System**:
- **Supabase authenticated users**: Use `userId` (Supabase User ID) as primary key
  - Persistent across sessions and reconnections
  - Key format: UUID from Supabase (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- **Applications**: Use `applicationId` from validated API key
  - Key format: UUID from applications table
- **Anonymous users**: Use `clientId` (Socket.IO connection ID) as key
  - Volatile, regenerated on each reconnection
  - Key format: Socket.IO ID (e.g., `"xW3kJ9pL2mN8qR5t"`)
- Helper function: `getParticipantKey(clientId, userId)` returns `userId || clientId`
- All storage operations prioritize `userId` when available

**Important Notes**:
- With in-memory storage: state is lost on server restart
- With Redis storage: state persists across server restarts
- Storage adapter is chosen once at application startup based on `REDIS_URL`
- Supabase users maintain their data across reconnections (persistent userId)
- Anonymous users lose their data on reconnection (volatile clientId)

### WebSocket Configuration

- **Namespace**: `/ws/rooms` (configurable via `WEBSOCKET_NAMESPACE` env var)
- **Transports**: websocket, polling
- **CORS**: Configured via `CORS_ORIGIN` env var (default: `*` for development)
- **Events**: `joinRoom`, `leaveRoom`, `emit`, `sendMessage`, `getRoomInfo`, `updateParticipantName`
- **Server Events**: `joinedRoom`, `userJoined`, `userLeft`, `newMessage`, `roomInfo`, `participantNameUpdated`, `roomDeleted`, `error`

### Client Lifecycle

The WebSocket gateway supports **three types of connections**:

1. **Application Connection** (via `auth.applicationKey`):
   - Validates API key via `ApplicationService.validateApiKey()`
   - Stores application data in `client.data.application`
   - Uses `applicationId` as participant key

2. **Supabase User Connection** (via `auth.token` or `Authorization` header):
   - Validates JWT via `SupabaseService`
   - Starts periodic token validation timer (`TOKEN_VALIDATION_INTERVAL`)
   - Stores user data in `client.data.user`
   - Uses `userId` as participant key

3. **Anonymous Connection**:
   - Allowed if no authentication is configured
   - Uses Socket.IO `clientId` as participant key

**Connection Flow**:
1. Client connects to `/ws/rooms` namespace
2. Gateway validates authentication (application key, Supabase token, or API key)
3. On success: triggers `metrics:client-connected`
4. Client emits `joinRoom` → joins Socket.IO room + added to RoomService participants
5. Disconnection → automatically removed from all rooms (see `handleDisconnect`)

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
- Configuration in `main.ts`
- Packages: `@nestjs/swagger`, `swagger-ui-express`

### Tags
- `rooms` - Chat room management endpoints
- `applications` - Application/API Key management endpoints
- `health` - Service health check
- `metrics` - System monitoring and observability

## Important Implementation Details

### ID Generation

- Room IDs: `room_{timestamp}_{random9chars}` (see `RoomService.generateRoomId`)
- Message IDs: `msg_{timestamp}_{random9chars}` (see `RoomService.generateMessageId`)
- Application API Keys: `app_{64 random hex characters}` (see `ApplicationService.generateApiKey`)

### Participant Name System

- Participants can optionally provide a name when joining
- Names can be updated via `updateParticipantName` event (anonymous users only)
- Names are stored in `participantNames` Map and broadcast to room on updates
- Supabase authenticated users: Name derived from user data (cannot be manually updated)
- Applications: Name derived from application name

### Message History

- All messages are kept in storage (in-memory or Redis)
- When joining, clients receive last 10 messages (see `joinedRoom` event)
- Full message history available via `GET /room/:id/messages` REST endpoint
- Messages include `event` field to differentiate between `message` and `emit` events

### Room Deletion

- Rooms can be deleted via REST API (`DELETE /room/:id`) or by service method
- `RoomService.deleteRoom(roomId)` removes room and emits `metrics:room-deleted` event
- **Broadcasts `roomDeleted` event** to all clients in the room via WebSocket
- Active participants receive notification before being disconnected from room

### Participant Information Retrieval

- `RoomService.getParticipantsWithNames(roomId)` returns array of `{clientId, name, supabaseUser}` objects
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

## Application Module

The ApplicationModule allows users to create and manage applications that can connect to the WebSocket API using API keys.

### Features

- CRUD operations for applications
- Secure API key generation (`app_{64 hex chars}`)
- API key regeneration
- Applications stored in Supabase (`applications` table)
- Per-user isolation (users can only see their own applications)

### Database Schema (Supabase)

```sql
-- applications table
id: uuid (primary key)
name: string
description: string | null
key: string (unique, the API key)
created_by: uuid (references auth.users)
created_at: timestamp
updated_at: timestamp
is_active: boolean
```

### WebSocket Connection with Application Key

```javascript
const socket = io('/ws/rooms', {
  auth: { applicationKey: 'app_your64charshexkey...' }
});
```

## GitHub Integration

The GithubModule provides GitHub API integration for the about page.

### Endpoints

- `GET /api/github/profile` - Returns GitHub user data, repos, and social accounts

### Features

- Fetches user profile, repositories, and social accounts
- Calculates top programming languages from repos
- In-memory cache with 5-minute TTL (configurable via `GITHUB_CACHE_ENABLED`)
- Graceful error handling (returns null on API errors)

### Configuration

- `GITHUB_CACHE_ENABLED` - Enable/disable cache (default: `true`)
- GitHub username hardcoded in `PlatformController` (`GITHUB_USERNAME` constant)

## Redis Storage (Optional)

The application supports optional Redis storage for data persistence. By default, it uses in-memory storage which is lost on restart.

### Enabling Redis

Set the `REDIS_URL` environment variable:

```bash
# Local Redis
REDIS_URL=redis://localhost:6379

# Redis with authentication
REDIS_URL=redis://username:password@host:port

# Redis with database selection
REDIS_URL=redis://localhost:6379/0
```

### Redis Key Structure (Hybrid System)

When Redis is enabled, data is stored using the following key patterns with **hybrid keys**:

- `rooms` - Set of all room IDs
- `room:{roomId}` - Room metadata (JSON)
- `room:{roomId}:participants` - Set of participant **hybrid keys** (userId, applicationId, or clientId)
- `room:{roomId}:participant:{key}:name` - Participant name (string)
- `room:{roomId}:participant:{key}:supabase` - Participant Supabase user data (JSON)
- `room:{roomId}:messages` - List of messages (JSON array)

### Implementation Details

**Adapter Architecture**:
- `MemoryService` automatically selects the appropriate storage adapter on startup
- Selection is based solely on the presence of `REDIS_URL` environment variable
- Both adapters implement the same `IStorageAdapter` interface

**Redis Adapter Features**:
- Automatic reconnection with exponential backoff (max 2 seconds)
- Maximum 3 retry attempts per request
- Error handling and logging for all Redis operations
- Graceful degradation on Redis connection issues

**Storage Guarantees**:
- **Without Redis**: Data is volatile, lost on restart (development/testing)
- **With Redis**: Data persists across restarts (production/staging)
- No migration needed between storage types (data is isolated)

### Debugging Redis Storage

Check which adapter is active in the logs on startup:

```
[MemoryService] Using Redis storage adapter
[RedisStorageAdapter] Redis storage adapter initialized successfully
```

Or:

```
[MemoryService] Using in-memory storage adapter (REDIS_URL not configured)
[InMemoryStorageAdapter] In-memory storage adapter initialized
```

## Configuration

Environment variables (see `.env.example`):
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - CORS allowed origin (default: `*`)
- `WEBSOCKET_NAMESPACE` - Socket.IO namespace (default: `/ws/rooms`)
- `API_KEY` - Global API key for authentication (optional)
- `SUPABASE_URL` - Supabase project URL (optional)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (optional)
- `REDIS_URL` - Redis connection URL (optional)
- `TOKEN_VALIDATION_INTERVAL` - Supabase token validation interval in ms (default: 300000)
- `GITHUB_CACHE_ENABLED` - Enable GitHub API cache (default: `true`)
- `APP_NAME` - Application name (used in Docker deployments)
- `APP_VERSION` - Application version (used in Docker deployments)

## Security & Authentication

### Authentication Hierarchy

The system supports **multiple authentication methods** with the following priority:

1. **Application Key** (`auth.applicationKey` for WebSocket):
   - Format: `app_{64 hex characters}`
   - Validates against Supabase `applications` table
   - Used for server-to-server or app connections

2. **Supabase JWT Token** (`auth.token` or `Authorization: Bearer`):
   - Validates via `SupabaseService.validateToken()`
   - Starts periodic validation timer
   - Full user data available

3. **Global API Key** (`auth.apiKey` or `x-api-key` header):
   - Simple string comparison with `process.env.API_KEY`
   - Used for simple API access control

4. **Anonymous** (no authentication):
   - Allowed only if no authentication is configured

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
```

**WebSocket Authentication:**
```javascript
// Global API Key
const socket = io('/ws/rooms', {
  auth: { apiKey: 'your-api-key' }
});

// Application Key
const socket = io('/ws/rooms', {
  auth: { applicationKey: 'app_your64hexchars...' }
});

// Supabase Token
const socket = io('/ws/rooms', {
  auth: { token: 'supabase-jwt-token' }
});
```

### Supabase Authentication

**Configuration:**
- Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables to enable
- Get credentials from: https://app.supabase.com/project/_/settings/api

**Token Validation:**
- Initial validation on connection
- Periodic validation every `TOKEN_VALIDATION_INTERVAL` ms (default: 5 minutes)
- Expired tokens trigger automatic disconnection

**User Data Flow:**
1. Token is validated during WebSocket connection
2. User data is stored in `client.data.user`
3. Display name is set from: `user.email` → `user.user_metadata.name` → `'User'`
4. Supabase users **cannot** manually update their participant name

### Implementation Details

- Guards: `src/common/guards/api-key.guard.ts`, `src/common/guards/supabase-auth.guard.ts`
- Bypass guards with `@Public()` decorator
- WebSocket validation in `RoomGateway.handleConnection()`

## Configuração Opcional do Supabase - Garantias de Segurança

### Proteções Implementadas

O código foi projetado para **nunca causar erros** quando Supabase não estiver configurado:

1. **SupabaseService - Early Return Pattern**: Retorna `null` quando não configurado
2. **RoomGateway - Validação Condicional**: Timer só inicia se Supabase habilitado
3. **Guards - Bypass Automático**: Permite acesso quando não configurado
4. **Método Seguro: `getUserSafely()`**: Versão segura de `validateToken`

### Checklist de Desenvolvimento

Ao adicionar código que usa Supabase:
- [ ] Use `isEnabled()` antes de chamar métodos do SupabaseService
- [ ] Adicione verificações defensivas em métodos que usam `client.data.user`
- [ ] Teste o código **com e sem** Supabase configurado
- [ ] Use `getUserSafely()` em vez de `validateToken()` quando possível

📖 **[docs/SUPABASE_OPTIONAL_CONFIGURATION.md](docs/SUPABASE_OPTIONAL_CONFIGURATION.md)**

## Testing Endpoints

- **REST API**: `http://localhost:${PORT}` (default: 3000)
- **WebSocket**: `/ws/rooms` namespace
- **Platform**: `/platform` - Full web platform with dashboard, chat, applications, etc.
- **API Docs**: `/api-docs` - Interactive Swagger/OpenAPI documentation
- **Health**: `/health` - Service health check
- **Metrics**: `/metrics` - System metrics and observability
- **GitHub API**: `/api/github/profile` - GitHub profile data

### Platform Pages

| Route | Description |
|-------|-------------|
| `/platform` | Dashboard (default) |
| `/platform/rooms` | Room management |
| `/platform/chat` | Chat interface |
| `/platform/applications` | Application/API Key management |
| `/platform/profile` | User profile |
| `/platform/login` | Authentication |
| `/platform/about` | About page (GitHub integration) |
| `/platform/guide` | Documentation/guide |
| `/platform/landing` | Landing page (standalone) |

## Error Handling

The application has a comprehensive error handling system with custom error pages for browser requests:

### Exception Filters

**Global Exception Filter**: `AllExceptionsFilter` (applied globally in `main.ts`)
- Catches **ALL** exceptions (both HTTP and non-HTTP errors)
- Automatically renders custom error pages for browser requests to `/platform` routes
- Returns JSON responses for API routes
- Handles EJS parsing errors, database errors, and other unexpected exceptions

**Error Pages** (located in `src/platform/public/`):
- `404.ejs` - Not Found (404)
- `403.ejs` - Forbidden (403)
- `500.ejs` - Internal Server Error (500)

**Behavior**:
- Browser requests to `/platform/*` routes → Renders custom EJS error page
- API routes (e.g., `/room`, `/health`) → Returns JSON error response
- Error pages include: status code, error message, timestamp, and path

**Development vs Production Mode**:
- **Development** (`NODE_ENV !== 'production'`): Shows full error details with `[DEV]` badge
- **Production**: Hides technical details for security

**Implementation**:
- Filter: `src/common/filters/all-exceptions.filter.ts`
- API route detection: `src/common/config/api-routes.config.ts`
- Applied in: `src/main.ts` with `app.useGlobalFilters(new AllExceptionsFilter())`

## Common Patterns

### Adding New WebSocket Events

1. Add event handler in `RoomGateway` with `@SubscribeMessage('eventName')`
2. Implement logic in `RoomService` if needed
3. Emit metrics event via `EventsService` if tracking is needed
4. Add metrics event type to `MetricsEvents` interface if new event type
5. Subscribe to event in `MetricsService` if tracking is needed

### Adding New REST Endpoints

1. Add endpoint in Controller with NestJS HTTP decorators (`@Get`, `@Post`, `@Delete`, etc.)
2. Add Swagger decorators for API documentation:
   - `@ApiOperation({ summary: 'Description' })`
   - `@ApiResponse({ status: 200, description: 'Success case' })`
   - `@ApiParam()` / `@ApiBody()` for parameters
3. Implement validation using DTOs if needed
4. Add proper error handling with `HttpException` and status codes
5. Test endpoint via `/api-docs` Swagger interface
6. Update CLAUDE.md documentation if significant

### Adding New Platform Pages

1. Create EJS file in `src/platform/pages/{pageName}.ejs`
2. Page will be automatically available at `/platform/{pageName}`
3. For SPA pages, content renders inside `pages/index.ejs` layout
4. For standalone pages, add to `PagesService.hasStandalonePage()` check
5. Update `PagesService.getValidPageNames()` if needed

### Adding New Metrics

1. Define event payload type in `events/metrics.events.ts`
2. Add to `MetricsEvents` union type
3. Emit event from service/gateway using `EventsService.emitMetricsEvent()`
4. Add listener in `MetricsService.setupEventListeners()`
5. Update metrics response structure in `types/metrics.types.ts` if needed
