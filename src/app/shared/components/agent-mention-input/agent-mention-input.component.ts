import {
    Component, ElementRef, EventEmitter, HostListener,
    Input, OnDestroy, OnInit, Output, ViewChild,
    signal, computed, inject, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AgentService } from '../../services/agent.service';
import { AIAgentDto } from '../../../features/ai-management/api/ai-management.models';

/** Data emitted on submit */
export interface MentionMessage {
    text: string;
    agent: AIAgentDto | null;
}

/**
 * Agent Mention Editor
 *
 * A rich contenteditable input that supports inline @mention chips.
 * When the user types "@", a dropdown of AI agents appears. Selecting an agent
 * inserts an inline, non-editable tag/chip directly into the text flow.
 *
 * Usage:
 * ```html
 * <app-agent-mention-editor
 *     placeholder="Ask or search anything..."
 *     (messageSent)="onMessage($event)"
 * ></app-agent-mention-editor>
 * ```
 */
@Component({
    selector: 'app-agent-mention-editor',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './agent-mention-input.component.html',
    styleUrls: ['./agent-mention-input.component.less']
})
export class AgentMentionEditorComponent implements OnInit, OnDestroy, AfterViewInit {
    private readonly agentService = inject(AgentService);

    @Input() placeholder = 'Type @ to mention an agent...';

    /** Emitted on Enter (without Shift) */
    @Output() messageSent = new EventEmitter<MentionMessage>();

    /** Emitted when an agent is selected */
    @Output() agentSelected = new EventEmitter<AIAgentDto>();

    /** Emitted when an agent chip is removed */
    @Output() agentCleared = new EventEmitter<void>();

    @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;

    // ==================== State ====================

    allAgents = signal<AIAgentDto[]>([]);
    mentionFilter = signal('');
    showDropdown = signal(false);
    highlightIndex = signal(0);
    isEmpty = signal(true);

    filteredAgents = computed(() => {
        const filter = this.mentionFilter().toLowerCase();
        const agents = this.allAgents();
        if (!filter) return agents;
        return agents.filter(a =>
            a.name?.toLowerCase().includes(filter) ||
            a.description?.toLowerCase().includes(filter)
        );
    });

    private agentSub?: Subscription;
    private mentionAnchorNode: Node | null = null;
    private mentionAnchorOffset = 0;
    private currentAgent: AIAgentDto | null = null;

    // ==================== Lifecycle ====================

    ngOnInit(): void {
        this.agentSub = this.agentService.getAgents().subscribe(agents => {
            this.allAgents.set(agents);
        });
    }

    ngAfterViewInit(): void {
        // Set initial focus state
        this.checkEmpty();
    }

    ngOnDestroy(): void {
        this.agentSub?.unsubscribe();
    }

    // ==================== Editor Events ====================

    onEditorInput(): void {
        this.checkEmpty();
        this.detectMention();
    }

