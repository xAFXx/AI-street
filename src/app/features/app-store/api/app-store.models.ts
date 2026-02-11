/**
 * App Store API Models
 *
 * Re-exports auto-generated types from the backend Swagger spec,
 * with Nexus-specific aliases and extensions where needed.
 *
 * To regenerate the base types: `npm run codegen`
 *
 * ─────────────────────────────────────────────────────
 * IMPORT STRATEGY:
 *   - Types that match the backend exactly → re-export from generated-types.ts
 *   - Types with different naming conventions → re-export with aliases
 *   - Nexus-only extensions (Phase 3+) → defined here, extending generated types
 * ─────────────────────────────────────────────────────
 */

import { PagedResult } from '../../../core/api-client';

// ==================== Re-exports from generated types ====================

// Enums — direct re-export (exact match with backend)
export {
    AppStatus,
    AuthenticationMethod,
    DataType,
    FieldTypes
} from './generated-types';

// DTOs — direct re-export (names match exactly)
export type {
    AdditionalInformationDto,
    AdditionalPropertyDto,
    AdditionalPropertyInputDto,
    AppAssignmentOutput,
    CreateAppInput,
    CreateOrEditAppInput,
    EntityDtoOfGuid,
    AppListDto
} from './generated-types';

// ==================== Re-exports with aliases ====================
// Backend uses different naming conventions than our Nexus API layer

import type {
    AppDefinitionOutputDto as GeneratedAppDefinitionDto,
    AppAssignmentListDto as GeneratedAppAssignmentDto,
    ListResultDtoOfAppListDto,
    ListResultDtoOfAppAssignmentListDto,
    AppListDto
} from './generated-types';

/**
 * App definition from the server catalog.
 * Re-exported from generated `AppDefinitionOutputDto` with alias.
 */
export type AppDefinitionDto = GeneratedAppDefinitionDto;

/**
 * Installed app assignment for a tenant.
 * Re-exported from generated `AppAssignmentListDto` with alias.
 */
export type AppAssignmentDto = GeneratedAppAssignmentDto;

// ==================== List result wrappers ====================

export interface ListResult<T> {
    items: T[];
}

export type ListResultOfAppListDto = ListResultDtoOfAppListDto;
export type ListResultOfAppAssignmentDto = ListResultDtoOfAppAssignmentListDto;
export type PagedAppListResult = PagedResult<AppListDto>;

// ==================== Nexus-only types ====================
// These types don't exist in the backend yet (Phase 3+ extensions)

/**
 * Custom setting for an app (tenant/channel scoped).
 * Maps to legacy IAppCustomSettingDto.
 */
export interface AppCustomSettingDto {
    id?: string;
    name: string;
    value?: string;
    organizationUnitId?: number;
    tenantId?: number;
    appId?: string;
    channelId?: string;
}

/**
 * Input for changing an app setting.
 * Maps to legacy IChangeAppSettingInput.
 */
export interface ChangeAppSettingInput {
    name: string;
    value?: string;
    organizationUnitId?: number;
    tenantId?: number;
    channelId?: string;
    appId?: string;
    useCache?: boolean;
}
