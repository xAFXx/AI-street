import { Injectable, signal, computed } from '@angular/core';

/**
 * Log entry structure
 */
export interface LogEntry {
    id: number;
    timestamp: Date;
    level: 'log' | 'warn' | 'error' | 'info' | 'debug';
    message: string;
    data?: any;
    source?: string;
}

/**
 * Debug Log Settings structure
 */
export interface DebugLogSettings {
    enabled: boolean;
    visible: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

const STORAGE_KEY = 'debug_log_settings';
const MAX_LOG_ENTRIES = 500;

const DEFAULT_SETTINGS: DebugLogSettings = {
    enabled: true,
    visible: false,
    position: { x: 20, y: 20 },
    size: { width: 500, height: 400 }
};

/**
 * Global Debug Log Service
 * 
 * Provides a centralized logging system that mirrors console output
 * to a floating debug panel. Use this service instead of console.log
 * for important application logs.
 * 
 * Usage:
 *   this.debugLog.log('Message');
 *   this.debugLog.warn('Warning');
 *   this.debugLog.error('Error');
 * 
 * Toggle panel: Ctrl+F1
 */
@Injectable({
    providedIn: 'root'
})
export class DebugLogService {
    private logIdCounter = 0;
    private originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console)
    };

    // Log entries signal
    private _logs = signal<LogEntry[]>([]);
    readonly logs = this._logs.asReadonly();

    // Settings signal
    private _settings = signal<DebugLogSettings>(this.loadSettings());
    readonly settings = this._settings.asReadonly();

    // Computed for panel visibility
    readonly isVisible = computed(() => this._settings().enabled && this._settings().visible);

    constructor() {
        // Intercept console methods to mirror to our log
        this.interceptConsole();
    }

    /**
     * Intercept native console methods to mirror output to debug panel
     */
    private interceptConsole(): void {
        const self = this;

        console.log = function (...args: any[]) {
            self.originalConsole.log(...args);
            self.addEntry('log', args);
        };

        console.warn = function (...args: any[]) {
            self.originalConsole.warn(...args);
            self.addEntry('warn', args);
        };

        console.error = function (...args: any[]) {
            self.originalConsole.error(...args);
            self.addEntry('error', args);
        };

        console.info = function (...args: any[]) {
            self.originalConsole.info(...args);
            self.addEntry('info', args);
        };

        console.debug = function (...args: any[]) {
            self.originalConsole.debug(...args);
            self.addEntry('debug', args);
        };
    }

    /**
     * Add a log entry
     */
    private addEntry(level: LogEntry['level'], args: any[]): void {
        // Format the message
        const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return String(arg);
            }
        }).join(' ');

        const entry: LogEntry = {
            id: ++this.logIdCounter,
            timestamp: new Date(),
            level,
            message,
            data: args.length > 1 ? args : args[0]
        };

        this._logs.update(logs => {
            const newLogs = [...logs, entry];
            // Cap at max entries
            if (newLogs.length > MAX_LOG_ENTRIES) {
                return newLogs.slice(-MAX_LOG_ENTRIES);
            }
            return newLogs;
        });
    }

    // ==================== Public API ====================

    /**
     * Log a message (mirrors console.log)
     */
    log(message: string, ...data: any[]): void {
        console.log(message, ...data);
    }

    /**
     * Log a warning (mirrors console.warn)
     */
    warn(message: string, ...data: any[]): void {
        console.warn(message, ...data);
    }

    /**
     * Log an error (mirrors console.error)
     */
    error(message: string, ...data: any[]): void {
        console.error(message, ...data);
    }

    /**
     * Log info (mirrors console.info)
     */
    info(message: string, ...data: any[]): void {
        console.info(message, ...data);
    }

    /**
     * Log debug (mirrors console.debug)
     */
    debug(message: string, ...data: any[]): void {
        console.debug(message, ...data);
    }

    /**
     * Clear all log entries
     */
    clear(): void {
        this._logs.set([]);
    }

    // ==================== Settings ====================

    /**
     * Toggle panel visibility
     */
    toggleVisible(): void {
        this._settings.update(s => ({ ...s, visible: !s.visible }));
        this.saveSettings();
    }

    /**
     * Show the panel
     */
    show(): void {
        this._settings.update(s => ({ ...s, visible: true }));
        this.saveSettings();
    }

    /**
     * Hide the panel
     */
    hide(): void {
        this._settings.update(s => ({ ...s, visible: false }));
        this.saveSettings();
    }

    /**
     * Enable/disable the debug log feature
     */
    setEnabled(enabled: boolean): void {
        this._settings.update(s => ({ ...s, enabled }));
        this.saveSettings();
    }

    /**
     * Update panel position
     */
    setPosition(x: number, y: number): void {
        this._settings.update(s => ({ ...s, position: { x, y } }));
        this.saveSettings();
    }

    /**
     * Update panel size
     */
    setSize(width: number, height: number): void {
        this._settings.update(s => ({ ...s, size: { width, height } }));
        this.saveSettings();
    }

    /**
     * Get current settings
     */
    getSettings(): DebugLogSettings {
        return this._settings();
    }

    // ==================== Persistence ====================

    private loadSettings(): DebugLogSettings {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            // Ignore parse errors
        }
        return DEFAULT_SETTINGS;
    }

    private saveSettings(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings()));
        } catch (e) {
            // Ignore storage errors
        }
    }
}
