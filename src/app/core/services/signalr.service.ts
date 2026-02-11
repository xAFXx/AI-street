import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import {
    HubConnection,
    HubConnectionBuilder,
    HubConnectionState,
    LogLevel
} from '@microsoft/signalr';
import { ChatConnectionState } from '../models/ai-chat.models';
import { DebugLogService } from './debug-log.service';

/**
 * Generic, reusable SignalR hub wrapper.
 *
 * Uses Angular Signals for connection state and @microsoft/signalr's
 * built-in `withAutomaticReconnect()` — replacing the legacy 70-line
 * manual reconnect loop.
 */
@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {

    private readonly debug = inject(DebugLogService);

    // ─── State ───────────────────────────────────────────────
    private connection: HubConnection | null = null;

    /** Reactive connection state */
    readonly connectionState = signal<ChatConnectionState>(ChatConnectionState.Disconnected);

    /** Convenience computed */
    readonly isConnected = computed(() => this.connectionState() === ChatConnectionState.Connected);

    // ─── Public API ──────────────────────────────────────────

    /**
     * Build and start a connection to the given hub URL.
     *
     * @param hubUrl  Full or relative URL to the SignalR hub (e.g. `/signalr-aichat`)
     * @param options Optional config: `accessTokenFactory` for auth, `logLevel`
     * @returns The live `HubConnection` for event registration
     */
    async connect(
        hubUrl: string,
        options?: {
            accessTokenFactory?: () => string | Promise<string>;
            logLevel?: LogLevel;
        }
    ): Promise<HubConnection> {
        // Tear down any existing connection first
        await this.disconnect();

        this.connectionState.set(ChatConnectionState.Connecting);

        const builder = new HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: options?.accessTokenFactory
            })
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: (ctx) => {
                    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max — then give up after 8 attempts
                    if (ctx.previousRetryCount >= 8) return null;
                    return Math.min(1000 * Math.pow(2, ctx.previousRetryCount), 30_000);
                }
            })
            .configureLogging(options?.logLevel ?? LogLevel.Warning);

        this.connection = builder.build();

        // Wire lifecycle events
        this.connection.onreconnecting(() => {
            this.connectionState.set(ChatConnectionState.Reconnecting);
            this.debug.log('SignalR', 'Reconnecting…');
        });

        this.connection.onreconnected(() => {
            this.connectionState.set(ChatConnectionState.Connected);
            this.debug.log('SignalR', 'Reconnected');
        });

        this.connection.onclose((err) => {
            this.connectionState.set(ChatConnectionState.Disconnected);
            if (err) {
                this.debug.log('SignalR', `Connection closed with error: ${err.message}`);
            } else {
                this.debug.log('SignalR', 'Connection closed');
            }
        });

        // Start
        try {
            await this.connection.start();
            this.connectionState.set(ChatConnectionState.Connected);
            this.debug.log('SignalR', `Connected to ${hubUrl}`);
        } catch (err: any) {
            this.connectionState.set(ChatConnectionState.Disconnected);
            this.debug.log('SignalR', `Failed to connect: ${err?.message ?? err}`);
            throw err;
        }

        return this.connection;
    }

    /** Gracefully stop the current connection */
    async disconnect(): Promise<void> {
        if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
            try {
                await this.connection.stop();
            } catch {
                // Swallow — already disconnected
            }
        }
        this.connection = null;
        this.connectionState.set(ChatConnectionState.Disconnected);
    }

    /** Get the underlying HubConnection (for advanced use cases) */
    getConnection(): HubConnection | null {
        return this.connection;
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
