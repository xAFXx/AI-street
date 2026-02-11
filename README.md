# APPRX 2.0 — AI Street

**AI Street** is the next-generation enterprise platform by APPRX that brings AI-powered automation, compliance reporting, and intelligent data management into a single, unified workspace.

## What It Does

| Capability | Description |
|------------|-------------|
| **App Nexus** | A modular marketplace where organisations install only the tools they need |
| **True North** | AI-assisted compliance reporting — frameworks, audit standards, and guided report wizards |
| **AI Street Hub** | Manage AI models, datasets, and processing pipelines from one dashboard |
| **Enterprise Search** | Natural-language search across all connected data sources with AI chat |
| **Document Management** | Upload, extract, and classify documents using AI vision |
| **VDB Manager** | Inspect and manage vector database collections powering semantic search |

## Key Highlights

- **Multi-tenant SaaS** — each customer gets an isolated, branded workspace
- **AI-first** — OpenAI GPT-4 Vision, streaming chat, and SignalR real-time updates built in
- **Modular** — apps are installed per-tenant; only active features load
- **Enterprise-grade** — role-based access, audit trails, Kubernetes deployment via Helm

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, PrimeNG v21, Less |
| Backend | ASP.NET ABP Framework (multi-tenant) |
| AI | OpenAI API (GPT-4 Vision, streaming) |
| Real-time | SignalR |
| Deployment | Docker + Kubernetes (Helm) |

## Documentation

| Document | Description |
|----------|-------------|
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Setup, build configs, proxy, deployment, and code generation |
| [Architecture Overview](docs/00-architecture.md) | Tech stack, project structure, routing, state management |
| [Documentation Index](docs/INDEX.md) | Feature-level context docs for all modules |

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev-apprx
```

See the [Developer Guide](docs/DEVELOPER_GUIDE.md) for full setup instructions, build configurations, and deployment details.

## License

Proprietary — © APPRX. All rights reserved.
