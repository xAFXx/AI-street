import { Injectable, signal, computed, inject, effect } from '@angular/core';
import {
    AIChatMessage,
    MessageId,
    SessionId,
    MessageOwner,
    AIChatEventType,
    AIChatPendingStep,
    includesAnyEvent,
    extractAgentNameFromEvent,
    extractSearchId,
    createGuid
} from '../models/ai-chat.models';
import { AiChatHubService } from './ai-chat-hub.service';
import { AiChatTypingService } from './ai-chat-typing.service';
import { DebugLogService } from './debug-log.service';

/**
 * AI Chat Message Service
 *
 * The central message state manager. Replaces both the legacy 1141-line
 * `ReactiveAIChatService` and 511-line `ChatMessagesStore`.
 *
 * Key simplifications:
 * - Angular Signals instead of ~15 BehaviorSubjects
 * - Single `ingestMessage()` method with a switch/if chain replaces ~30 RxJS filter streams
 * - Queue management via signals instead of separate enqueue/promote streams
 * - No lodash, no @ngrx/component-store
 */
@Injectable({ providedIn: 'root' })
export class AiChatMessageService {

    private readonly hub = inject(AiChatHubService);
    private readonly typing = inject(AiChatTypingService);
    private readonly debug = inject(DebugLogService);

    // ─── Core State ──────────────────────────────────────────

    /** All messages, bucketed by session → message map */
    readonly buckets = signal<Record<SessionId, Record<MessageId, AIChatMessage>>>({});

    /** Currently active session ID */
    readonly activeSessionId = signal<SessionId | undefined>(undefined);

    /** Loading indicator (while waiting for AI response) */
    readonly loading = signal(false);

    /** Current message thread ID being streamed */
    readonly currentMessageId = signal<MessageId | undefined>(undefined);

    /** Shared message ID for the current thread */
    readonly currentSharedMessageId = signal<MessageId | undefined>(undefined);

    /** Current AI agent info */
    readonly currentAgent = signal<{ id?: string; name?: string } | undefined>(undefined);

    /** Whether the AI is in a pending/processing state */
    readonly aiIsPending = signal(false);

    // ─── Queue ───────────────────────────────────────────────

    /** Messages waiting to be promoted to the active thread */
    private readonly queuedMessages = signal<{ id: MessageId; messages: any[] }[]>([]);

    /** Whether there are queued messages */
    readonly hasQueuedMessages = computed(() => this.queuedMessages().length > 0);

    // ─── Computed ────────────────────────────────────────────

