import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';

import { Report } from './models/report.model';
import { ReportDataService } from './services/report-data.service';

@Component({
    selector: 'app-reports-page',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        TagModule,
        ToolbarModule,
        TooltipModule,
        DialogModule,
        FormsModule
    ],
    templateUrl: './reports-page.component.html',
    styleUrls: ['./reports-page.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsPageComponent implements OnInit {
    reports: Report[] = [];
    searchValue: string = '';
    showNewReportModal = false;
    newReportTitle = '';

    constructor(
        private router: Router,
        private reportDataService: ReportDataService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadReports();
    }

    private loadReports(): void {
        this.reportDataService.getAllReports().subscribe(reports => {
            this.reports = reports;
            this.cdr.markForCheck();
        });
    }

    getStatusSeverity(status: string): 'secondary' | 'info' | 'success' {
        switch (status) {
            case 'Draft': return 'secondary';
            case 'Final': return 'info';
            case 'Approved': return 'success';
            default: return 'secondary';
        }
    }

    getProgressColor(progress: number): string {
        if (progress >= 80) return '#22c55e'; // Green
        if (progress >= 40) return '#eab308'; // Yellow
        return '#94a3b8'; // Gray
    }

    viewReport(reportId: string): void {
        this.router.navigate(['/reports', reportId]);
    }

    createNewReport(): void {
        // Navigate to AI-guided report wizard
        this.router.navigate(['/report-wizard']);
    }

    saveNewReport(): void {
        if (!this.newReportTitle.trim()) return;

        // Generate a new report ID
        const newId = 'new-' + Date.now().toString(36);

        // Create new report in service (could add a proper createReport method)
        const newReport: Report = {
            id: newId,
            title: this.newReportTitle.trim(),
            template: 'Custom Report',
            status: 'Draft',
            lastModified: new Date(),
            progress: 0,
            chapters: [
                {
                    key: 'section-1',
                    label: '1. Introduction',
                    expanded: true,
                    children: [
                        { key: 'overview', label: '1.1 Overview', blocks: [] }
                    ]
                }
            ],
            referenceDocs: []
        };

        // Save to service so it's available on details page
        this.reportDataService.createReport(newReport).subscribe(() => {
            this.showNewReportModal = false;
            // Navigate to the new report
            this.router.navigate(['/reports', newId]);
        });
    }

    deleteReport(reportId: string): void {
        console.log('Delete report:', reportId);
        // Implement delete logic
    }

    onGlobalFilter(table: any, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }
}
