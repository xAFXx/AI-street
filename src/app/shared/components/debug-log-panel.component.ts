import { Component, OnInit, OnDestroy, inject, signal, effect, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DebugLogService, LogEntry } from '../../core/services/debug-log.service';

/**
 * Global Debug Log Panel
 * 
 * A floating, draggable, resizable panel that displays application logs.
 * - Mirrors all console.log/warn/error output
 * - Persists position and size to localStorage
 * - Toggle with Ctrl+F1
 * - Close button hides panel (remembers state)
 */
@Component({
    selector: 'app-debug-log-panel',
    standalone: true,
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
        @if (debugLog.isVisible()) {
            <div class="debug-log-panel"
                 #panel
                 [style.left.px]="position().x"
                 [style.top.px]="position().y"
                 [style.width.px]="size().width"
                 [style.height.px]="size().height">
                
                <!-- Header (draggable) -->
                <div class="panel-header"
                     (mousedown)="startDrag($event)">
                    <div class="header-left">
                        <i class="pi pi-code"></i>
                        <span>Debug Log</span>
                        <span class="log-count">({{ debugLog.logs().length }})</span>
                    </div>
                    <div class="header-actions">
                        <button pButton 
                            icon="pi pi-trash" 
                            [text]="true" 
                            severity="secondary"
                            pTooltip="Clear logs"
                            (click)="debugLog.clear()">
                        </button>
                        <button pButton 
                            icon="pi pi-times" 
                            [text]="true" 
                            severity="secondary"
                            pTooltip="Close (Ctrl+F1 to reopen)"
                            (click)="debugLog.hide()">
                        </button>
                    </div>
                </div>

                <!-- Log entries -->
                <div class="log-entries" #logContainer>
                    @for (log of debugLog.logs(); track log.id) {
                        <div class="log-entry" [class]="'level-' + log.level">
                            <span class="timestamp">{{ formatTime(log.timestamp) }}</span>
                            <span class="level-badge">{{ log.level.toUpperCase() }}</span>
                            <span class="message">{{ log.message }}</span>
                        </div>
                    }
                    @if (debugLog.logs().length === 0) {
                        <div class="no-logs">
                            <i class="pi pi-inbox"></i>
                            <span>No logs yet. Messages will appear here.</span>
                        </div>
                    }
                </div>

                <!-- Resize handle -->
                <div class="resize-handle" (mousedown)="startResize($event)">
                    <i class="pi pi-arrows-alt"></i>
                </div>
            </div>
        }
    `,
    styles: [`
        .debug-log-panel {
            position: fixed;
            z-index: 10000;
            background: #1e1e2e;
            border: 1px solid #45475a;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            min-width: 300px;
            min-height: 200px;
            max-width: 90vw;
            max-height: 90vh;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #313244;
            border-radius: 8px 8px 0 0;
            cursor: grab;
            user-select: none;
            border-bottom: 1px solid #45475a;
        }

        .panel-header:active {
            cursor: grabbing;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #cdd6f4;
            font-weight: 600;
        }

        .header-left i {
            color: #89b4fa;
        }

        .log-count {
            color: #6c7086;
            font-weight: normal;
            font-size: 11px;
        }

        .header-actions {
            display: flex;
            gap: 4px;
        }

        .header-actions :host ::ng-deep .p-button {
            width: 28px;
            height: 28px;
            color: #a6adc8;
        }

        .header-actions :host ::ng-deep .p-button:hover {
            color: #cdd6f4;
            background: rgba(255, 255, 255, 0.1);
        }

        .log-entries {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            color: #cdd6f4;
        }

        .log-entry {
            display: flex;
            gap: 8px;
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 2px;
            align-items: flex-start;
            word-break: break-word;
        }

        .log-entry:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .timestamp {
            color: #6c7086;
            font-size: 10px;
            flex-shrink: 0;
            padding-top: 2px;
        }

        .level-badge {
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            flex-shrink: 0;
        }

        .level-log .level-badge {
            background: #45475a;
            color: #a6adc8;
        }

        .level-info .level-badge {
            background: rgba(137, 180, 250, 0.2);
            color: #89b4fa;
        }

        .level-warn .level-badge {
            background: rgba(249, 226, 175, 0.2);
            color: #f9e2af;
        }

        .level-error .level-badge {
            background: rgba(243, 139, 168, 0.2);
            color: #f38ba8;
        }

        .level-debug .level-badge {
            background: rgba(166, 227, 161, 0.2);
            color: #a6e3a1;
        }

        .message {
            flex: 1;
            white-space: pre-wrap;
            line-height: 1.4;
        }

        .no-logs {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            height: 100%;
            color: #6c7086;
            padding: 32px;
            text-align: center;
        }

        .no-logs i {
            font-size: 32px;
        }

        .resize-handle {
            position: absolute;
            right: 4px;
            bottom: 4px;
            width: 16px;
            height: 16px;
            cursor: se-resize;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #45475a;
            font-size: 10px;
        }

        .resize-handle:hover {
            color: #89b4fa;
        }

        /* Scrollbar styling */
        .log-entries::-webkit-scrollbar {
            width: 8px;
        }

        .log-entries::-webkit-scrollbar-track {
            background: #1e1e2e;
        }

        .log-entries::-webkit-scrollbar-thumb {
            background: #45475a;
            border-radius: 4px;
        }

        .log-entries::-webkit-scrollbar-thumb:hover {
            background: #585b70;
        }
    `]
})
export class DebugLogPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
    readonly debugLog = inject(DebugLogService);

    @ViewChild('logContainer') logContainer!: ElementRef<HTMLDivElement>;
    @ViewChild('panel') panel!: ElementRef<HTMLDivElement>;

    // Reactive position/size from service
    position = signal({ x: 20, y: 20 });
    size = signal({ width: 500, height: 400 });

    // Drag state
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };

    // Resize state
    private isResizing = false;
    private resizeStart = { x: 0, y: 0, width: 0, height: 0 };

    // Keyboard listener
    private keyboardListener = this.handleKeyboard.bind(this);

    // Auto-scroll flag
    private shouldScrollToBottom = false;
    private lastLogCount = 0;

    constructor() {
        // Sync position/size from settings
        effect(() => {
            const settings = this.debugLog.getSettings();
            this.position.set(settings.position);
            this.size.set(settings.size);
        }, { allowSignalWrites: true });

        // Track new logs for auto-scroll
        effect(() => {
            const logs = this.debugLog.logs();
            if (logs.length > this.lastLogCount) {
                this.shouldScrollToBottom = true;
            }
            this.lastLogCount = logs.length;
        });
    }

    ngOnInit(): void {
        // Global keyboard shortcut
        document.addEventListener('keydown', this.keyboardListener);

        // Mouse move/up listeners for drag/resize
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    ngOnDestroy(): void {
        document.removeEventListener('keydown', this.keyboardListener);
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom && this.logContainer) {
            const container = this.logContainer.nativeElement;
            container.scrollTop = container.scrollHeight;
            this.shouldScrollToBottom = false;
        }
    }

    // ==================== Keyboard Shortcut ====================

    private handleKeyboard(event: KeyboardEvent): void {
        // Ctrl+F1 to toggle
        if (event.ctrlKey && event.key === 'F1') {
            event.preventDefault();
            this.debugLog.toggleVisible();
        }
    }

    // ==================== Drag Handling ====================

    startDrag(event: MouseEvent): void {
        if ((event.target as HTMLElement).closest('button')) return;

        this.isDragging = true;
        this.dragOffset = {
            x: event.clientX - this.position().x,
            y: event.clientY - this.position().y
        };
        event.preventDefault();
    }

    // ==================== Resize Handling ====================

    startResize(event: MouseEvent): void {
        this.isResizing = true;
        this.resizeStart = {
            x: event.clientX,
            y: event.clientY,
            width: this.size().width,
            height: this.size().height
        };
        event.preventDefault();
        event.stopPropagation();
    }

    // ==================== Mouse Handlers ====================

    private handleMouseMove = (event: MouseEvent): void => {
        if (this.isDragging) {
            const x = Math.max(0, Math.min(event.clientX - this.dragOffset.x, window.innerWidth - 100));
            const y = Math.max(0, Math.min(event.clientY - this.dragOffset.y, window.innerHeight - 50));
            this.position.set({ x, y });
        }

        if (this.isResizing) {
            const deltaX = event.clientX - this.resizeStart.x;
            const deltaY = event.clientY - this.resizeStart.y;
            const width = Math.max(300, Math.min(this.resizeStart.width + deltaX, window.innerWidth - this.position().x));
            const height = Math.max(200, Math.min(this.resizeStart.height + deltaY, window.innerHeight - this.position().y));
            this.size.set({ width, height });
        }
    };

    private handleMouseUp = (): void => {
        if (this.isDragging) {
            this.isDragging = false;
            this.debugLog.setPosition(this.position().x, this.position().y);
        }

        if (this.isResizing) {
            this.isResizing = false;
            this.debugLog.setSize(this.size().width, this.size().height);
        }
    };

    // ==================== Helpers ====================

    formatTime(date: Date): string {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        } as any);
    }
}