    /** Messages for the active session, sorted by timestamp */
    readonly currentSessionMessages = computed(() => {
        const sessionId = this.activeSessionId();
        if (!sessionId) return [];

        const bucket = this.buckets()[sessionId];
        if (!bucket) return [];

        return Object.values(bucket).sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return a.timestamp.localeCompare(b.timestamp);
        });
    });

    /** Total message count for the active session */
    readonly messageCount = computed(() => this.currentSessionMessages().length);

    // ─── Subscription Setup ──────────────────────────────────

    constructor() {
        // Subscribe to hub events and route through ingestMessage
        this.hub.messageReceived$.subscribe(dto => this.ingestMessage(dto));

        // Handle hideIndicator events from the hub
        this.hub.hideIndicator$.subscribe(dto => {
            if (dto) {
                this.typing.hideByDto(dto.sharedMessageId, dto.agentName);
            }
        });
    }

    // ─── Public API ──────────────────────────────────────────

    /**
     * Main entry point: classify an incoming message DTO and route
     * it to the appropriate handler.
     *
     * Replaces the legacy 545-line constructor's 30+ RxJS streams.
     */
    ingestMessage(dto: any): void {
        if (!dto) return;

        const type = dto.type;
        const message = dto.message ?? '';
        const id = dto.id;
        const currentId = this.currentMessageId();

        // Log for debugging
        this.logMessage(dto);

        // ── Events ──
        if (type === 4 /* AIChatMessageType.Events */) {
            this.handleEvent(dto, message, id, currentId);
            return;
        }

        // ── User messages ──
        if (type === 1 /* AIChatMessageType.User */) {
            this.handleUserMessage(dto);
            return;
        }

        // ── System messages ──
        if (type === 3 /* AIChatMessageType.System */) {
            this.handleSystemMessage(dto, id, currentId);
            return;
        }

        // ── AI messages ──
        if (type === 2 /* AIChatMessageType.AI */) {
            this.handleAIMessage(dto, id, currentId);
            return;
        }
    }

    /** Set the active session */
    setActiveSession(sessionId: SessionId): void {
        this.activeSessionId.set(sessionId);
    }

    /** Insert an optimistic user message immediately */
    upsertOptimistic(msg: AIChatMessage): void {
        this.mergeMessage(msg);
    }

    /** Clear messages for the current session */
    clearCurrentSession(): void {
        const sessionId = this.activeSessionId();
        if (!sessionId) return;

        this.buckets.update(b => {
            const next = { ...b };
            delete next[sessionId];
            return next;
        });
    }

    /** Load historical messages into a session bucket */
    loadMessages(sessionId: SessionId, messages: AIChatMessage[]): void {
        this.buckets.update(b => {
            const bucket: Record<MessageId, AIChatMessage> = {};
            for (const msg of messages) {
                bucket[msg.id] = msg;
            }
            return { ...b, [sessionId]: bucket };
        });
    }

    /** Reset all state */
    reset(): void {
        this.buckets.set({});
        this.loading.set(false);
        this.currentMessageId.set(undefined);
        this.currentSharedMessageId.set(undefined);
        this.currentAgent.set(undefined);
        this.aiIsPending.set(false);
        this.queuedMessages.set([]);
        this.typing.clearAll();
    }

    // ─── Message Handlers ────────────────────────────────────

    private handleUserMessage(dto: any): void {
        this.loading.set(true);
        this.setCurrentSharedMessageIdIfNotSet(dto.sharedMessageId);

        const msg = this.convertDto(dto);
        this.mergeMessage(msg);
    }

    private handleAIMessage(dto: any, id: MessageId, currentId: MessageId | undefined): void {
        // Set current message ID if not already set
        if (!currentId) {
            this.currentMessageId.set(id);
            this.setCurrentSharedMessageIdIfNotSet(dto.sharedMessageId);
            if (dto.sender) {
                this.currentAgent.set({ id: dto.sender.id, name: dto.sender.name });
            }
        }

        // If this belongs to the current thread, process immediately
        if (id === currentId || !currentId) {
            this.loading.set(false);
            const msg = this.convertDto(dto);
            this.mergeMessage(msg);

            // Track agent changes
            if (dto.sender && this.currentAgent()?.id !== dto.sender.id) {
                this.currentAgent.set({ id: dto.sender.id, name: dto.sender.name });
            }
        } else {
            // Queue it for later
            this.enqueue(dto);
        }
    }

    private handleSystemMessage(dto: any, id: MessageId, currentId: MessageId | undefined): void {
        // System messages show immediately when no current thread
        if (!currentId) {
            this.loading.set(false);
            const msg = this.convertDto(dto);
            this.mergeMessage(msg);

            // Handle offline messages
            if ((dto.message ?? '').includes('offline')) {
                this.loading.set(false);
                this.typing.hideByMessage(dto.sharedMessageId, dto.message);
            }
        }
    }

    private handleEvent(dto: any, message: string, id: MessageId, currentId: MessageId | undefined): void {
        // ── Started ──
        if (message.includes(AIChatEventType.Started)) {
            this.loading.set(false);
            if (!currentId) {
                this.currentMessageId.set(id);
                if (dto.sender) {
                    this.currentAgent.set({ id: dto.sender.id, name: dto.sender.name });
                }
            }
            return;
        }

        // ── Finished ──
        if (message.includes(AIChatEventType.Finished)) {
            if (id === currentId) {
                this.currentMessageId.set(undefined);
                this.currentSharedMessageId.set(undefined);
                this.typing.hideByName(dto.sharedMessageId, dto.sender?.name ?? '');
                this.aiIsPending.set(false);

                // Promote next queued thread
                this.promoteNext();
            }
            return;
        }

        // ── JoinedAI ──
        if (message.includes(AIChatEventType.JoinedAI)) {
            this.typing.show(
                dto.sharedMessageId,
                dto.sender?.name ?? '',
                id,
                AIChatEventType.JoinedAI,
                message
            );
            return;
        }

        // ── SearchResult ──
        if (message.includes(AIChatEventType.SearchResult)) {
            if (id === currentId) {
                this.typing.hideByName(dto.sharedMessageId, dto.sender?.name ?? '');
                const searchId = extractSearchId(message);
                if (searchId) {
                    // Emit search result for consumers
                    this.debug.log('AiChatMessage', `Search result: ${searchId}`);
                }
            }
            return;
        }

        // ── Pending events ──
        if (message.includes(AIChatEventType.Pending)) {
            this.aiIsPending.set(true);

            // Determine specific pending step
            let step: AIChatPendingStep = AIChatPendingStep.Base;
            if (message.includes(AIChatPendingStep.SearchingIntent)) step = AIChatPendingStep.SearchingIntent;
            else if (message.includes(AIChatPendingStep.SearchingFunction)) step = AIChatPendingStep.SearchingFunction;
            else if (message.includes(AIChatPendingStep.PreparingResult)) step = AIChatPendingStep.PreparingResult;

            this.typing.show(
                dto.sharedMessageId,
                dto.sender?.name ?? '',
                id,
                step,
                message
            );
            return;
        }

        // ── AddAI (no-op for now) ──
        if (message.includes(AIChatEventType.AddAI)) {
            return;
        }
    }

    // ─── Queue Management ────────────────────────────────────

    /** Enqueue a message for later processing (not current thread) */
    private enqueue(dto: any): void {
        this.queuedMessages.update(queue => {
            const existing = queue.find(q => q.id === dto.id);
            if (existing) {
                return queue.map(q =>
                    q.id === dto.id
                        ? { ...q, messages: [...q.messages, dto] }
                        : q
                );
            }
            return [...queue, { id: dto.id, messages: [dto] }];
        });
    }

    /** Promote the next queued thread to current */
    private promoteNext(): void {
        const queue = this.queuedMessages();
        if (queue.length === 0) return;

        const [next, ...rest] = queue;
        this.queuedMessages.set(rest);

        // Set as current thread
        this.currentMessageId.set(next.id);

        // Replay all queued messages for this thread
        for (const dto of next.messages) {
            this.ingestMessage(dto);
        }
    }

    // ─── Merge & Convert ─────────────────────────────────────

    /** Merge a message into the appropriate session bucket */
    private mergeMessage(msg: AIChatMessage): void {
        const sessionId = msg.sessionId || this.activeSessionId();
        if (!sessionId) return;

        this.buckets.update(b => {
            const bucket = { ...(b[sessionId] ?? {}) };
            const existing = bucket[msg.id];

            if (existing && msg.owner === MessageOwner.AI && !msg.finished) {
                // Append content for streaming AI messages
                bucket[msg.id] = {
                    ...existing,
                    content: existing.content + msg.content,
                    timestamp: msg.timestamp
                };
            } else {
                bucket[msg.id] = msg;
            }

            return { ...b, [sessionId]: bucket };
        });
    }

    /** Convert a raw DTO to our AIChatMessage shape */
    private convertDto(dto: any): AIChatMessage {
        let owner = MessageOwner.System;
        let author = '';
        let finished = true;

        // Determine ownership based on side + type
        if (dto.side === 1 /* ChatSide.Sender */) {
            owner = MessageOwner.User;
        } else if (dto.side === 2 /* ChatSide.Receiver */) {
            if (dto.type === 3 /* System */) {
                owner = MessageOwner.System;
            } else if (dto.type === 2 /* AI */) {
                owner = MessageOwner.AI;
                author = dto.sender?.name ?? '';
                finished = false;
            }
        }

        return {
            id: dto.id ?? createGuid(),
            sessionId: dto.sessionId ?? this.activeSessionId() ?? '',
            chatId: dto.sender?.id ?? '',
            owner,
            author,
            content: dto.displayMessage ?? dto.message ?? '',
            timestamp: dto.creationTime
                ? new Date(dto.creationTime).toISOString()
                : new Date().toISOString(),
            status: 'delivered',
            finished
        };
    }

    // ─── Helpers ─────────────────────────────────────────────

    private setCurrentSharedMessageIdIfNotSet(value: string | undefined): void {
        if (!this.currentSharedMessageId() && value) {
            this.currentSharedMessageId.set(value);
        }
    }

    /**
     * Create a synthetic "Finished" event to clean up stuck threads.
     * Called after a timeout when no real Finished event arrives.
     */
    createFakeFinish(): void {
        const id = this.currentMessageId() ?? 'fake-finish';
        const agent = this.currentAgent() ?? { name: 'AI' };

        const fakeDto = {
            id,
            type: 4, // Events
            message: AIChatEventType.Finished,
            displayMessage: AIChatEventType.Finished,
            sender: agent,
            sharedMessageId: this.currentSharedMessageId(),
            creationTime: new Date().toISOString()
        };

        this.ingestMessage(fakeDto);
    }

    private logMessage(dto: any): void {
        const type = dto.type;
        const typeMap: Record<number, string> = {
            1: 'User',
            2: 'AI',
            3: 'System',
            4: 'Event'
        };
        const label = typeMap[type] ?? 'Unknown';
        this.debug.log('AiChatMessage', `[${label}] ${dto.sender?.name ?? 'system'}: ${(dto.message ?? '').substring(0, 80)}`);
    }
}
