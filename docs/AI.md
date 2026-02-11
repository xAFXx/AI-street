# AI Agent Hooks

This document describes the special phrases and patterns that AI coding agents recognize in this project. These hooks trigger automatic behaviors like loading context, resolving test environments, and keeping documentation current.

All hooks are defined as rules in the [global user rules](file:///.agent/rule-book/RULES.md) and surfaced via [SKILL.md](file:///.agent/rule-book/SKILL.md).

---

## 1. Context Loading — "I want to work on [feature]"

**Trigger:** Any message mentioning a feature area, e.g.:

```
I want to work on True North
```

**What happens:**

1. The agent reads `docs/INDEX.md` to find the matching keyword(s).
2. It reads each listed doc file **in order** before doing any work.

### Examples

| You say | Keywords matched | Docs loaded |
|---------|-----------------|-------------|
| *"I want to work on True North"* | `true-north` | `00-architecture.md` → `03-true-north.md` → `10-core-services.md` |
| *"I want to work on ai-management"* | `ai-management` | `00-architecture.md` → `09-ai-management.md` → `10-core-services.md` |
| *"I want to work on the VDB page"* | `vdb` | `00-architecture.md` → `04-vdb-manager.md` |
| *"Let's update the app store"* | `app-nexus` / `app-store` | `00-architecture.md` → `01-app-nexus.md` → `11-shared-components.md` |
| *"Fix a search-action bug"* | `search-action` | `00-architecture.md` → `06-search-action.md` → `10-core-services.md` → `09-ai-management.md` |
| *"Update proxy config"* | `proxy` | `DEVELOPER_GUIDE.md` → `00-architecture.md` |

> [!TIP]
> The full keyword → docs table is in [INDEX.md](file:///docs/INDEX.md). Add new rows there when you create new feature docs.

**Defined in:** Rule 4 (Auto-Load Context Docs)

---

## 2. Test Contexts — "The test context is [tenantName]"

**Trigger:** A message specifying a deployed test environment, e.g.:

```
The test context is datawhisperers
```

**What happens:**

1. The agent reads `docs/DEVELOPER_GUIDE.md` → "Test Contexts" section.
2. It looks up the tenant name to get the **deployed frontend URL** and **login credentials**.
3. It opens the **deployed URL** directly in the browser (NOT localhost).
4. It logs in with the listed credentials and proceeds with testing.

### Important

- The agent does **NOT** modify `proxy.conf.js` or `appconfig-*.json`.
- Multiple agents can test different tenants in parallel without conflicts.

**Defined in:** Rule 6 (Resolve Test Contexts)

---

## 3. Doc Maintenance — automatic

**Trigger:** Automatic — any time agent makes changes that affect documented details.

**What happens:** The agent updates the relevant doc in `docs/` before finishing:

| Change type | Doc to update |
|-------------|--------------|
| Added/removed route | `00-architecture.md` |
| Added/removed service | `10-core-services.md` |
| Added/removed shared component | `11-shared-components.md` |
| Changed build/proxy/deployment | `DEVELOPER_GUIDE.md` |
| Changed app behavior | The app's own doc (e.g. `03-true-north.md`) |
| Added new app | `01-app-nexus.md` + new feature doc |

**Defined in:** Rule 5 (Keep Context Docs Up to Date)

---

## 4. Workflow Slash Commands

Slash commands trigger step-by-step workflows stored in `.agent/workflows/`.

### `/integrate-api` — Connect a backend API endpoint

**Trigger:**

```
/integrate-api
```

**What happens:**

1. Inspect the Swagger spec to identify the controller tag and endpoint paths.
2. Add the tag to `codegen/codegen.config.mjs` and run `npm run codegen` to generate TypeScript types.
3. Create a feature API service using `BaseApiService` with the ABP response wrapper pattern.
4. Wire the service into the component.
5. Verify the call in the browser's Network tab.

### Examples

| You say | What happens |
|---------|-------------|
| *"/integrate-api"* | Agent walks through the full Swagger → codegen → service → component pipeline |
| *"I need to call the VDB/GetVirtualDbs endpoint"* | Agent recognizes API work, may suggest using this workflow |
| *"Connect the AiManagement controller"* | Keywords `api` / `connectapi` in INDEX.md also load relevant context docs |

**Defined in:** `.agent/workflows/integrate-api.md`

---

### `/create-nexus-app` — Scaffold a new App Nexus application

**Trigger:**

```
/create-nexus-app
```

**What happens:**

1. Create the folder structure under `src/app/features/app-store/apps/{app-name}/`.
2. Scaffold the standalone component with `OnPush` + Signals.
3. Create the API service (if needed).
4. Register the app in `AppNexusService.getDemoApps()`.
5. Add the lazy-loaded route in `app.routes.ts`.

**Defined in:** `.agent/workflows/create-nexus-app.md`

---

### `/browser-testing` — Run browser tests on a deployed environment

**Trigger:**

```
/browser-testing
```

**What happens:**

1. Navigate to the deployed test URL (e.g. `https://dev_99999999.plattform.nl`).
2. Log in with the test credentials.
3. Navigate to the feature path and take screenshots.
4. Check console logs for errors.

> [!NOTE]
> For tenant-specific testing, use the "test context" hook (section 2) instead. This workflow uses a hardcoded default environment.

**Defined in:** `.agent/workflows/browser-testing.md`

---

## Where to modify these hooks

| What | File |
|------|------|
| Add a new feature keyword → docs mapping | `docs/INDEX.md` |
| Add/change agent behavior rules | `.agent/rule-book/RULES.md` |
| Add/change workflow slash commands | `.agent/workflows/{name}.md` |
| Change the global memory rules (applies cross-conversation) | Global user rules in IDE settings |
| Add test context tenants | `docs/DEVELOPER_GUIDE.md` (Test Contexts section) |
