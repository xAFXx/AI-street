import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { TemplateConfigService } from './services/template-config.service';
import { ReportTemplateConfig } from './models/template-config.model';

@Component({
    selector: 'app-report-frameworks',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        ToolbarModule,
        TagModule,
        TooltipModule,
        InputTextModule,
        ConfirmDialogModule,
        MenuModule
    ],
    providers: [ConfirmationService],
    templateUrl: './report-frameworks.component.html',
    styleUrls: ['./report-frameworks.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportFrameworksComponent implements OnInit {
    templates: ReportTemplateConfig[] = [];
    loading = true;

    constructor(
        private router: Router,
        private templateService: TemplateConfigService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadTemplates();
    }

    private loadTemplates(): void {
        this.loading = true;
        this.templateService.getAllTemplates().subscribe(templates => {
            this.templates = templates;
            this.loading = false;
            this.cdr.markForCheck();
        });
    }

    createNew(): void {
        this.router.navigate(['/template-editor/new']);
    }

    editTemplate(template: ReportTemplateConfig): void {
        this.router.navigate(['/template-editor', template.id]);
    }

    duplicateTemplate(template: ReportTemplateConfig): void {
        this.templateService.duplicateTemplate(template.id).subscribe(duplicate => {
            if (duplicate) {
                this.loadTemplates();
            }
        });
    }

    confirmDelete(template: ReportTemplateConfig): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
            header: 'Delete Framework',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.templateService.deleteTemplate(template.id).subscribe(success => {
                    if (success) {
                        this.loadTemplates();
                    }
                });
            }
        });
    }

    publishTemplate(template: ReportTemplateConfig): void {
        this.templateService.publishTemplate(template.id).subscribe(updated => {
            if (updated) {
                this.loadTemplates();
            }
        });
    }

    unpublishTemplate(template: ReportTemplateConfig): void {
        this.templateService.unpublishTemplate(template.id).subscribe(updated => {
            if (updated) {
                this.loadTemplates();
            }
        });
    }

    getStatusSeverity(status: string): 'success' | 'secondary' {
        return status === 'published' ? 'success' : 'secondary';
    }

    getChapterCount(template: ReportTemplateConfig): number {
        let count = 0;
        const countChapters = (chapters: any[]) => {
            chapters.forEach(ch => {
                count++;
                if (ch.children) countChapters(ch.children);
            });
        };
        countChapters(template.chapters);
        return count;
    }

    onGlobalFilter(dt: any, event: Event): void {
        dt.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }
}
