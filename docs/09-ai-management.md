# AI Management

Admin CRUD screen for configuring AI agents that power the enterprise search chat system.

## Files

```
features/ai-management/
├── ai-management.component.ts     # Main component (~395 lines)
├── ai-management.component.html
├── ai-management.component.less
└── api/
    ├── ai-management.models.ts    # DTOs
    ├── ai-management-api.service.ts  # API service
    └── index.ts                   # Barrel export
```

## Models (`api/ai-management.models.ts`)

| Model | Purpose |
|-------|---------|
| `AIAgentDto` | Agent output: `id`, `name`, `description`, `systemPrompt`, `modelName`, `temperature`, `isActive`, etc. |
| `CreateAIAgentInput` | Create input DTO |
| `UpdateAIAgentInput` | Update input DTO (extends create + `id`) |

## API Service (`AIManagementApiService`)

| Method | Description |
|--------|-------------|
| `getAgents(params)` | Paginated agent list with search |
| `getAgent(id)` | Single agent by ID |
| `createAgent(input)` | Create new agent |
| `updateAgent(input)` | Update existing agent |
| `deleteAgent(id)` | Delete agent |
| `resetAgent(id)` | Reset agent to defaults |
| `resetAllAgents()` | Reset all agents |

## UI Features

- Paginated agent table with search filter
- Create/Edit dialog with tabbed Reactive Form (general info + prompt config)
- Delete with confirmation dialog
- Reset single / reset all agents
- Text truncation for long descriptions/prompts in table

## Usage by Other Features

`AIAgentDto` is imported by `SearchActionComponent` for agent mentions in the chat interface. Agents defined here power the search AI system.
