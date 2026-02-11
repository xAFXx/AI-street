/**
 * Auto-generated TypeScript types for Virtual Database
 *
 * Generated from: http://localhost:5000/swagger/Apps/swagger.json
 * Generated at:   2026-02-10T15:26:59.463Z
 * Tags:           VDB
 *
 * ⚠️  DO NOT EDIT MANUALLY — regenerate with: npm run codegen
 */

/* eslint-disable */

export enum VDBPermissionLevel {
    None = 0,
    Read = 1,
    Write = 2,
    Full = 3
}

export interface AddPropertyToVirtualDbInputDto {
    virtualDbName?: string | null;
    virtualDbKey?: string | null;
    newProperty?: string | null;
    ttl?: number | null;
}

export interface CreateOrUpdateVDBPermissionInputDto {
    userid?: number;
    vdbName?: string | null;
    permissionLevel?: VDBPermissionLevel;
}

export interface CreateOrUpdateVDBPushService {
    key?: string | null;
    database?: string | null;
    objectMapping?: unknown | null;
}

export interface ExportToCsvInput {
    vdbName?: string | null;
    notificationGroup?: string | null;
    emailAddress?: string | null;
}

export interface PagedResultDtoOfVirtualDbDto {
    items?: VirtualDbDto[] | null;
    totalCount?: number;
}

export interface PagedResultDtoOfVirtualDbNameRowDto {
    items?: VirtualDbNameRowDto[] | null;
    totalCount?: number;
}

export interface PagedResultDtoOfVirtualDbRowDto {
    items?: VirtualDbRowDto[] | null;
    totalCount?: number;
}

export interface PagedResultDtoOfVirtualDbRowJTokenDto {
    items?: VirtualDbRowJTokenDto[] | null;
    totalCount?: number;
}

export interface RegisterDocumentInQueueInput {
    documentId?: string;
    documentType?: string | null;
}

export interface SaveToVirtualDbInput {
    innerObject?: unknown | null;
    key?: string | null;
    databaseName?: string | null;
    ttl?: number | null;
}

export interface UpdateJsonViewSettingInput {
    value?: string | null;
}

export interface VDBPermissionValidationInputDto {
    vdbName?: string | null;
    userId?: number | null;
    requestedPermission?: VDBPermissionLevel;
}

export interface VDBPushServiceInputDto {
    key?: string | null;
    data?: unknown | null;
}

export interface VirtualDbDto {
    name?: string | null;
}

export interface VirtualDbNameRowDto {
    row?: string | null;
}

export interface VirtualDbRowDto {
    key?: string | null;
    value?: string | null;
}

export interface VirtualDbRowJTokenDto {
    key?: string | null;
    value?: unknown | null;
}
