import { Injectable, signal, computed, inject } from '@angular/core';
import { SessionId } from '../models/ai-chat.models';
import { AiChatHubService } from './ai-chat-hub.service';
import { DebugLogService } from './debug-log.service';
import { AppConfigService } from './app-config.service';

/**
 * AI Chat Session Service
 *
 * Manages chat sessions — CRUD, selection, pinning, and URL sync.
 * Clean port of the legacy `AiSessionsService` (321 lines),
 * replacing BehaviorSubjects with Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class AiChatSessionService {

    private readonly hub = inject(AiChatHubService);
    private readonly debug = inject(DebugLogService);
    private readonly appConfig = inject(AppConfigService);

    // ─── State ───────────────────────────────────────────────

    /** All sessions */
    readonly sessions = signal<any[]>([]);

    /** Currently selected session ID */
    readonly currentSessionId = signal<SessionId | null>(null);

    /** Loading state */
    readonly loading = signal(false);

    // ─── Computed ────────────────────────────────────────────

    /** Current session object */
    readonly currentSession = computed(() => {
        const id = this.currentSessionId();
        return id ? this.sessions().find(s => s.id === id) ?? null : null;
    });

    /** Sessions grouped: pinned vs others */
    readonly groupedSessions = computed(() => {
        const all = this.sessions();
        return {
            pinned: all.filter(s => s.isPinned),
            others: all.filter(s => !s.isPinned)
        };
    });

    /** Session count */
    readonly sessionCount = computed(() => this.sessions().length);

    constructor() {
        // Listen for session updates from SignalR hub
        this.hub.sessionsUpdated$.subscribe(sessions => {
            if (sessions?.length) {
                this.upsertSessions(sessions);
            }
        });
    }

    // ─── Public API ──────────────────────────────────────────

    /** Load all sessions from the backend */
    setSessions(sessions: any[]): void {
        this.sessions.set(sessions);
        this.debug.log('AiChatSession', `Loaded ${sessions.length} sessions`);
    }

    /** Select a session by ID */
    selectSession(id: SessionId, silent = false): boolean {
        const found = this.sessions().find(s => s.id === id);
        if (!found) {
            this.debug.log('AiChatSession', `Session ${id} not found`);
            return false;
        }

        this.currentSessionId.set(id);
        if (!silent) {
            this.debug.log('AiChatSession', `Selected session: ${id}`);
        }
        return true;
    }

    /** Check if a session already exists */
    hasSession(sessionId: string): boolean {
        return this.sessions().some(s => s.id === sessionId);
    }

    /** Add or update a session */
    updateSession(id: string, patch: Partial<any>): void {
        this.sessions.update(list =>
            list.map(s => s.id === id ? { ...s, ...patch } : s)
        );
    }

    /** Upsert sessions (merge by ID) */
    upsertSessions(incoming: any[]): void {
        this.sessions.update(existing => {
            const map = new Map(existing.map(s => [s.id, s]));
            for (const s of incoming) {
                map.set(s.id, { ...map.get(s.id), ...s });
            }
            return Array.from(map.values());
        });
    }

    /** Upsert a single incoming session and optionally select it */
    upsertAndSelect(session: any, select = true): void {
        this.upsertSessions([session]);
        if (select) {
            this.selectSession(session.id);
        }
    }

    /** Remove a session */
    removeSession(id: string): void {
        this.sessions.update(list => list.filter(s => s.id !== id));

        // If we deleted the current session, select the next available
        if (this.currentSessionId() === id) {
            const remaining = this.sessions();
            if (remaining.length > 0) {
                this.selectSession(remaining[0].id);
            } else {
                this.currentSessionId.set(null);
            }
        }
    }

    /** Rename a session */
    renameSession(id: string, name: string): void {
        this.updateSession(id, { sessionName: name });
    }

    /** Pin / unpin a session */
    setPinned(id: string, pinned: boolean): void {
        this.updateSession(id, { isPinned: pinned });
    }

    /** Archive / unarchive a session */
    setArchived(id: string, archived: boolean): void {
        this.updateSession(id, { isArchived: archived });
    }

    /** Mark session as read (zero unread) */
    markRead(id: string): void {
        this.updateSession(id, { unreadCount: 0 });
    }

    /** Increment unread count */
    incrementUnread(id: string, by = 1): void {
        const session = this.sessions().find(s => s.id === id);
        if (session) {
            const current = session.unreadCount ?? 0;
            this.updateSession(id, { unreadCount: Math.max(0, current + by) });
        }
    }

    /** Clear all sessions */
    clear(): void {
        this.sessions.set([]);
        this.currentSessionId.set(null);
    }

    /** Get snapshot of current session ID */
    get currentSessionIdSnapshot(): SessionId | null {
        return this.currentSessionId();
    }
}
