import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, BehaviorSubject } from 'rxjs';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

// Services
import { AiChatService, ChatMessage } from '../../core/services/ai-chat.service';

// Components
import { AiChatComponent } from '../../shared/components/ai-chat/ai-chat.component';
import { OnboardingDialogComponent } from '../../shared/components/onboarding-dialog.component';

// Interfaces
export interface SearchSession {
    id: string;
    name: string;
    createdAt: Date;
    lastActivity: Date;
    messageCount: number;
}

export interface SearchResult {
    id: string;
    type: 'work-item' | 'document' | 'email' | 'image' | 'json';
    title: string;
    subtitle: string;
    icon: string;
    metadata: Record<string, any>;
}

export interface PanelState {
    id: 'chat' | 'results' | 'preview';
    label: string;
    icon: string;
    visible: boolean;
    order: number;
    size: number;
    isMaximized: boolean;
    isDetached: boolean;
    detachedPosition?: { x: number; y: number; width: number; height: number };
}

@Component({
    selector: 'app-search-action',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        MenuModule,
        ScrollPanelModule,
        AvatarModule,
        BadgeModule,
        DividerModule,
        CardModule,
        TagModule,
        DialogModule,
        AiChatComponent,
        OnboardingDialogComponent,
        IconFieldModule,
        InputIconModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './search-action.component.html',
    styleUrls: ['./search-action.component.scss']
})
export class SearchActionComponent implements OnInit, OnDestroy {
    private cdr = inject(ChangeDetectorRef);
    private chatService = inject(AiChatService);
    private destroy$ = new Subject<void>();

    // Reference to the AI Chat component
    @ViewChild('chatComponent') chatComponent?: AiChatComponent;

    // Sessions
    sessions: SearchSession[] = [];
    activeSessionId: string | null = null;
    sessionSearch = '';
    sessionMenuItems: MenuItem[] = [];

    // Panels - initially only chat visible
    panels: PanelState[] = [
        { id: 'chat', label: 'AI Chat', icon: 'pi-comments', visible: true, order: 0, size: 100, isMaximized: false, isDetached: false },
        { id: 'results', label: 'Search Results', icon: 'pi-search', visible: false, order: 1, size: 0, isMaximized: false, isDetached: false },
        { id: 'preview', label: 'Preview', icon: 'pi-eye', visible: false, order: 2, size: 0, isMaximized: false, isDetached: false }
    ];
    savedPanelState: PanelState[] | null = null;

    // Search
    searchQuery = '';
    searchResults: SearchResult[] = [];
    selectedResult: SearchResult | null = null;
    isSearching = false;

    // Chat
    chatMessages: ChatMessage[] = [];
    chatInput = '';
    isChatLoading = false;

    // Mini sidebar
    miniSidebarItems = [
        { icon: 'pi-search', tooltip: 'Search', action: () => this.focusSearch() },
        { icon: 'pi-history', tooltip: 'History', action: () => this.toggleSessionsSidebar() },
        { icon: 'pi-trash', tooltip: 'Clear', action: () => this.clearSession() }
    ];

    showSessionsSidebar = true;

    // API Key dialog state
    showApiKeyDialog = signal<boolean>(false);

