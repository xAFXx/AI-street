import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';

// API Layer
import { AIManagementApiService, AIAgentDto, CreateAIAgentInput, UpdateAIAgentInput } from './api';

/**
 * AI Management Component
 *
 * Admin CRUD screen for configuring AI agents that power
 * the enterprise-search chat system.
 * 
 * Features:
 * - Paginated agent table with search filter
 * - Create/Edit dialog with tabbed Reactive Form
 * - Delete confirmation
 * - Reset single / reset all agents
 * - Deep-link to agent via /:agentId route param
 */
@Component({
    selector: 'app-ai-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        ProgressSpinnerModule,
        TooltipModule,
        DialogModule,
        ConfirmDialogModule,
        ToastModule,
        TextareaModule,
        InputNumberModule,
        TagModule,
        IconFieldModule,
        InputIconModule,
        TabsModule,
        CheckboxModule,
    ],
    providers: [AIManagementApiService, ConfirmationService, MessageService],
    templateUrl: './ai-management.component.html',
    styleUrls: ['./ai-management.component.less']
})
export class AIManagementComponent implements OnInit, OnDestroy {
    private readonly api = inject(AIManagementApiService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly activatedRoute = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);

    // ==================== State ====================

    agents = signal<AIAgentDto[]>([]);
    totalCount = signal(0);
    loading = signal(false);
    saving = signal(false);
    searchFilter = signal('');

    // Debounced search
    private search$ = new Subject<string>();
    private destroy$ = new Subject<void>();

    // Pagination
    first = signal(0);
    rows = signal(10);

    // Dialog
    showDialog = signal(false);
    isEditMode = signal(false);
    editingAgentId = signal<string | null>(null);

    // Active tab in dialog
    activeTabIndex = signal(0);

    // ==================== Form ====================

    agentForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(64)]],
        description: ['', [Validators.required, Validators.maxLength(1024)]],
        internalInstruction: ['', [Validators.required, Validators.maxLength(10240)]],
        externalInstruction: ['', [Validators.maxLength(1024)]],
        source: ['', [Validators.maxLength(64)]],
        destination: ['', [Validators.maxLength(64)]],
        path: ['', [Validators.maxLength(64)]],
        authentication: ['', [Validators.maxLength(64)]],
        content: ['', [Validators.maxLength(256)]],
        avatar: ['', [Validators.maxLength(64)]],
        mainLanguage: ['', [Validators.maxLength(64)]],
        maxTokens: [null],
        allowFunctionCalling: [false],
        enabled: [false],
    });

    // ==================== Computed ====================

    readonly dialogTitle = computed(() =>
        this.isEditMode() ? 'Edit AI Agent' : 'Create AI Agent'
    );

    // ==================== Lifecycle ====================

    ngOnInit(): void {
        // Wire up debounced search
        this.search$.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.searchFilter.set(value);
            this.first.set(0);
            this.loadAgents();
        });

        this.loadAgents();

        // Deep-link: auto-open agent for editing
        const agentId = this.activatedRoute.snapshot.paramMap.get('agentId');
        if (agentId) {
            this.editingAgentId.set(agentId);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ==================== Data Loading ====================

    loadAgents(): void {
        this.loading.set(true);
        this.api.getAIAgents({
            filter: this.searchFilter() || undefined,
            skipCount: this.first(),
            maxResultCount: this.rows(),
        }).subscribe({
            next: (result) => {
                this.agents.set(result.items ?? []);
                this.totalCount.set(result.totalCount ?? 0);
                this.loading.set(false);

                // Handle deep-link: open edit modal for the linked agent
                const pendingId = this.editingAgentId();
                if (pendingId) {
                    const agent = this.agents().find(a => a.id === pendingId);
                    if (agent) {
                        this.openEditDialog(agent);
                    }
                    this.editingAgentId.set(null);
                }
            },
            error: (err) => {
                console.error('Failed to load AI agents:', err);
                this.loading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load AI agents'
                });
            }
        });
    }

    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.loadAgents();
    }

    onSearch(value: string): void {
        this.search$.next(value);
    }

    // ==================== Create / Edit ====================

    openCreateDialog(): void {
        this.isEditMode.set(false);
        this.agentForm.reset({
            allowFunctionCalling: false,
            enabled: false,
        });
        this.activeTabIndex.set(0);
        this.showDialog.set(true);
    }

    openEditDialog(agent: AIAgentDto): void {
        this.isEditMode.set(true);
        this.editingAgentId.set(agent.id ?? null);
        this.agentForm.patchValue({
            name: agent.name ?? '',
            description: agent.description ?? '',
            internalInstruction: agent.internalInstruction ?? '',
            externalInstruction: agent.externalInstruction ?? '',
            source: agent.source ?? '',
            destination: agent.destination ?? '',
            path: agent.path ?? '',
            authentication: agent.authentication ?? '',
            content: agent.content ?? '',
            avatar: agent.avatar ?? '',
            mainLanguage: agent.mainLanguage ?? '',
            maxTokens: agent.maxTokens ?? null,
            allowFunctionCalling: agent.allowFunctionCalling ?? false,
            enabled: agent.enabled ?? false,
        });
        this.activeTabIndex.set(0);
        this.showDialog.set(true);
    }

    saveAgent(): void {
        if (this.agentForm.invalid) {
            this.agentForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        const formValue = this.agentForm.getRawValue();

        if (this.isEditMode() && this.editingAgentId()) {
            const input: UpdateAIAgentInput = {
                id: this.editingAgentId()!,
                ...formValue
            };
            this.api.updateAIAgent(input).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.showDialog.set(false);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Saved',
                        detail: 'AI agent updated successfully'
                    });
                    this.loadAgents();
                },
                error: () => {
                    this.saving.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update AI agent'
                    });
                }
            });
        } else {
            const input: CreateAIAgentInput = formValue;
            this.api.createAIAgent(input).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.showDialog.set(false);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Created',
                        detail: 'AI agent created successfully'
                    });
                    this.loadAgents();
                },
                error: () => {
                    this.saving.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to create AI agent'
                    });
                }
            });
        }
    }

    // ==================== Delete ====================

    confirmDelete(agent: AIAgentDto, event: Event): void {
        if (!agent.id) return;
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Delete agent "${agent.name}"? This action cannot be undone.`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.deleteAgent(agent.id!)
        });
    }

    private deleteAgent(id: string): void {
        this.api.deleteAIAgent(id).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: 'AI agent deleted successfully'
                });
                this.loadAgents();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to delete AI agent'
                });
            }
        });
    }

    // ==================== Reset ====================

    confirmReset(agent: AIAgentDto, event: Event): void {
        if (!agent.id) return;
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Reset agent "${agent.name}"? This will clear its conversation history and memory.`,
            header: 'Confirm Reset',
            icon: 'pi pi-refresh',
            accept: () => this.resetAgent(agent.id!)
        });
    }

    private resetAgent(id: string): void {
        this.api.resetAIModel(id).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Reset',
                    detail: 'AI agent reset successfully'
                });
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to reset AI agent'
                });
            }
        });
    }

    confirmResetAll(event: Event): void {
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: 'Reset ALL AI agents? This will clear conversation history and memory for every agent.',
            header: 'Confirm Reset All',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.resetAllAgents()
        });
    }

    private resetAllAgents(): void {
        this.api.resetAllAIModels().subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Reset',
                    detail: 'All AI agents reset successfully'
                });
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to reset AI agents'
                });
            }
        });
    }

    // ==================== Helpers ====================

    truncateText(text: string | undefined, maxLength: number = 80): string {
        if (!text) return '—';
        return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
    }
}