    onEditorKeydown(event: KeyboardEvent): void {
        // Handle dropdown navigation
        if (this.showDropdown()) {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    this.highlightIndex.set(
                        (this.highlightIndex() + 1) % this.filteredAgents().length
                    );
                    return;

                case 'ArrowUp':
                    event.preventDefault();
                    this.highlightIndex.set(
                        (this.highlightIndex() - 1 + this.filteredAgents().length) % this.filteredAgents().length
                    );
                    return;

                case 'Enter':
                case 'Tab':
                    if (this.filteredAgents().length > 0) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.selectAgent(this.filteredAgents()[this.highlightIndex()]);
                    }
                    return;

                case 'Escape':
                    event.preventDefault();
                    this.showDropdown.set(false);
                    return;
            }
        }

        // Enter = submit (without dropdown open)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.submit();
        }
    }

    onEditorBlur(): void {
        // Delay so click on dropdown items fires first
        setTimeout(() => this.showDropdown.set(false), 200);
    }

    // ==================== Mention Detection ====================

    private detectMention(): void {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;

        // Only detect in text nodes (not inside chips)
        if (node.nodeType !== Node.TEXT_NODE) {
            this.showDropdown.set(false);
            return;
        }

        const text = node.textContent ?? '';
        const cursorOffset = range.startOffset;
        const textBeforeCursor = text.substring(0, cursorOffset);

        // Find the last '@' before cursor
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex >= 0) {
            const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
            if (charBefore === ' ' || charBefore === '\u00a0' || lastAtIndex === 0) {
                const filterText = textBeforeCursor.substring(lastAtIndex + 1);
                if (!filterText.includes(' ')) {
                    this.mentionAnchorNode = node;
                    this.mentionAnchorOffset = lastAtIndex;
                    this.mentionFilter.set(filterText);
                    this.highlightIndex.set(0);
                    this.showDropdown.set(true);
                    return;
                }
            }
        }

        this.showDropdown.set(false);
    }

    // ==================== Agent Selection ====================

    selectAgent(agent: AIAgentDto): void {
        if (!this.mentionAnchorNode) return;

        const editor = this.editorRef.nativeElement;
        const textNode = this.mentionAnchorNode;
        const text = textNode.textContent ?? '';
        const sel = window.getSelection();
        const cursorOffset = sel?.getRangeAt(0).startOffset ?? text.length;

        // Split text: before @, after cursor
        const before = text.substring(0, this.mentionAnchorOffset);
        const after = text.substring(cursorOffset);

        // Create chip element
        const chip = this.createChipElement(agent);

        // Replace text node with: [beforeText] [chip] [space + afterText]
        const parent = textNode.parentNode!;

        // Text before @
        if (before) {
            parent.insertBefore(document.createTextNode(before), textNode);
        }

        // The chip
        parent.insertBefore(chip, textNode);

        // Space + remaining text (use \u00a0 non-breaking space to keep cursor visible)
        const afterNode = document.createTextNode('\u00a0' + after);
        parent.insertBefore(afterNode, textNode);

        // Remove original text node
        parent.removeChild(textNode);

        // Place cursor after the chip (in the afterNode)
        const newRange = document.createRange();
        newRange.setStart(afterNode, 1);
        newRange.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(newRange);

        this.currentAgent = agent;
        this.showDropdown.set(false);
        this.checkEmpty();
        this.agentSelected.emit(agent);

        editor.focus();
    }

    private createChipElement(agent: AIAgentDto): HTMLElement {
        const chip = document.createElement('span');
        chip.className = 'mention-chip';
        chip.contentEditable = 'false';
        chip.dataset['agentId'] = String(agent.id ?? '');
        chip.dataset['agentName'] = agent.name ?? 'Agent';

        const initials = (agent.name ?? 'A').substring(0, 2).toUpperCase();
        const hash = (agent.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const colorClass = `avatar-color-${hash % 5}`;

        chip.innerHTML = `<span class="mention-chip__avatar ${colorClass}">${initials}</span>`
            + `<span class="mention-chip__name">${this.escapeHtml(agent.name ?? 'Agent')}</span>`;

        return chip;
    }

    // ==================== Submit ====================

    private submit(): void {
        const editor = this.editorRef.nativeElement;
        const text = this.getPlainText(editor);

        if (!text.trim()) return;

        // Find the agent from any chip in the editor
        const chipEl = editor.querySelector('.mention-chip') as HTMLElement | null;
        let agent: AIAgentDto | null = this.currentAgent;

        if (chipEl && !agent) {
            const agentId = chipEl.dataset['agentId'];
            agent = this.allAgents().find(a => String(a.id) === agentId) ?? null;
        }

        this.messageSent.emit({ text: text.trim(), agent });

        // Clear the editor
        editor.innerHTML = '';
        this.currentAgent = null;
        this.checkEmpty();
    }

    /** Extract plain text, replacing chips with @AgentName */
    private getPlainText(el: HTMLElement): string {
        let text = '';
        el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent ?? '';
            } else if (node instanceof HTMLElement) {
                if (node.classList.contains('mention-chip')) {
                    text += `@${node.dataset['agentName'] ?? ''}`;
                } else {
                    text += this.getPlainText(node);
                }
            }
        });
        return text;
    }

    // ==================== Helpers ====================

    private checkEmpty(): void {
        const editor = this.editorRef?.nativeElement;
        if (!editor) return;
        const text = editor.textContent?.trim() ?? '';
        const hasChip = !!editor.querySelector('.mention-chip');
        this.isEmpty.set(!text && !hasChip);
    }

    getAvatarInitials(agent: AIAgentDto): string {
        return (agent.name ?? 'A').substring(0, 2).toUpperCase();
    }

    getAvatarColorClass(agent: AIAgentDto): string {
        const hash = (agent.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return `avatar-color-${hash % 5}`;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /** Scroll highlighted dropdown item into view */
    scrollToHighlighted(): void {
        setTimeout(() => {
            const el = document.querySelector('.mention-dropdown .agent-item.active');
            el?.scrollIntoView({ block: 'nearest' });
        });
    }

    /** Public method to focus the editor */
    focus(): void {
        this.editorRef?.nativeElement?.focus();
    }
}
