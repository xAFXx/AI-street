/**
 * Auto-generated TypeScript types for App Store
 *
 * Generated from: http://localhost:5000/swagger/Apps/swagger.json
 * Generated at:   2026-02-10T15:26:59.454Z
 * Tags:           AppStore
 *
 * ⚠️  DO NOT EDIT MANUALLY — regenerate with: npm run codegen
 */

/* eslint-disable */

export enum AppStatus {
    DEVELOPMENT = 0,
    TEST = 1,
    ACCEPTANCE = 2,
    BETA = 3,
    PRODUCTION = 4
}

export enum AuthenticationMethod {
    Oauth2 = 0,
    Bearer = 1,
    PureHttp = 2,
    NoAuthentication = 4,
    BasicAuth = 5,
    Oauth = 6,
    Oauth_SHAMAC256 = 7,
    Smtp = 8,
    Token = 9,
    IMAP = 10,
    ApiKey = 11,
    SFTP = 12,
    Oauth2_Twinfield = 13,
    CustomAuth = 99,
    Oauth2_Google = 101,
    NTLM = 200,
    OAUTH_NETSUITE = 601
}

export enum DataType {
    STRING = 0,
    INT = 1,
    DATE = 2,
    BOOL = 3
}

export enum FieldTypes {
    Text = 1,
    Number = 2,
    Date = 3,
    Datetime = 4,
    Checkbox = 5,
    Radio = 6,
    Currency = 7,
    Textarea = 8,
    Dropdown = 9,
    Image = 10
}

export interface AdditionalInformationDto {
    name?: string | null;
    dataType?: DataType;
    value?: string | null;
}

export interface AdditionalPropertyDto {
    id?: string;
    name?: string | null;
    defaultValue?: string | null;
    type?: FieldTypes;
    linkedToChannel?: boolean;
    required?: boolean;
    useCache?: boolean;
    isOwner?: boolean;
}

export interface AdditionalPropertyInputDto {
    name?: string | null;
    defaultValue?: string | null;
    type?: FieldTypes;
    linkedToChannel?: boolean;
    required?: boolean;
    useCache?: boolean;
    id?: string | null;
}

export interface ApiCallHeaderesDto {
    id?: string;
    name?: string | null;
    value?: string | null;
    apiCallId?: string;
    tenantId?: number | null;
    accessGranted?: boolean;
}

export interface ApiCallHeadersDto {
    /** Gets or sets the name. */
    name?: string | null;
    /** Gets or sets the value. */
    value?: string | null;
    /** Gets or sets the API call identifier. */
    apiCallId?: string;
    /** Gets or sets the tenant identifier. */
    tenantId?: number | null;
}

export interface ApiCallsOutputDto {
    id?: string;
    title?: string | null;
    call?: string | null;
    method?: string | null;
    description?: string | null;
    applicationName?: string | null;
    acceptHeader?: string | null;
    requestHeader?: string | null;
    body?: string | null;
    headers?: ApiCallHeaderesDto[] | null;
    authenticationRequired?: boolean;
    outputMapping?: string | null;
    accessGranted?: boolean;
    usedForAuthentication?: boolean;
}

export interface AppAssignmentListDto {
    id?: string;
    creationTime?: string;
    creatorUserId?: number | null;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
    isDeleted?: boolean;
    deleterUserId?: number | null;
    deletionTime?: string | null;
    title?: string | null;
    name?: string | null;
    description?: string | null;
    imageCSS?: string | null;
    baseUrl?: string | null;
    authentication?: AuthenticationMethod;
    appStatus?: AppStatus;
    appAssignmentId?: string;
    appId?: string;
    applicationProperties?: AdditionalPropertyDto[] | null;
    additionalInformation?: AdditionalInformationDto[] | null;
    additionalDicProperties?: Record<string, string> | null;
}

export interface AppAssignmentOutput {
}

export interface AppDefinitionOutputDto {
    id?: string;
    title?: string | null;
    name?: string | null;
    description?: string | null;
    imageCSS?: string | null;
    authentication?: AuthenticationMethod;
    baseUrl?: string | null;
    appDefinitionType?: string | null;
    availability?: AppStatus;
    additionalProperties?: string | null;
    additionalDicProperties?: Record<string, string> | null;
    price?: number;
}

export interface AppListDto {
    id?: string;
    creationTime?: string;
    creatorUserId?: number | null;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
    isDeleted?: boolean;
    deleterUserId?: number | null;
    deletionTime?: string | null;
    title?: string | null;
    name?: string | null;
    description?: string | null;
    imageCSS?: string | null;
    appStatus?: AppStatus;
    baseUrl?: string | null;
    price?: number;
    authentication?: AuthenticationMethod;
    additionalDicProperties?: Record<string, string> | null;
}

export interface CreateApiInputDto {
    /** Gets or sets the identifier. */
    id: string;
    /** Gets or sets the title. */
    title: string;
    /** Gets or sets the call. */
    call: string;
    /** Gets or sets the method. */
    method?: string | null;
    /** Gets or sets the description. */
    description?: string | null;
    /** Gets or sets a value indicating whether [authentication required]. */
    authenticationRequired?: boolean;
    /** Gets or sets the accept header. */
    acceptHeader?: string | null;
    /** Gets or sets the request header. */
    requestHeader?: string | null;
    /** Gets or sets the body. */
    body?: string | null;
    /** Gets or sets the output mapping. */
    outputMapping?: string | null;
    /** Gets or sets the API call headers. */
    apiCallHeaders?: ApiCallHeadersDto[] | null;
    /** Gets or sets the tenant identifier. */
    tenantId?: number | null;
    /** Gets or sets a value indicating whether [allow null tenant]. */
    allowNullTenant?: boolean;
    /** Shows if the call is used for authentication of the channel */
    usedForAuthentication?: boolean;
}

export interface CreateAppInput {
    title: string;
    name?: string | null;
    description?: string | null;
    imageCSS?: string | null;
    appStatus?: AppStatus;
    baseUrl?: string | null;
    additionalProperties?: Record<string, string> | null;
    applicationProperties?: AdditionalPropertyInputDto[] | null;
    price?: number;
    authentication?: AuthenticationMethod;
}

export interface CreateOrEditAppInput {
    title: string;
    name?: string | null;
    description?: string | null;
    imageCSS?: string | null;
    appStatus?: AppStatus;
    baseUrl?: string | null;
    additionalProperties?: Record<string, string> | null;
    applicationProperties?: AdditionalPropertyInputDto[] | null;
    price?: number;
    authentication?: AuthenticationMethod;
    id?: string | null;
}

export interface EntityDtoOfGuid {
    id?: string;
}

export interface ListResultDtoOfAppAssignmentListDto {
    items?: AppAssignmentListDto[] | null;
}

export interface ListResultDtoOfAppListDto {
    items?: AppListDto[] | null;
}
