import { Component, Input, OnInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { AiChatService, ChatMessage, ChatContext } from '../../../core/services/ai-chat.service';

@Component({
    selector: 'app-ai-chat',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TooltipModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="ai-chat-container flex flex-column">
            <!-- Messages Area -->
            <div #messagesContainer class="chat-messages flex-grow-1 overflow-auto p-4">
                <!-- Empty State -->
                <div *ngIf="messages.length === 0" class="empty-state text-center py-6">
                    <i class="pi pi-comments text-5xl text-300 mb-3 block"></i>
                    <p class="text-500 m-0 text-lg">{{ emptyStateMessage }}</p>
                    <p class="text-400 mt-2 text-sm">Type a message below to start</p>
                </div>

                <!-- Messages -->
                <div *ngFor="let message of messages; trackBy: trackMessage" 
                     class="message-row mb-4"
                     [class.user-row]="message.role === 'user'"
                     [class.assistant-row]="message.role === 'assistant'">
                    
                    <!-- User Message -->
                    <div *ngIf="message.role === 'user'" class="user-message-container flex justify-content-end">
                        <div class="user-message-wrapper">
                            <div class="user-bubble">
                                {{ message.content }}
                            </div>
                            <div class="message-time text-right mt-1">
                                {{ message.timestamp | date:'dd.MM.yyyy HH:mm' }}
                            </div>
                        </div>
                    </div>

                    <!-- Assistant Message -->
                    <div *ngIf="message.role === 'assistant'" class="assistant-message-container">
                        <div class="assistant-header flex align-items-center gap-2 mb-2">
                            <div class="ai-avatar">
                                <i class="pi pi-sparkles"></i>
                            </div>
                            <span class="font-medium text-700">AI Assistant</span>
                        </div>
                        <div class="assistant-content pl-5">
                            <div *ngIf="message.isStreaming && !message.content" class="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                            <div *ngIf="message.content" 
                                 class="message-text"
                                 [innerHTML]="formatMessage(message.content)">
                            </div>
                            <div *ngIf="!message.isStreaming" class="message-time mt-2">
                                {{ message.timestamp | date:'dd.MM.yyyy HH:mm' }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input Area -->
            <div class="chat-input-area p-3 border-top-1 surface-border">
                <div class="input-wrapper flex align-items-center gap-2 p-2 surface-ground border-round-lg">
                    <i class="pi pi-plus text-500 cursor-pointer hover:text-primary"></i>
                    <input 
                        type="text"
                        [(ngModel)]="inputMessage"
                        [placeholder]="placeholder"
                        class="chat-input flex-grow-1"
                        [disabled]="isLoading || !isReady"
                        (keydown.enter)="onEnterKey($any($event))" />
                    <i class="pi pi-microphone text-500 cursor-pointer hover:text-primary"></i>
                    <span class="divider"></span>
                    <p-button 
                        label="Search"
                        [text]="true"
                        size="small"
                        severity="secondary"
                        class="mr-1">
                    </p-button>
                    <p-button 
                        label="Ask AI"
                        size="small"
                        [loading]="isLoading"
                        [disabled]="!inputMessage.trim() || !isReady"
                        (onClick)="sendMessage()">
                    </p-button>
                </div>
                <small *ngIf="!isReady" class="text-orange-500 block mt-2 text-center">
                    <i class="pi pi-info-circle mr-1"></i>
                    Configure your OpenAI API key to enable AI chat
                </small>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            height: 100%;
        }

        .ai-chat-container {
            background: var(--surface-card);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            min-height: 400px;
            height: 100%;
        }

        .chat-messages {
            min-height: 300px;
            flex: 1;
        }

        /* User Message Styles */
        .user-message-wrapper {
            max-width: 75%;
        }

        .user-bubble {
            background: #1e293b;
            color: white;
            padding: 12px 16px;
            border-radius: 12px 12px 4px 12px;
            font-size: 0.95rem;
            line-height: 1.5;
        }

        /* Assistant Message Styles */
        .ai-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--surface-200);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-color);
        }

        .assistant-content {
            color: var(--text-color);
            line-height: 1.6;
        }

        .message-time {
            font-size: 0.75rem;
            color: var(--text-color-secondary);
        }

        /* Typing Indicator */
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 8px 0;
        }

        .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--primary-color);
            animation: typing 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }

        /* Message Text Formatting */
        .message-text {
            font-size: 0.95rem;
        }

        .message-text :global(p) {
            margin: 0 0 0.75rem 0;
        }

        .message-text :global(p:last-child) {
            margin-bottom: 0;
        }

        .message-text :global(code) {
            background: var(--surface-100);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .message-text :global(pre) {
            background: var(--surface-100);
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 0.5rem 0;
        }

        /* Input Area Styles */
        .chat-input-area {
            background: var(--surface-card);
        }

        .input-wrapper {
            border: 1px solid var(--surface-border);
        }

        .chat-input {
            border: none;
            background: transparent;
            outline: none;
            font-size: 0.95rem;
            color: var(--text-color);
            padding: 8px;
        }

        .chat-input::placeholder {
            color: var(--text-color-secondary);
        }

        .divider {
            width: 1px;
            height: 24px;
            background: var(--surface-border);
        }

        .empty-state {
            padding: 3rem 0;
        }
    `]
})
export class AiChatComponent implements OnInit, OnDestroy {
    private chatService = inject(AiChatService);
    private cdr = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    /** Unique context ID for this chat instance */
    @Input() context: string = 'default';

    /** Custom system prompt for this context */
    @Input() systemPrompt: string = '';

    /** Placeholder text for input */
    @Input() placeholder: string = 'Ask AI anything...';

    /** Empty state message */
    @Input() emptyStateMessage: string = 'Start a conversation with AI';

    messages: ChatMessage[] = [];
    inputMessage: string = '';
    isLoading: boolean = false;
    isReady: boolean = false;

    ngOnInit(): void {
        this.isReady = this.chatService.isReady();

        // Subscribe to context updates
        this.chatService.getContext(this.context, this.systemPrompt)
            .pipe(takeUntil(this.destroy$))
            .subscribe(ctx => {
                this.messages = ctx.messages;
                this.cdr.markForCheck();
                this.scrollToBottom();
            });

        // Subscribe to loading state
        this.chatService.getLoadingState()
            .pipe(takeUntil(this.destroy$))
            .subscribe(loading => {
                this.isLoading = loading;
                this.cdr.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async sendMessage(): Promise<void> {
        if (!this.inputMessage.trim() || !this.isReady) return;

        const message = this.inputMessage.trim();
        this.inputMessage = '';

        await this.chatService.sendMessageWithStreaming(
            this.context,
            message,
            (chunk) => {
                this.cdr.markForCheck();
                this.scrollToBottom();
            }
        );
    }

    onEnterKey(event: KeyboardEvent): void {
        if (!event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    clearChat(): void {
        this.chatService.clearContext(this.context);
    }

    trackMessage(index: number, message: ChatMessage): string {
        return message.id;
    }

    formatMessage(content: string): string {
        // Simple markdown-like formatting
        let formatted = content
            // Escape HTML
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S] *?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Line breaks
            .replace(/\n/g, '<br>');

        return formatted;
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messagesContainer) {
                const el = this.messagesContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        }, 50);
    }
}
