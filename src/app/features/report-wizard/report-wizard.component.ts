import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { StepsModule } from 'primeng/steps';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { DividerModule } from 'primeng/divider';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';

// Services
import { ReportWizardService, WizardState, WizardStep } from './report-wizard.service';
import { TemplateConfigService } from '../template-editor/services/template-config.service';
import { ReportTemplateConfig } from '../template-editor/models/template-config.model';
import { ReportDataService } from '../reports/services/report-data.service';

// Components
import { AiChatComponent } from '../../shared/components/ai-chat/ai-chat.component';

@Component({
    selector: 'app-report-wizard',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        StepsModule,
        ButtonModule,
        CardModule,
        InputTextModule,
        ProgressBarModule,
        TagModule,
        TooltipModule,
        FileUploadModule,
        DividerModule,
        ScrollPanelModule,
        AvatarModule,
        BadgeModule,
        AiChatComponent
    ],
    templateUrl: './report-wizard.component.html',
    styleUrls: ['./report-wizard.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportWizardComponent implements OnInit, OnDestroy {
    private wizardService = inject(ReportWizardService);
    private templateService = inject(TemplateConfigService);
    private reportDataService = inject(ReportDataService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    // State
    state!: WizardState;
    allTemplates: ReportTemplateConfig[] = [];
    filteredTemplates: ReportTemplateConfig[] = [];
    searchQuery = '';
    isSearching = false;
    chatInput = '';

    // Wizard steps config
    steps: MenuItem[] = [
        { label: 'Select Template', icon: 'pi pi-file' },
        { label: 'Provide Information', icon: 'pi pi-upload' },
        { label: 'Review & Generate', icon: 'pi pi-check' }
    ];

    activeStepIndex = 0;

    ngOnInit(): void {
        // Reset wizard to start fresh when creating a new report
        this.wizardService.resetWizard();

        // Subscribe to wizard state
        this.wizardService.getState()
            .pipe(takeUntil(this.destroy$))
            .subscribe(state => {
                this.state = state;
                this.activeStepIndex = this.getStepIndex(state.currentStep);
                this.cdr.markForCheck();
            });

        // Load all templates
        this.templateService.getAllTemplates()
            .pipe(takeUntil(this.destroy$))
            .subscribe(templates => {
                this.allTemplates = templates.filter(t => t.status === 'published');
                this.filteredTemplates = [...this.allTemplates];
                this.cdr.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ========================
    // Step Navigation
    // ========================

    private getStepIndex(step: WizardStep): number {
        const stepMap: Record<WizardStep, number> = {
            'template-selection': 0,
            'requirements': 1,
            'review': 2
        };
        return stepMap[step];
    }

    canProceed(): boolean {
        switch (this.state.currentStep) {
            case 'template-selection':
                return this.state.selectedTemplate !== null;
            case 'requirements':
                return true; // Can always proceed (AI will warn about missing)
            case 'review':
                return this.state.progress.percentage >= 50;
            default:
                return false;
        }
    }

    onNext(): void {
        if (this.state.currentStep === 'template-selection') {
            this.wizardService.confirmTemplateSelection();
        } else {
            this.wizardService.nextStep();
        }
    }

    onBack(): void {
        this.wizardService.previousStep();
    }

    onCancel(): void {
        this.wizardService.resetWizard();
        this.router.navigate(['/reports']);
    }

    /**
     * Handle step click - only allow going backward
     */
    onStepClick(event: any): void {
        const steps: WizardStep[] = ['template-selection', 'requirements', 'review'];
        const clickedIndex = event.index;
        const currentIndex = this.getStepIndex(this.state.currentStep);

        // Only allow going backward
        if (clickedIndex < currentIndex) {
            this.wizardService.goToStep(steps[clickedIndex]);
        }
    }

    // ========================
    // Template Selection
    // ========================

    onSearch(): void {
        if (!this.searchQuery.trim()) {
            this.filteredTemplates = [...this.allTemplates];
            return;
        }

        const query = this.searchQuery.toLowerCase();
        this.filteredTemplates = this.allTemplates.filter(t =>
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        );

        // TODO: Integrate AI-powered search
    }

    selectTemplate(template: ReportTemplateConfig): void {
        this.wizardService.selectTemplate(template);
    }

    isSelected(template: ReportTemplateConfig): boolean {
        return this.state.selectedTemplate?.id === template.id;
    }

    getTemplateIcon(template: ReportTemplateConfig): string {
        // Return icon based on template type/name
        const name = template.name.toLowerCase();
        if (name.includes('damage')) return 'pi pi-car';
        if (name.includes('audit')) return 'pi pi-check-circle';
        if (name.includes('safety')) return 'pi pi-shield';
        if (name.includes('report')) return 'pi pi-file';
        return 'pi pi-file-o';
    }

    // ========================
    // Document Upload
    // ========================

    onDocumentUpload(event: any): void {
        const files = event.currentFiles || event.files || [];
        files.forEach((file: File) => {
            this.wizardService.addDocument(file);
        });
        // TODO: Trigger AI analysis of documents
    }

    removeDocument(docId: string): void {
        this.wizardService.removeDocument(docId);
    }

    getDocumentIcon(type: string): string {
        const icons: Record<string, string> = {
            'image': 'pi pi-image',
            'pdf': 'pi pi-file-pdf',
            'video': 'pi pi-video',
            'audio': 'pi pi-volume-up',
            'document': 'pi pi-file'
        };
        return icons[type] || 'pi pi-file';
    }

    // ========================
    // Requirements
    // ========================

    markRequirementFulfilled(reqId: string): void {
        this.wizardService.fulfillRequirement(reqId, true);
    }

    getLatestAiMessage(): string {
        const messages = this.state.aiMessages;
        return messages.length > 0 ? messages[messages.length - 1].text : 'Welcome! Select a template to get started.';
    }

    // ========================
    // Review & Generate
    // ========================

    generateReport(): void {
        try {
            // Generate report from wizard state
            const report = this.wizardService.generateReportFromState();

            // Save the report
            this.reportDataService.createReport(report).subscribe({
                next: (savedReport) => {
                    console.log('Report created:', savedReport);

                    // Reset wizard state
                    this.wizardService.reset();

                    // Navigate to report details page
                    this.router.navigate(['/reports', savedReport.id]);
                },
                error: (error) => {
                    console.error('Failed to create report:', error);
                    // You could add a toast notification here
                }
            });
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    }

    getDocumentName(docId: string): string {
        const doc = this.state.documents.find(d => d.id === docId);
        return doc?.name || 'Unknown';
    }

    getRequirementLabel(reqId: string): string {
        const req = this.state.requirements.find(r => r.id === reqId);
        return req?.label || 'Unknown';
    }

    getAnalyzedDocumentCount(): number {
        return this.state.documents.filter(d => d.analyzed).length;
    }

    getAiMessageIcon(type: string): string {
        const icons: Record<string, string> = {
            'info': 'pi pi-info-circle text-blue-500',
            'success': 'pi pi-check-circle text-green-500',
            'warning': 'pi pi-exclamation-triangle text-orange-500',
            'request': 'pi pi-question-circle text-purple-500'
        };
        return icons[type] || 'pi pi-circle';
    }

    getUnfulfilledRequirements() {
        return this.state.requirements.filter(r => !r.fulfilled);
    }

    // ========================
    // Pending Changes
    // ========================

    getPendingChanges() {
        return this.state.pendingChanges.filter(c => c.status === 'pending');
    }

    acceptChange(changeId: string): void {
        this.wizardService.acceptPendingChange(changeId);
    }

    rejectChange(changeId: string): void {
        this.wizardService.rejectPendingChange(changeId);
    }

    acceptAllChanges(): void {
        const pending = this.getPendingChanges();
        pending.forEach(c => this.wizardService.acceptPendingChange(c.id));
    }

    rejectAllChanges(): void {
        const pending = this.getPendingChanges();
        pending.forEach(c => this.wizardService.rejectPendingChange(c.id));
    }

    // ========================
    // AI Chat
    // ========================

    sendChatMessage(): void {
        if (!this.chatInput?.trim()) return;
        this.wizardService.sendChatMessage(this.chatInput.trim());
        this.chatInput = '';
    }

    askAi(message: string): void {
        this.wizardService.sendChatMessage(message);
    }

    clearChat(): void {
        this.wizardService.clearChat();
    }
}
