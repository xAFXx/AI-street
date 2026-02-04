import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { DatePickerModule } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

export interface ResultDocument {
    id: string;
    name: string;
    reportTitle: string;
    createdAt: Date;
    lastModified: Date;
    status: 'final' | 'draft' | 'archived';
    format: 'pdf' | 'docx' | 'xlsx';
    size: string;
    downloads: number;
    emailsSent: number;
    archived: boolean;
    content?: string; // For search purposes
}

export interface DocumentStats {
    downloadHistory: { date: Date; user: string; ip: string }[];
    emailHistory: { date: Date; recipient: string; subject: string }[];
}

@Component({
    selector: 'app-results',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        TagModule,
        CheckboxModule,
        DialogModule,
        ToolbarModule,
        SelectModule,
        TooltipModule,
        ProgressBarModule,
        DatePickerModule,
        IconFieldModule,
        InputIconModule
    ],
    templateUrl: './results.component.html',
    styleUrls: ['./results.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultsComponent implements OnInit {
    documents: ResultDocument[] = [];
    filteredDocuments: ResultDocument[] = [];

    // Search
    searchText = '';
    showAdvancedSearch = false;
    advancedSearchName = '';
    advancedSearchContent = '';
    searchMode: 'contains' | 'exact' = 'contains';

    // Filters
    showArchived = false;

    // Sorting
    sortField = 'createdAt';
    sortOrder = -1; // -1 = descending, 1 = ascending

    // Dialogs
    showStatsDialog = false;
    showEmailDialog = false;
    selectedDocument: ResultDocument | null = null;
    selectedDocStats: DocumentStats | null = null;

    // Email form
    emailRecipient = '';
    emailSubject = '';
    emailMessage = '';

    formatOptions = [
        { label: 'All Formats', value: null },
        { label: 'PDF', value: 'pdf' },
        { label: 'Word', value: 'docx' },
        { label: 'Excel', value: 'xlsx' }
    ];
    selectedFormat: string | null = null;

    constructor(private cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.loadDocuments();
    }

    private loadDocuments(): void {
        // Mock data - in production this would come from a service
        this.documents = [
            {
                id: '1',
                name: 'Damage Assessment Report - Vehicle A',
                reportTitle: 'Quarterly Damage Report Q1 2024',
                createdAt: new Date('2024-03-15'),
                lastModified: new Date('2024-03-18'),
                status: 'final',
                format: 'pdf',
                size: '2.4 MB',
                downloads: 12,
                emailsSent: 3,
                archived: false,
                content: 'Vehicle damage assessment with photographic evidence showing front bumper impact.'
            },
            {
                id: '2',
                name: 'Insurance Claim Summary',
                reportTitle: 'Claim #2024-0892',
                createdAt: new Date('2024-03-10'),
                lastModified: new Date('2024-03-12'),
                status: 'final',
                format: 'pdf',
                size: '1.8 MB',
                downloads: 8,
                emailsSent: 5,
                archived: false,
                content: 'Complete insurance documentation for property damage claim.'
            },
            {
                id: '3',
                name: 'Technical Inspection Report',
                reportTitle: 'Annual Vehicle Inspection 2024',
                createdAt: new Date('2024-02-28'),
                lastModified: new Date('2024-03-01'),
                status: 'final',
                format: 'docx',
                size: '3.2 MB',
                downloads: 5,
                emailsSent: 2,
                archived: false,
                content: 'Comprehensive technical inspection including engine diagnostics and safety systems.'
            },
            {
                id: '4',
                name: 'SRPM Audit Report - Phase 2',
                reportTitle: 'Social Responsible Process Management',
                createdAt: new Date('2024-01-20'),
                lastModified: new Date('2024-01-25'),
                status: 'final',
                format: 'pdf',
                size: '4.1 MB',
                downloads: 24,
                emailsSent: 8,
                archived: false,
                content: 'Phase 2 audit report covering management responsibility and chain management.'
            },
            {
                id: '5',
                name: 'Archived - Old Damage Report',
                reportTitle: 'Legacy Report 2023',
                createdAt: new Date('2023-06-15'),
                lastModified: new Date('2023-06-20'),
                status: 'archived',
                format: 'pdf',
                size: '1.5 MB',
                downloads: 45,
                emailsSent: 12,
                archived: true,
                content: 'Historical damage assessment report from previous year.'
            },
            {
                id: '6',
                name: 'Financial Summary Report',
                reportTitle: 'Q4 2023 Financial Overview',
                createdAt: new Date('2023-12-30'),
                lastModified: new Date('2024-01-05'),
                status: 'archived',
                format: 'xlsx',
                size: '890 KB',
                downloads: 18,
                emailsSent: 4,
                archived: true,
                content: 'Financial data export with cost analysis and budget projections.'
            }
        ];

        this.applyFilters();
    }

    applyFilters(): void {
        let result = [...this.documents];

        // Filter by archived status
        if (!this.showArchived) {
            result = result.filter(doc => !doc.archived);
        }

        // Filter by format
        if (this.selectedFormat) {
            result = result.filter(doc => doc.format === this.selectedFormat);
        }

        // Apply search
        if (this.showAdvancedSearch) {
            result = this.applyAdvancedSearch(result);
        } else if (this.searchText.trim()) {
            const search = this.searchText.toLowerCase();
            result = result.filter(doc =>
                doc.name.toLowerCase().includes(search) ||
                doc.reportTitle.toLowerCase().includes(search) ||
                doc.content?.toLowerCase().includes(search) ||
                doc.format.toLowerCase().includes(search)
            );
        }

        this.filteredDocuments = result;
        this.cdr.markForCheck();
    }

    private applyAdvancedSearch(docs: ResultDocument[]): ResultDocument[] {
        let result = docs;

        if (this.advancedSearchName.trim()) {
            const nameSearch = this.advancedSearchName.toLowerCase();
            if (this.searchMode === 'exact') {
                result = result.filter(doc => doc.name.toLowerCase() === nameSearch);
            } else {
                result = result.filter(doc => doc.name.toLowerCase().includes(nameSearch));
            }
        }

        if (this.advancedSearchContent.trim()) {
            const contentSearch = this.advancedSearchContent.toLowerCase();
            if (this.searchMode === 'exact') {
                result = result.filter(doc => doc.content?.toLowerCase().includes(` ${contentSearch} `));
            } else {
                result = result.filter(doc => doc.content?.toLowerCase().includes(contentSearch));
            }
        }

        return result;
    }

    onSearchChange(): void {
        this.applyFilters();
    }

    toggleAdvancedSearch(): void {
        this.showAdvancedSearch = !this.showAdvancedSearch;
        if (!this.showAdvancedSearch) {
            this.advancedSearchName = '';
            this.advancedSearchContent = '';
            this.applyFilters();
        }
    }

    clearSearch(): void {
        this.searchText = '';
        this.advancedSearchName = '';
        this.advancedSearchContent = '';
        this.applyFilters();
    }

    toggleArchived(): void {
        this.applyFilters();
    }

    // Document actions
    downloadDocument(doc: ResultDocument): void {
        // In production, this would trigger actual download
        doc.downloads++;
        console.log('Downloading:', doc.name);
        this.cdr.markForCheck();
    }

    openEmailDialog(doc: ResultDocument): void {
        this.selectedDocument = doc;
        this.emailRecipient = '';
        this.emailSubject = `Document: ${doc.name}`;
        this.emailMessage = `Please find attached the document "${doc.name}" from report "${doc.reportTitle}".`;
        this.showEmailDialog = true;
        this.cdr.markForCheck();
    }

    sendEmail(): void {
        if (this.selectedDocument && this.emailRecipient) {
            this.selectedDocument.emailsSent++;
            console.log('Email sent to:', this.emailRecipient);
            this.showEmailDialog = false;
            this.cdr.markForCheck();
        }
    }

    openStatsDialog(doc: ResultDocument): void {
        this.selectedDocument = doc;
        // Mock stats data
        this.selectedDocStats = {
            downloadHistory: [
                { date: new Date('2024-03-18T10:30:00'), user: 'john.doe@company.com', ip: '192.168.1.100' },
                { date: new Date('2024-03-17T14:15:00'), user: 'jane.smith@company.com', ip: '192.168.1.105' },
                { date: new Date('2024-03-15T09:00:00'), user: 'mike.wilson@partner.com', ip: '10.0.0.50' }
            ],
            emailHistory: [
                { date: new Date('2024-03-16T11:00:00'), recipient: 'client@external.com', subject: 'Document delivery' },
                { date: new Date('2024-03-14T16:30:00'), recipient: 'review@partner.com', subject: 'For review' }
            ]
        };
        this.showStatsDialog = true;
        this.cdr.markForCheck();
    }

    archiveDocument(doc: ResultDocument): void {
        doc.archived = true;
        doc.status = 'archived';
        this.applyFilters();
    }

    unarchiveDocument(doc: ResultDocument): void {
        doc.archived = false;
        doc.status = 'final';
        this.applyFilters();
    }

    getFormatIcon(format: string): string {
        switch (format) {
            case 'pdf': return 'pi pi-file-pdf';
            case 'docx': return 'pi pi-file-word';
            case 'xlsx': return 'pi pi-file-excel';
            default: return 'pi pi-file';
        }
    }

    getFormatSeverity(format: string): 'danger' | 'info' | 'success' | 'secondary' {
        switch (format) {
            case 'pdf': return 'danger';
            case 'docx': return 'info';
            case 'xlsx': return 'success';
            default: return 'secondary';
        }
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'secondary' {
        switch (status) {
            case 'final': return 'success';
            case 'draft': return 'info';
            case 'archived': return 'secondary';
            default: return 'secondary';
        }
    }

    sortBy(field: string): void {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder * -1;
        } else {
            this.sortField = field;
            this.sortOrder = 1;
        }
        this.cdr.markForCheck();
    }
}
