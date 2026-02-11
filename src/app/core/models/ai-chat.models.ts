/**
 * AI Chat Models & Types
 * Consolidated from legacy enterprise-search/shared/models.ts and types.ts
 */

// ─── Type Aliases ────────────────────────────────────────────

export type MessageId = string;
export type SessionId = string;
export type AgentId = string;

// ─── Enums ───────────────────────────────────────────────────

/** SignalR connection state */
export enum ChatConnectionState {
    Disconnected = 'Disconnected',
    Connecting = 'Connecting',
    Connected = 'Connected',
    Reconnecting = 'Reconnecting'
}

/** Chat event markers sent inside message payloads */
export enum AIChatEventType {
    Finished = '*|Finished|*',
    Pending = '*|Pending|*',
    Started = '*|Started|*',
    JoinedAI = '*|JoinedAI:',
    AddAI = '*|AddAI:',
    SearchResult = '*|SearchResult:'
}

/** Granular pending sub-steps */
export enum AIChatPendingStep {
    Base = '*|Pending:',
    SearchingIntent = '*|Pending:SearchingIntent|*',
    SearchingFunction = '*|Pending:SearchingFunction|*',
    PreparingResult = '*|Pending:PreparingResult|*'
}

/** All event tokens (union helper) */
export type AllAIChatEvents = AIChatEventType | AIChatPendingStep;

/** Message ownership */
export enum MessageOwner {
    System = 'system',
    User = 'user',
    AI = 'ai'
}

// ─── Interfaces ──────────────────────────────────────────────

/** Normalized chat message used in the UI */
export interface AIChatMessage {
    id: MessageId;
    sessionId: SessionId;
    chatId: AgentId;
    owner: MessageOwner;
    author: string;
    content: string;
    timestamp: string;
    status?: 'sent' | 'delivered' | 'read' | 'failed' | string;
    finished: boolean;
}

/** Typing / pending indicator displayed in the chat */
export interface TypingIndicator {
    id: string;
    agentId?: string;
    name: string;
    message: string;
}

/** Agent metric linked to a session */
export interface AIAgentMetricSummary {
    sessionId: SessionId;
    agentMetrics: AIAgentMetric[];
}

export interface AIAgentMetric {
    agentId: AgentId;
    agentName: string;
    metric: unknown; // Will be typed to AIChatMetricDto when API proxy is generated
}

/** Grouped sessions for the sidebar */
export interface GroupedSessions {
    pinned: unknown[];  // Will be typed to AISessionDto
    others: unknown[];
}

// ─── Helpers ─────────────────────────────────────────────────

/** Check if a message string contains any of the given event tokens */
export function includesAnyEvent(msg: string | undefined, events: AllAIChatEvents[]): boolean {
    return !!msg && events.some(ev => msg.includes(ev));
}

/** Extract agent name from a JoinedAI event string like `*|JoinedAI:AgentName|*` */
export function extractAgentNameFromEvent(message: string): string | null {
    const match = message.match(/\*\|JoinedAI:(.*?)\|\*/);
    return match ? match[1] : null;
}

/** Extract search result ID from a SearchResult event string */
export function extractSearchId(message: string): string | null {
    const match = message.match(/\*\|SearchResult:(.*?)\|\*/);
    return match ? match[1] : null;
}

/** Extract a name by removing trailing status words (offline, online, typing, etc.) */
export function extractName(input: string): string {
    const trimmed = (input ?? '').trim();
    if (!trimmed) return '';
    const match = trimmed.match(
        /^(.+?)\s+(offline|online|away|busy|idle|dnd|typing|connected|disconnected|inactive|active)$/i
    );
    return match ? match[1] : trimmed;
}

/** Generate a UUID v4 */
export function createGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
