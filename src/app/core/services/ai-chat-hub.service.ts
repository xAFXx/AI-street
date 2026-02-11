import { Injectable, inject, computed, OnDestroy } from '@angular/core';
import { Subject, firstValueFrom, filter } from 'rxjs';
import { HubConnection } from '@microsoft/signalr';
import { SignalRService } from './signalr.service';
import { ChatConnectionState } from '../models/ai-chat.models';
import { DebugLogService } from './debug-log.service';
import { AppConfigService } from './app-config.service';
import { AuthService } from './auth.service';

/**
 * AI Chat Hub Service
 *
 * Manages the SignalR connection to the AI chat backend hub.
 * Registers hub event handlers and exposes typed Subjects for consumers.
 *
 * Replaces legacy `AIChatSignalrService` which used `abp.signalr.connect()`.
 */
@Injectable({ providedIn: 'root' })
export class AiChatHubService implements OnDestroy {

    private readonly signalr = inject(SignalRService);
    private readonly debug = inject(DebugLogService);
    private readonly appConfig = inject(AppConfigService);
    private readonly auth = inject(AuthService);

    private connection: HubConnection | null = null;
    private initialized = false;

    // ─── Hub Events (typed Subjects) ─────────────────────────
    // Consumers subscribe directly — no global `abp.event.trigger`

    /** Incoming AI/User/System/Event messages */
    readonly messageReceived$ = new Subject<any>();

    /** "Hide indicator" signal from the backend */
    readonly hideIndicator$ = new Subject<any>();

    /** Updated performance metrics per agent */
    readonly metricsUpdated$ = new Subject<any[]>();

    /** Session list updated (new session created, etc.) */
    readonly sessionsUpdated$ = new Subject<any[]>();

    // ─── Connection State (delegated to SignalRService) ──────

    readonly connectionState = computed(() => this.signalr.connectionState());
    readonly isConnected = computed(() => this.signalr.isConnected());

    // ─── Public API ──────────────────────────────────────────

    /**
     * Initialize the SignalR connection and register hub event handlers.
     * Safe to call multiple times — only initializes once.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Wait for app config to be loaded before reading remoteServiceBaseUrl
            await firstValueFrom(
                this.appConfig.config$.pipe(filter(config => config !== null))
            );

            const baseUrl = this.appConfig.remoteServiceBaseUrl;
            if (!baseUrl) {
                this.debug.log('AiChatHub', 'ERROR: remoteServiceBaseUrl is empty — config not loaded');
                return;
            }

            const token = this.auth.accessToken;

            // ABP backend expects enc_auth_token as a URL query parameter
            // (not the standard SignalR access_token Bearer header)
            let hubUrl = `${baseUrl}/signalr-aichat`;
            if (token) {
                hubUrl += `?enc_auth_token=${encodeURIComponent(token)}`;
            }

            this.debug.log('AiChatHub', `Connecting to: ${hubUrl.split('?')[0]}`);
            this.connection = await this.signalr.connect(hubUrl);

            this.registerHubEvents(this.connection);
            this.initialized = true;

            this.debug.log('AiChatHub', 'Initialized and connected');
        } catch (err: any) {
            this.debug.log('AiChatHub', `Initialization failed: ${err?.message ?? err}`);
            throw err;
        }
    }

    /**
     * Send a message to the AI chat hub.
     *
     * @param messageData The message payload to send
     */
    async sendMessage(messageData: any): Promise<void> {
        if (!this.connection || !this.isConnected()) {
            this.debug.log('AiChatHub', 'Cannot send — not connected');
            return;
        }

        try {
            const result = await this.connection.invoke('sendMessage', messageData);
            if (result) {
                this.debug.log('AiChatHub', `Server warning: ${result}`);
            }
        } catch (err: any) {
            this.debug.log('AiChatHub', `Send failed: ${err?.message ?? err}`);
            throw err;
        }
    }

    /** Disconnect and clean up */
    async disconnect(): Promise<void> {
        if (this.connection) {
            this.unregisterHubEvents(this.connection);
        }
        await this.signalr.disconnect();
        this.connection = null;
        this.initialized = false;
    }

    ngOnDestroy(): void {
        this.disconnect();
    }

    // ─── Private ─────────────────────────────────────────────

    private registerHubEvents(conn: HubConnection): void {
        conn.on('getAIChatMessage', (message: any) => {
            this.messageReceived$.next(message);
        });

        conn.on('hideIndicator', (input: any) => {
            this.hideIndicator$.next(input);
        });

        conn.on('updateAIChatMetric', (metrics: any[]) => {
            this.metricsUpdated$.next(metrics);
        });

        conn.on('updateSessions', (sessions: any[]) => {
            this.sessionsUpdated$.next(sessions);
        });
    }

    private unregisterHubEvents(conn: HubConnection): void {
        conn.off('getAIChatMessage');
        conn.off('hideIndicator');
        conn.off('updateAIChatMetric');
        conn.off('updateSessions');
    }

}
