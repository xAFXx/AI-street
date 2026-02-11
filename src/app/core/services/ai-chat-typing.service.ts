import { Injectable, signal, computed, inject } from '@angular/core';
import {
    AIChatMessage,
    MessageId,
    SessionId,
    MessageOwner,
    AIChatEventType,
    AIChatPendingStep,
    AllAIChatEvents,
    includesAnyEvent,
    extractAgentNameFromEvent
} from '../models/ai-chat.models';
import { DebugLogService } from './debug-log.service';

/**
 * AI Chat Typing Indicator Service
 *
 * Manages the typing / pending indicator state shown in the chat UI.
 * Extracted from the legacy god-service (~90 lines of indicator logic).
 */
@Injectable({ providedIn: 'root' })
export class AiChatTypingService {

    private readonly debug = inject(DebugLogService);
    private readonly typingMap = new Map<string, { id: string; agentId?: string; name: string; message: string }>();

    /** Reactive list of active typing indicators */
    readonly indicators = signal<{ id: string; agentId?: string; name: string; message: string }[]>([]);

    /** Whether any agent is currently typing / working */
    readonly hasIndicators = computed(() => this.indicators().length > 0);

    // ─── Actions ─────────────────────────────────────────────

    /**
     * Show a typing indicator for an event.
     *
     * @param sharedMessageId  Shared message ID for deduplication key
     * @param senderName       Name of the agent/sender
     * @param messageId        Message ID
     * @param event            The event type (JoinedAI, Pending, etc.)
     * @param rawMessage       Raw message string to extract agent name from events
     */
    show(
        sharedMessageId: string | undefined,
        senderName: string,
        messageId: string,
        event: AIChatEventType | AIChatPendingStep,
        rawMessage?: string
    ): void {
        const name = (rawMessage ? extractAgentNameFromEvent(rawMessage) : null) ?? senderName ?? '';

        let message = `${name} is typing`;

        if (this.isPendingEvent(event)) {
            switch (event) {
                case AIChatPendingStep.SearchingIntent:
                    message = 'Understanding your request';
                    break;
                case AIChatPendingStep.SearchingFunction:
                    message = 'Figuring out the best way to help';
                    break;
                case AIChatPendingStep.PreparingResult:
                    message = 'Preparing your answer';
                    break;
                default:
                    message = `${name} is working`;
                    break;
            }
        } else if (event === AIChatEventType.JoinedAI) {
            message = `${name} is typing`;
        }

        const key = `${sharedMessageId}-${name}`;
        this.typingMap.set(key, { id: messageId, name, message });
        this.emit();
    }

    /** Hide indicator by shared message ID + sender name */
    hideByName(sharedMessageId: string | undefined, senderName: string): void {
        const key = `${sharedMessageId}-${senderName}`;
        this.typingMap.delete(key);
        this.emit();
    }

    /** Hide indicator by extracting name from a status message (e.g., "AgentName offline") */
    hideByMessage(sharedMessageId: string | undefined, rawMessage: string): void {
        const name = this.extractName(rawMessage);
        this.hideByName(sharedMessageId, name);
    }

    /** Hide indicator by DTO (used for hideIndicator hub event) */
    hideByDto(sharedMessageId: string | undefined, agentName: string): void {
        if (!sharedMessageId || !agentName) return;
        this.hideByName(sharedMessageId, agentName);
    }

    /** Remove a specific indicator by its key */
    hideByKey(key: string): void {
        this.typingMap.delete(key);
        this.emit();
    }

    /** Clear all typing indicators */
    clearAll(): void {
        this.typingMap.clear();
        this.emit();
    }

    // ─── Private ─────────────────────────────────────────────

    private isPendingEvent(event: AIChatEventType | AIChatPendingStep): boolean {
        const pendingEvents: AllAIChatEvents[] = [
            AIChatEventType.Pending,
            AIChatPendingStep.Base,
            AIChatPendingStep.PreparingResult,
            AIChatPendingStep.SearchingIntent,
            AIChatPendingStep.SearchingFunction
        ];
        return pendingEvents.includes(event);
    }

    private extractName(input: string): string {
        const trimmed = (input ?? '').trim();
        if (!trimmed) return '';
        const match = trimmed.match(
            /^(.+?)\s+(offline|online|away|busy|idle|dnd|typing|connected|disconnected|inactive|active)$/i
        );
        return match ? match[1] : trimmed;
    }

    private emit(): void {
        this.indicators.set(Array.from(this.typingMap.values()));
    }
}
