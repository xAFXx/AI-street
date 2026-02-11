/**
 * AI Management Module Models
 * 
 * DTOs for AI agent CRUD operations.
 * Migrated from legacy toAnalize/ai/ module.
 */

import { PagedResult } from '../../../core/api-client';

// ==================== DTOs ====================

/**
 * AI Agent data transfer object.
 */
export interface AIAgentDto {
    id?: string;
    name?: string;
    description?: string;
    internalInstruction?: string;
    externalInstruction?: string;
    source?: string;
    destination?: string;
    path?: string;
    authentication?: string;
    content?: string;
    avatar?: string;
    mainLanguage?: string;
    maxTokens?: number;
    allowFunctionCalling?: boolean;
    enabled?: boolean;
}

/**
 * Input for creating a new AI agent.
 */
export interface CreateAIAgentInput {
    name: string;
    description: string;
    internalInstruction: string;
    externalInstruction?: string;
    source?: string;
    destination?: string;
    path?: string;
    authentication?: string;
    content?: string;
    avatar?: string;
    mainLanguage?: string;
    maxTokens?: number;
    allowFunctionCalling?: boolean;
    enabled?: boolean;
}

/**
 * Input for updating an existing AI agent.
 */
export interface UpdateAIAgentInput {
    id: string;
    name: string;
    description: string;
    internalInstruction: string;
    externalInstruction?: string;
    source?: string;
    destination?: string;
    path?: string;
    authentication?: string;
    content?: string;
    avatar?: string;
    mainLanguage?: string;
    maxTokens?: number;
    allowFunctionCalling?: boolean;
    enabled?: boolean;
}

// ==================== Query Parameters ====================

/**
 * Parameters for querying AI agents.
 */
export interface AIAgentQueryParams {
    filter?: string;
    sorting?: string;
    skipCount?: number;
    maxResultCount?: number;
}

// ==================== Type Aliases ====================

export type PagedAIAgentResult = PagedResult<AIAgentDto>;