    ngOnInit(): void {
        this.loadSessions();
        this.loadMockSearchResults();
        this.initSessionMenu();

        // Create default session if none exists
        if (this.sessions.length === 0) {
            this.createNewSession();
        } else {
            this.selectSession(this.sessions[0]);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ========================
    // Session Management
    // ========================

    loadSessions(): void {
        const stored = localStorage.getItem('search_sessions');
        if (stored) {
            this.sessions = JSON.parse(stored).map((s: any) => ({
                ...s,
                createdAt: new Date(s.createdAt),
                lastActivity: new Date(s.lastActivity)
            }));
        }
    }

    saveSessions(): void {
        localStorage.setItem('search_sessions', JSON.stringify(this.sessions));
    }

    createNewSession(): void {
        const session: SearchSession = {
            id: 'session-' + Math.random().toString(36).substring(2, 11),
            name: `Session ${this.sessions.length + 1}`,
            createdAt: new Date(),
            lastActivity: new Date(),
            messageCount: 0
        };
        this.sessions.unshift(session);
        this.saveSessions();
        this.selectSession(session);
    }

    selectSession(session: SearchSession): void {
        this.activeSessionId = session.id;
        // Load session context
        this.chatService.getContext(session.id, 'You are a helpful AI assistant for enterprise search.')
            .pipe(takeUntil(this.destroy$))
            .subscribe(ctx => {
                this.chatMessages = ctx.messages;
                this.cdr.markForCheck();
            });
    }

    deleteSession(session: SearchSession): void {
        this.sessions = this.sessions.filter(s => s.id !== session.id);
        this.saveSessions();
        if (this.activeSessionId === session.id) {
            if (this.sessions.length > 0) {
                this.selectSession(this.sessions[0]);
            } else {
                this.createNewSession();
            }
        }
    }

    clearSession(): void {
        if (this.activeSessionId) {
            this.chatService.clearContext(this.activeSessionId);
            this.chatMessages = [];
            this.searchResults = [];
            this.selectedResult = null;
            this.cdr.markForCheck();
        }
    }

    initSessionMenu(): void {
        this.sessionMenuItems = [
            { label: 'Rename', icon: 'pi pi-pencil', command: () => { } },
            { label: 'Duplicate', icon: 'pi pi-copy', command: () => { } },
            { separator: true },
            { label: 'Delete', icon: 'pi pi-trash', styleClass: 'text-red-500' }
        ];
    }

    get filteredSessions(): SearchSession[] {
        if (!this.sessionSearch) return this.sessions;
        const search = this.sessionSearch.toLowerCase();
        return this.sessions.filter(s => s.name.toLowerCase().includes(search));
    }

    // ========================
    // Panel Management
    // ========================

    get visiblePanels(): PanelState[] {
        return this.panels
            .filter(p => p.visible && !p.isDetached)
            .sort((a, b) => a.order - b.order);
    }

    get detachedPanels(): PanelState[] {
        return this.panels.filter(p => p.isDetached);
    }

    // Dynamic panel sizes based on visible count
    get panelSizes(): number[] {
        const visible = this.visiblePanels;
        if (visible.length === 1) return [100];
        if (visible.length === 2) return [50, 50];
        return [34, 33, 33];
    }

    // Max width for panels container based on visible count
    get panelsMaxWidth(): string {
        const count = this.visiblePanels.length;
        if (count === 1) return '80%';
        if (count === 2) return '90%';
        return '100%';
    }

    togglePanel(panelId: string): void {
        const panel = this.panels.find(p => p.id === panelId);
        if (panel) {
            panel.visible = !panel.visible;
            this.cdr.markForCheck();
        }
    }

    // Close panel with visibility rules
    closePanel(panelId: string): void {
        const panel = this.panels.find(p => p.id === panelId);
        if (!panel || !panel.visible) return;

        // Preview can always be closed
        if (panelId === 'preview') {
            panel.visible = false;
            this.selectedResult = null;
            this.cdr.markForCheck();
            return;
        }

        // For chat and results: at least one must remain visible
        const chatPanel = this.panels.find(p => p.id === 'chat');
        const resultsPanel = this.panels.find(p => p.id === 'results');

        const chatVisible = chatPanel?.visible && !chatPanel?.isDetached;
        const resultsVisible = resultsPanel?.visible && !resultsPanel?.isDetached;

        // Can only close if the other one is visible
        if (panelId === 'chat' && resultsVisible) {
            panel.visible = false;
        } else if (panelId === 'results' && chatVisible) {
            panel.visible = false;
        }
        // Otherwise, cannot close - at least one of chat/results must stay visible

        this.cdr.markForCheck();
    }

    // Check if panel can be closed
    canClosePanel(panelId: string): boolean {
        if (panelId === 'preview') return true;

        const chatPanel = this.panels.find(p => p.id === 'chat');
        const resultsPanel = this.panels.find(p => p.id === 'results');

        const chatVisible = chatPanel?.visible && !chatPanel?.isDetached;
        const resultsVisible = resultsPanel?.visible && !resultsPanel?.isDetached;

        if (panelId === 'chat') return resultsVisible === true;
        if (panelId === 'results') return chatVisible === true;

        return false;
    }

    maximizePanel(panelId: string): void {
        const panel = this.panels.find(p => p.id === panelId);
        if (!panel) return;

        if (panel.isMaximized) {
            // Restore
            if (this.savedPanelState) {
                this.panels = this.savedPanelState;
                this.savedPanelState = null;
            }
        } else {
            // Save current state and maximize
            this.savedPanelState = JSON.parse(JSON.stringify(this.panels));
            this.panels.forEach(p => {
                p.visible = p.id === panelId;
                p.isMaximized = p.id === panelId;
            });
        }
        this.cdr.markForCheck();
    }

    detachPanel(panelId: string): void {
        const panel = this.panels.find(p => p.id === panelId);
        if (panel) {
            panel.isDetached = true;
            panel.detachedPosition = { x: 100, y: 100, width: 500, height: 400 };
            this.cdr.markForCheck();
        }
    }

    reattachPanel(panelId: string): void {
        const panel = this.panels.find(p => p.id === panelId);
        if (panel) {
            panel.isDetached = false;
            panel.detachedPosition = undefined;
            this.cdr.markForCheck();
        }
    }

    onPanelResize(event: any): void {
        // Update panel sizes from splitter
        const sizes = event.sizes;
        this.visiblePanels.forEach((panel, index) => {
            panel.size = sizes[index];
        });
    }

    // ========================
    // Search
    // ========================

    focusSearch(): void {
        // Focus the search input
    }

    performSearch(): void {
        if (!this.searchQuery.trim()) return;

        this.isSearching = true;

        // Show Search Results panel when searching
        const resultsPanel = this.panels.find(p => p.id === 'results');
        if (resultsPanel && !resultsPanel.visible && !resultsPanel.isDetached) {
            resultsPanel.visible = true;
        }

        // Simulate search
        setTimeout(() => {
            this.loadMockSearchResults();
            this.isSearching = false;
            this.cdr.markForCheck();
        }, 500);
    }

    loadMockSearchResults(): void {
        this.searchResults = [
            { id: '1', type: 'work-item', title: 'Server Outage Incident Report', subtitle: 'Azure DevOps #12345', icon: 'pi-ticket', metadata: { status: 'Active', assignee: 'Oleg' } },
            { id: '2', type: 'document', title: 'Q4 Financial Analysis.pdf', subtitle: 'SharePoint', icon: 'pi-file-pdf', metadata: { modified: '2 days ago' } },
            { id: '3', type: 'email', title: 'RE: Quarterly Review Meeting', subtitle: 'From: john@company.com', icon: 'pi-envelope', metadata: { date: '28.08.2025' } },
            { id: '4', type: 'image', title: 'architecture-diagram.png', subtitle: 'OneDrive', icon: 'pi-image', metadata: { size: '2.4 MB' } },
            { id: '5', type: 'work-item', title: 'Hardware Failure Investigation', subtitle: 'Azure DevOps #12346', icon: 'pi-ticket', metadata: { status: 'Resolved', assignee: 'Sascha' } }
        ];
    }

    selectSearchResult(result: SearchResult): void {
        this.selectedResult = result;

        // Show Preview panel when selecting a result
        const previewPanel = this.panels.find(p => p.id === 'preview');
        if (previewPanel && !previewPanel.visible && !previewPanel.isDetached) {
            previewPanel.visible = true;
        }

        this.cdr.markForCheck();
    }

    // ========================
    // Chat
    // ========================

    async sendChatMessage(): Promise<void> {
        if (!this.searchQuery.trim()) return;

        const message = this.searchQuery;
        this.searchQuery = '';

        // Route message to the AI Chat component
        if (this.chatComponent) {
            // Make sure chat panel is visible
            const chatPanel = this.panels.find(p => p.id === 'chat');
            if (chatPanel && !chatPanel.visible) {
                chatPanel.visible = true;
            }

            await this.chatComponent.sendExternalMessage(message);
            this.cdr.markForCheck();
        }
    }

    // ========================
    // UI Helpers
    // ========================

    toggleSessionsSidebar(): void {
        this.showSessionsSidebar = !this.showSessionsSidebar;
        this.cdr.markForCheck();
    }

    getResultIcon(type: string): string {
        const icons: Record<string, string> = {
            'work-item': 'pi-ticket',
            'document': 'pi-file',
            'email': 'pi-envelope',
            'image': 'pi-image',
            'json': 'pi-code'
        };
        return icons[type] || 'pi-file';
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // ========================
    // API Key Dialog
    // ========================

    onApiKeyNeeded(): void {
        this.showApiKeyDialog.set(true);
    }

    onApiKeySaved(): void {
        this.showApiKeyDialog.set(false);
        // Refresh the chat component's ready state
        if (this.chatComponent) {
            this.chatComponent.refreshReadyState();
        }
        this.cdr.markForCheck();
    }

    onApiKeyDialogClosed(): void {
        this.showApiKeyDialog.set(false);
    }
}
