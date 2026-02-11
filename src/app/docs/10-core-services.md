# Core Services

Singleton services in `core/services/` providing cross-cutting functionality. All use `@Injectable({ providedIn: 'root' })` and `inject()`.

## Authentication

### `AuthService` (`auth.service.ts`)

Central auth service managing login, logout, token refresh, and session state.

| Member | Description |
|--------|-------------|
| `authState$` | `BehaviorSubject<AuthState>` — reactive auth state |
| `login(username, password)` | Token auth via `TokenAuthServiceProxy` |
| `logout()` | Clear tokens + API call |
| `refreshToken()` | Refresh access token |
| `fetchCurrentSession()` | Get ABP session info |
| `hasRole(role)` / `hasAnyRole(roles)` | Role checks |
| `storeTokens(result)` | Persist to `StorageService` |

Storage keys: `auth_token`, `refresh_token`, `token_expiry`, `user_info`

### `AuthProxiesService` (`auth-proxies.service.ts`)

Low-level HTTP proxies for ABP endpoints:
- `TokenAuthServiceProxy` — `/api/TokenAuth/Authenticate`
- `SessionServiceProxy` — `/api/services/app/Session/GetCurrentLoginInformations`

## AI Services

### `AiChatService` (`ai-chat.service.ts`, ~733 lines)

Full AI communication layer via OpenAI API.

| Method | Description |
|--------|-------------|
| `sendMessage(contextId, message)` | Send chat message |
| `sendMessageWithStreaming(contextId, message, onChunk)` | Streaming response |
| `analyzeFileWithVision(file, prompt)` | GPT-4 Vision for images/PDFs |
| `uploadFile(file)` | Upload to OpenAI Files API |
| `renderPdfToImages(file)` | PDF → PNG via pdfjs-dist |
| `proposeGlaMapping(ublData, mappings)` | AI-assisted GLA mapping |
| `setModel(model)` / `getModel()` | Model selection |
| `getContext(contextId, systemPrompt)` | Chat context management |
| `fetchWithRetry(url, options)` | Exponential backoff for rate limits |

### `AiChatHubService` (`ai-chat-hub.service.ts`)

SignalR wrapper specific to the AI chat hub. Connects to `{remoteServiceBaseUrl}/signalr-aichat` with `enc_auth_token` auth.

### `AiStatusService` (`ai-status.service.ts`)

Tracks AI service availability and health status. Used by sidebar for status indicator.

### `AiModelService` (`ai-model.service.ts`)

AI model CRUD — list, create, update models with capabilities and compatibility info.

### AI Chat Sub-Services

| Service | Purpose |
|---------|---------|
| `AiChatMessageService` | Message handling and formatting |
| `AiChatSessionService` | Session lifecycle management |
| `AiChatMetricsService` | Usage metrics and analytics |
| `AiChatTypingService` | Typing indicators |

## Data Services

### `SchemaService` (`schema.service.ts`, ~16KB)

JSON schema management — CRUD, property definitions, JSON Schema generation. Used by Document Management and Schema Editor.

### `DatasetService` (`dataset.service.ts`)

Dataset CRUD for AI Street input management.

### `AnalysisService` (`analysis.service.ts`)

Analysis execution and result management for AI Street.

### `SettingsService` (`settings.service.ts`)

Persistent key-value storage via localStorage. Used across features for state persistence (schemas, results, API keys, preferences).

### `StorageService` (`storage.service.ts`)

Low-level localStorage wrapper with JSON serialization.

## Infrastructure Services

### `SignalRService` (`signalr.service.ts`)

Generic, reusable SignalR hub wrapper:
- `connect(hubUrl, options)` — build + start connection
- `disconnect()` — graceful shutdown
- `connectionState` signal — reactive state tracking
- Built-in exponential backoff reconnect (1s → 30s, max 8 attempts)

### `AppConfigService` (`app-config.service.ts`)

Runtime config access — wraps `AppStoreService` for component consumption.

### `DebugLogService` (`debug-log.service.ts`)

Centralized debug logging with categories. Feeds `DebugLogPanelComponent`.

### `UserManagementService` (`user-management.service.ts`)

Local user state management (legacy). `User` model with roles. Being replaced by `AuthService` for API-backed auth.

### `TenantCustomizationService` (`tenant-customization.service.ts`)

Builds URLs for tenant-specific branding assets (logo). Uses `AppConsts.tenantId` (populated by `AppPreBootstrap` from `AbpUserConfiguration/GetAll`) and `AppConsts.remoteServiceBaseUrl`.

| Member | Description |
|--------|-------------|
| `tenantId` | Numeric tenant ID from ABP session |
| `tenantName` | Tenant name from URL subdomain |
| `getLogoUrl(skin)` | Returns full URL for tenant logo (`light` / `dark`) |


## API Services (Feature-Specific)

| Service | File | Feature |
|---------|------|---------|
| `TaxApiService` | `tax-api.service.ts` | Tax Management |
| `RegionLookupApiService` | `region-lookup-api.service.ts` | Region Lookup |
| `AiConnectionTestService` | `ai-connection-test.service.ts` | AI connectivity testing |

## Models (`core/models/`)

| File | Contents |
|------|----------|
| `ai-chat.models.ts` | `ChatConnectionState` enum, chat message types |
| `ai-model.model.ts` | AI model interfaces |
| `analysis.model.ts` | Analysis result interfaces |
| `dataset.model.ts` | Dataset interfaces |
| `region-lookup.model.ts` | BAG address, Leefbaarheid models |
