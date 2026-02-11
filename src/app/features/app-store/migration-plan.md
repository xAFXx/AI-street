# Legacy DTOs vs Nexus App Models — Property Comparison

Comparison of legacy app DTOs (from NSwag-generated `service-proxies.ts`) with the new Nexus API DTOs ([app-store.models.ts](file:///m:/dev_apprx%202.0/ui/src/app/features/app-store/api/app-store.models.ts)) and the Nexus UI model ([app.model.ts](file:///m:/dev_apprx%202.0/ui/src/app/features/app-store/app.model.ts)).

---

## 1. Enums — Mismatched

### `AppStatus` (Legacy) vs `ServerAppStatus` (Nexus API)

| Legacy `AppStatus` | Nexus `ServerAppStatus` |
|---|---|
| `DEVELOPMENT = 0` | `Available = 0` |
| `TEST = 1` | `Installed = 1` |
| `ACCEPTANCE = 2` | `Disabled = 2` |
| `BETA = 3` | `Preview = 3` |
| `PRODUCTION = 4` | ❌ **Missing** |

> [!CAUTION]
> The enums represent **completely different concepts**. Legacy `AppStatus` is the DTAP lifecycle stage (Dev → Test → Acceptance → Beta → Production). Nexus `ServerAppStatus` is the install state (Available/Installed/Disabled/Preview). These must **not** be mapped 1-to-1.

### ✅ ~~`AuthenticationMethod` (Legacy) vs `ServerAuthenticationMethod` (Nexus API)~~ — DONE

> [!TIP]
> **Resolved.** Nexus now uses the exact legacy `AuthenticationMethod` enum with all 16 values and matching numeric IDs. `ServerAuthenticationMethod` has been removed.

---

## 2. App Definition — `IAppDefinitionOutputDto` vs `AppDefinitionDto`

| Property | Legacy `IAppDefinitionOutputDto` | Nexus `AppDefinitionDto` | Match? |
|---|---|---|---|
| `id` | `string` | `string` | ✅ |
| `title` | `string \| undefined` | `string` | ⚠️ Nexus is non-optional |
| `name` | `string \| undefined` | `string?` | ✅ |
| `description` | `string \| undefined` | `string?` | ✅ |
| `imageCSS` | `string \| undefined` | `string?` | ✅ |
| `iconUrl` | ❌ Missing | `string?` | 🆕 Nexus-only |
| `authentication` | `AuthenticationMethod` | `AuthenticationMethod` | ✅ |
| `baseUrl` | `string \| undefined` | `string?` | ✅ |
| `appDefinitionType` | `string \| undefined` | `string?` | ✅ |
| `availability` | `AppStatus` | `ServerAppStatus?` | ⚠️ Enum mismatch |
| `additionalProperties` | `string \| undefined` | `Record<string, string>?` | ❌ **Type mismatch** — legacy is serialized JSON string, Nexus is parsed object |
| `additionalDicProperties` | `Record<string, string>?` | ❌ Missing | ❌ **Missing in Nexus** |
| `applicationProperties` | ❌ Missing | `AdditionalPropertyDto[]?` | 🆕 Added in Nexus |
| `price` | `number` | `number` | ✅ |
| `category` | ❌ Missing | `string?` | 🆕 Phase 3 extension |
| `author` | ❌ Missing | `string?` | 🆕 Phase 3 extension |
| `tags` | ❌ Missing | `string?` | 🆕 Phase 3 extension |
| `version` | ❌ Missing | `string?` | 🆕 Phase 3 extension |
| `releaseNotes` | ❌ Missing | `string?` | 🆕 Phase 3 extension |
| `isFeatured` | ❌ Missing | `boolean?` | 🆕 Phase 3 extension |
| `screenshots` | ❌ Missing | `string?` | 🆕 Phase 3 extension |
| `menuPlacement` | ❌ Missing | `string?` | 🆕 Phase 3 extension |
| `hasManageScreen` | ❌ Missing | `boolean?` | 🆕 Phase 3 extension |

---

## 3. App List — `IAppListDto` vs `AppListDto`

| Property | Legacy `IAppListDto` | Nexus `AppListDto` | Match? |
|---|---|---|---|
| `id` | `string` | `string` | ✅ |
| `title` | `string \| undefined` | `string` | ⚠️ Nexus is non-optional |
| `name` | `string \| undefined` | `string?` | ✅ |
| `description` | `string \| undefined` | `string?` | ✅ |
| `imageCSS` | `string \| undefined` | `string?` | ✅ |
| `appStatus` | `AppStatus` | `ServerAppStatus?` | ⚠️ Enum mismatch |
| `baseUrl` | `string \| undefined` | `string?` | ✅ |
| `price` | `number` | `number` | ✅ |
| `authentication` | `AuthenticationMethod` | `ServerAuthenticationMethod` | ⚠️ Enum mismatch |
| `additionalDicProperties` | `Record<string, string>?` | ❌ Missing | ❌ **Missing in Nexus** |
| `creationTime` | `dayjs.Dayjs` | `string?` | ⚠️ Type mismatch (Dayjs → string) |
| `creatorUserId` | `number \| undefined` | `number?` | ✅ |
| `lastModificationTime` | `dayjs.Dayjs \| undefined` | `string?` | ⚠️ Type mismatch (Dayjs → string) |
| `lastModifierUserId` | `number \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |
| `isDeleted` | `boolean` | `boolean?` | ⚠️ Nexus made optional |
| `deleterUserId` | `number \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |
| `deletionTime` | `dayjs.Dayjs \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |

---

## 4. App Assignment — `IAppAssignmentListDto` vs `AppAssignmentDto`

| Property | Legacy `IAppAssignmentListDto` | Nexus `AppAssignmentDto` | Match? |
|---|---|---|---|
| `id` | `string` | `string` | ✅ |
| `appAssignmentId` | `string` | `string` | ✅ |
| `appId` | `string` | `string` | ✅ |
| `title` | `string \| undefined` | `string` | ⚠️ Nexus non-optional |
| `name` | `string \| undefined` | `string?` | ✅ |
| `description` | `string \| undefined` | `string?` | ✅ |
| `imageCSS` | `string \| undefined` | `string?` | ✅ |
| `baseUrl` | `string \| undefined` | `string?` | ✅ |
| `authentication` | `AuthenticationMethod` | `ServerAuthenticationMethod` | ⚠️ Enum mismatch |
| `appStatus` | `AppStatus` | `ServerAppStatus` | ⚠️ Enum mismatch |
| `applicationProperties` | `IAdditionalPropertyDto[]?` | `AdditionalPropertyDto[]?` | ✅ (see §6) |
| `additionalInformation` | `IAdditionalInformationDto[]?` | `AdditionalPropertyDto[]?` | ⚠️ **Retyped** — legacy uses `IAdditionalInformationDto`, Nexus uses same DTO as properties |
| `additionalDicProperties` | `Record<string, string>?` | `Record<string, string>?` | ✅ |
| `creationTime` | `dayjs.Dayjs` | ❌ Missing | ❌ **Missing in Nexus** |
| `creatorUserId` | `number \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |
| `lastModificationTime` | `dayjs.Dayjs \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |
| `lastModifierUserId` | `number \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |
| `isDeleted` | `boolean` | ❌ Missing | ❌ **Missing in Nexus** |
| `deleterUserId` | `number \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |
| `deletionTime` | `dayjs.Dayjs \| undefined` | ❌ Missing | ❌ **Missing in Nexus** |

---

## 5. Create/Edit — `ICreateOrEditAppInput` vs `CreateOrEditAppInput`

| Property | Legacy `ICreateOrEditAppInput` | Nexus `CreateOrEditAppInput` | Match? |
|---|---|---|---|
| `id` | `string \| undefined` | `string?` | ✅ |
| `title` | `string` | `string` | ✅ |
| `name` | `string \| undefined` | `string?` | ✅ |
| `description` | `string \| undefined` | `string?` | ✅ |
| `imageCSS` | `string \| undefined` | `string?` | ✅ |
| `appStatus` | `AppStatus` | `ServerAppStatus` | ⚠️ Enum mismatch |
| `baseUrl` | `string \| undefined` | `string?` | ✅ |
| `additionalProperties` | `Record<string, string>?` | `Record<string, string>?` | ✅ |
| `applicationProperties` | `IAdditionalPropertyInputDto[]?` | `AdditionalPropertyDto[]?` | ⚠️ Interface mismatch (see §6) |
| `price` | `number` | `number` | ✅ |
| `authentication` | `AuthenticationMethod` | `ServerAuthenticationMethod` | ⚠️ Enum mismatch |

---

## 6. `IAdditionalPropertyDto` vs `AdditionalPropertyDto`

| Property | Legacy `IAdditionalPropertyDto` | Nexus `AdditionalPropertyDto` | Match? |
|---|---|---|---|
| `id` | `string` (required) | `string?` | ⚠️ Nexus made optional |
| `name` | `string \| undefined` | `string` (required) | ⚠️ Reversed optionality |
| `defaultValue` | `string \| undefined` | `string?` | ✅ |
| `type` | `FieldTypes` (enum) | `number?` | ⚠️ **Enum lost** — should use `FieldTypes` |
| `linkedToChannel` | `boolean` | `boolean?` | ⚠️ Nexus made optional |
| `required` | `boolean` | `boolean?` | ⚠️ Nexus made optional |
| `useCache` | `boolean` | `boolean?` | ⚠️ Nexus made optional |
| `isOwner` | `boolean` | `boolean?` | ⚠️ Nexus made optional |
| `value` | ❌ Missing | `string?` | 🆕 Nexus-only |
| `channelId` | ❌ Missing | `string?` | 🆕 Nexus-only |

> [!IMPORTANT]
> Legacy `IAdditionalInformationDto` is a **distinct** type with properties `{name, dataType: DataType, value}`. Nexus merged it into `AdditionalPropertyDto`, losing the `dataType: DataType` enum.

---

## 7. Nexus `App` UI Model — Properties with No Backend Equivalent

These properties exist **only** in the Nexus UI model and have **no legacy DTO** counterpart:

| Nexus `App` Property | Type | Notes |
|---|---|---|
| `iconUrl` | `string` | UI-only; legacy uses `imageCSS` |
| `type` | `'static' \| 'dynamic'` | UI-side classification only |
| `category` | `string` | 🆕 Phase 3 backend extension needed |
| `author` | `string` | 🆕 Phase 3 backend extension needed |
| `tags` | `string[]` | 🆕 Phase 3 backend extension needed |
| `currentVersion` | `AppVersion` | Legacy has no version tracking |
| `pricing` | `AppPricing` | Rich model; legacy only has flat `price: number` |
| `parameters` | `AppParameter[]` | Rich typed params; legacy uses `applicationProperties` |
| `settings` | `AppSetting[]` | UI-only concept |
| `usesApiConnection` | `boolean` | UI-only flag |
| `apiConnection` | `ApiConnection` | UI-only; legacy has separate `ApiConnectionSettingDto` |
| `processDefinitions` | `ProcessDefinition[]` | UI-only concept |
| `installStatus` | `AppInstallStatus` | Client-side enum (string), different from `AppStatus` |
| `installedVersion` | `string` | No legacy equivalent |
| `installedAt` | `Date` | No legacy equivalent |
| `lastUsedAt` | `Date` | No legacy equivalent |
| `startScreen` | `string` | UI routing — no backend concept |
| `screenshots` | `string[]` | 🆕 Phase 3 backend extension needed |
| `isFeatured` | `boolean` | 🆕 Phase 3 backend extension needed |
| `menuPlacement` | `MenuPlacement` | UI-only enum |
| `hasManageScreen` | `boolean` | UI-only flag |
| `menuItems` | `MenuItem[]` | UI-only injection |
| `serverAppId` | `string?` | Bridge to server entity ID |
| `serverAssignmentId` | `string?` | Bridge to server assignment ID |
| `internalName` | `string?` | Bridge to server `name` field |

---

## Summary of Critical Issues

> [!CAUTION]
> ### Action Required Before Phase 4

1. ~~**AuthenticationMethod alignment**~~ ✅ Done — Nexus uses the exact legacy enum
1. **AppStatus alignment** — `ServerAppStatus` must be aligned with legacy `AppStatus` values or use explicit mapping in the mapper functions
2. **`additionalDicProperties`** — Missing from `AppListDto` and `AppDefinitionDto` in Nexus
3. **Audit fields** — Missing from `AppAssignmentDto` in Nexus (`creationTime`, `lastModificationTime`, `isDeleted`, etc.)
4. **`additionalProperties` type** — Legacy `IAppDefinitionOutputDto` has it as `string` (JSON), while Nexus has it as `Record<string, string>` — deserialization mismatch
5. **`IAdditionalInformationDto`** — Merged into wrong type; `dataType: DataType` enum lost
