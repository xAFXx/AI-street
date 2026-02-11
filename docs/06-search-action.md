# Search & Action (Enterprise Search)

AI-powered enterprise search with conversational chat interface, SignalR real-time messaging, and multi-panel workspace.

## Files

```
features/app-store/apps/search-action/
├── search-action.component.ts     # Main component (~516 lines)
├── search-action.component.html
└── search-action.component.less
```

## Internal Interfaces

| Interface | Purpose |
|-----------|---------|
| `SearchSession` | Session: `id`, `name`, `createdAt`, `lastActivity`, `messageCount` |
| `SearchResult` | Result: `id`, `type` (work-item/document/email/image/json), `title`, `subtitle`, `icon`, `metadata` |
| `PanelState` | Panel config: `id` (chat/results/preview), `visible`, `size`, `isMaximized`, `isDetached`, position |

## Multi-Panel Layout

3 configurable panels:
- **Chat** — AI conversation interface with streaming responses
- **Results** — Search results with type icons
- **Preview** — Document/item preview

Panels can be toggled, maximized, and detached (floating windows).

## SignalR Integration

- `AiChatHubService` connects to backend AI chat hub
- `SignalRService` provides generic hub wrapper with auto-reconnect
- Hub URL: `{remoteServiceBaseUrl}/signalr-aichat`
- Auth: `enc_auth_token` query parameter (ABP legacy pattern)
- Connection state tracked via `ChatConnectionState` signal

## Agent Mentions

- `AgentMentionEditorComponent` allows `@agent` mentions in chat input
- Agents sourced from `AIManagementApiService`
- `AIAgentDto` model: agent definition with name, system prompt, capabilities

## Session Management

- Sessions stored in `localStorage`
- Create, select, delete, clear sessions
- Session history with message counts

## Service Dependencies

| Service | Purpose |
|---------|---------|
| `AiChatService` | OpenAI text/streaming completions |
| `AiChatHubService` | SignalR real-time messaging |
| `OnboardingDialogComponent` | API key setup on first use |
