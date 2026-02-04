import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SplitterModule } from 'primeng/splitter';
import { ListboxModule } from 'primeng/listbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';

// JSON Editor
import { JsonEditorComponent as AngJsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';

// Shared Components
import { JsonDataViewerComponent } from '../../shared/components/json-data-viewer/json-data-viewer.component';

// API Layer
import { VdbApiService, VirtualDbDto, VirtualDbRowDto, SaveToVirtualDbInput } from './api';

/**
 * VDB (Virtual Database) App Component
 * 
 * A Redis web client for browsing and editing key-value data.
 * Features:
 * - Browse tables (Redis key namespaces)
 * - View keys within each table
 * - View and edit values
 */
@Component({
    selector: 'app-vdb',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        CardModule,
        ProgressSpinnerModule,
        MessageModule,
        TooltipModule,
        DialogModule,
        SplitterModule,
        ListboxModule,
        ConfirmDialogModule,
        ToastModule,
        SkeletonModule,
        TextareaModule,
        InputNumberModule,
        TagModule,
        AngJsonEditorComponent,
        JsonDataViewerComponent
    ],
    providers: [VdbApiService, ConfirmationService, MessageService],
    templateUrl: './vdb-app.component.html',
    styleUrls: ['./vdb-app.component.less']
})
export class VdbAppComponent implements OnInit {
    private readonly vdbApi = inject(VdbApiService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);

    // Data State
    tables = signal<VirtualDbDto[]>([]);
    rows = signal<VirtualDbRowDto[]>([]);
    selectedTable = signal<VirtualDbDto | null>(null);
    selectedRow = signal<VirtualDbRowDto | null>(null);

    // Preview View Mode
    valueViewMode = signal<'friendly' | 'technical' | 'code'>('friendly');

    // Loading State
    isLoadingTables = signal(false);
    isLoadingRows = signal(false);
    isSaving = signal(false);

    // Search/Filter
    tableFilter = '';
    keyFilter = '';

    // Edit Dialog State
    showEditDialog = false;
    showAddDialog = false;
    editDialogMaximized = signal(false);
    editKey = '';
    editValue = '';
    editTtl = 7;
    editData: object = {};

    // JSON Editor Options (for editing)
    jsonEditorOptions: JsonEditorOptions = new JsonEditorOptions();

    // JSON Editor Options (for preview - readonly)
    previewEditorOptions: JsonEditorOptions = new JsonEditorOptions();

    constructor() {
        // Editor mode - editable tree
        this.jsonEditorOptions.mode = 'tree';
        this.jsonEditorOptions.modes = ['tree', 'code', 'text'];
        this.jsonEditorOptions.expandAll = true;

        // Preview mode - readonly view
        this.previewEditorOptions.mode = 'view';
        this.previewEditorOptions.modes = ['view', 'tree', 'code'];
        this.previewEditorOptions.mainMenuBar = false;
        this.previewEditorOptions.navigationBar = false;
        this.previewEditorOptions.statusBar = false;
        this.previewEditorOptions.expandAll = true;
    }

    // Computed
    readonly filteredTables = computed(() => {
        const filter = this.tableFilter.toLowerCase();
        if (!filter) return this.tables();
        return this.tables().filter(t => t.name?.toLowerCase().includes(filter));
    });

    readonly filteredRows = computed(() => {
        const filter = this.keyFilter.toLowerCase();
        if (!filter) return this.rows();
        return this.rows().filter(r => r.key?.toLowerCase().includes(filter));
    });

    readonly selectedTableName = computed(() => this.selectedTable()?.name || '');
    readonly totalKeys = computed(() => this.rows().length);

    ngOnInit(): void {
        this.loadTables();
    }

    // ==================== Table Operations ====================

    loadTables(): void {
        this.isLoadingTables.set(true);
        this.vdbApi.getVirtualDbs({ maxResultCount: 1000 }).subscribe({
            next: (result) => {
                this.tables.set(result?.items ?? []);
                this.isLoadingTables.set(false);
            },
            error: (err) => {
                console.error('Failed to load tables:', err);
                this.isLoadingTables.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load tables'
                });
            }
        });
    }

    selectTable(table: VirtualDbDto): void {
        this.selectedTable.set(table);
        this.selectedRow.set(null);
        this.keyFilter = '';
        if (table.name) {
            this.loadRows(table.name);
        }
    }

    confirmDeleteTable(table: VirtualDbDto, event: Event): void {
        if (!table.name) return;
        event.stopPropagation();
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Delete table "${table.name}" and all its data?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.deleteTable(table.name!)
        });
    }

    deleteTable(name: string): void {
        this.vdbApi.deleteVirtualDb(name).subscribe({
            next: () => {
                if (this.selectedTable()?.name === name) {
                    this.selectedTable.set(null);
                    this.rows.set([]);
                }
                this.loadTables();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `Table "${name}" deleted`
                });
            },
            error: (err) => {
                console.error('Failed to delete table:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to delete table'
                });
            }
        });
    }

    // ==================== Row Operations ====================

    loadRows(tableName: string): void {
        this.isLoadingRows.set(true);
        this.vdbApi.getVirtualDbRows({
            databaseName: tableName,
            maxResultCount: 1000
        }).subscribe({
            next: (result) => {
                this.rows.set(result?.items ?? []);
                this.isLoadingRows.set(false);
            },
            error: (err) => {
                console.error('Failed to load rows:', err);
                this.isLoadingRows.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load keys'
                });
            }
        });
    }

    selectRow(row: VirtualDbRowDto): void {
        this.selectedRow.set(row);
    }

    // ==================== Edit Operations ====================

    openAddDialog(): void {
        this.editKey = '';
        this.editValue = '';
        this.editData = {};
        this.editTtl = 7;
        this.showAddDialog = true;
    }

    openEditDialog(row: VirtualDbRowDto): void {
        this.editKey = row.key || '';
        // Parse the value for the JSON editor
        try {
            if (typeof row.value === 'string') {
                this.editData = JSON.parse(row.value);
            } else {
                this.editData = row.value || {};
            }
        } catch {
            // If not valid JSON, wrap as string
            this.editData = { value: row.value };
        }
        this.editValue = this.formatValue(row.value);
        this.editTtl = 7;
        this.showEditDialog = true;
    }

    onJsonChange(event: any): void {
        // The event contains the updated JSON data
        this.editData = event;
    }

    saveRow(): void {
        if (!this.selectedTable()?.name || !this.editKey.trim()) return;

        // Use editData directly since the JSON editor works with objects
        const input: SaveToVirtualDbInput = {
            databaseName: this.selectedTable()!.name,
            key: this.editKey.trim(),
            innerObject: this.editData,
            ttl: this.editTtl
        };

        this.isSaving.set(true);
        this.vdbApi.saveToVirtualDb(input).subscribe({
            next: () => {
                this.showEditDialog = false;
                this.showAddDialog = false;
                this.isSaving.set(false);
                this.loadRows(this.selectedTable()!.name!);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Saved',
                    detail: `Key "${this.editKey}" saved`
                });
            },
            error: (err) => {
                console.error('Failed to save:', err);
                this.isSaving.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to save'
                });
            }
        });
    }

    confirmDeleteRow(row: VirtualDbRowDto, event: Event): void {
        if (!row.key) return;
        event.stopPropagation();
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Delete key "${row.key}"?`,
            icon: 'pi pi-trash',
            accept: () => this.deleteRow(row)
        });
    }

    deleteRow(row: VirtualDbRowDto): void {
        if (!this.selectedTable()?.name || !row.key) return;

        this.vdbApi.deleteVirtualDbRow(this.selectedTable()!.name!, row.key!).subscribe({
            next: () => {
                if (this.selectedRow()?.key === row.key) {
                    this.selectedRow.set(null);
                }
                this.loadRows(this.selectedTable()!.name!);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `Key "${row.key}" deleted`
                });
            },
            error: (err) => {
                console.error('Failed to delete row:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to delete key'
                });
            }
        });
    }

    // ==================== Utility ====================

    formatValue(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }

    /**
     * Get the parsed value as an object for json-editor display
     */
    getParsedValue(value: any): object {
        if (value === null || value === undefined) return {};
        if (typeof value === 'object') return value;
        // If it's a string, try to parse as JSON
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                // Return as wrapped object if not valid JSON
                return { value: value };
            }
        }
        // Wrap primitives in an object
        return { value: value };
    }

    // ==================== Preview Formatting ====================

    /**
     * Format value for friendly display with human-readable formatting
     */
    formatFriendlyValue(value: any): string {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return value.toLocaleString();
        if (typeof value === 'string') {
            // Try to parse date strings
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        });
                    }
                } catch { /* ignore */ }
            }
            return value;
        }
        if (Array.isArray(value)) {
            return `${value.length} items`;
        }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            return `${keys.length} properties`;
        }
        return String(value);
    }

    /**
     * Get technical details about a value
     */
    getTechnicalDetails(value: any): { type: string; size: string; preview: string } {
        if (value === null) return { type: 'null', size: '0 B', preview: 'null' };
        if (value === undefined) return { type: 'undefined', size: '0 B', preview: 'undefined' };

        const jsonStr = JSON.stringify(value);
        const size = new Blob([jsonStr]).size;
        const sizeStr = size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

        let typeStr: string = typeof value;
        if (Array.isArray(value)) typeStr = `array[${value.length}]`;
        else if (typeStr === 'object') typeStr = `object{${Object.keys(value).length}}`;

        let preview = jsonStr.substring(0, 100);
        if (jsonStr.length > 100) preview += '...';

        return { type: typeStr, size: sizeStr, preview };
    }

    /**
     * Check if value is a simple primitive
     */
    isSimpleValue(value: any): boolean {
        return value === null || value === undefined ||
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    }

    /**
     * Check if value is an array
     */
    isArrayValue(value: any): boolean {
        return Array.isArray(value);
    }

    /**
     * Get array length safely
     */
    getArrayLength(value: any): number {
        return Array.isArray(value) ? value.length : 0;
    }

    /**
     * Get first N items from an array for preview
     */
    getArrayPreviewItems(value: any, count: number = 5): any[] {
        if (Array.isArray(value)) {
            return value.slice(0, count);
        }
        return [];
    }

    /**
     * Check if value is an object (not array)
     */
    isObjectValue(value: any): boolean {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Get object keys for iteration
     */
    getObjectKeys(value: any): string[] {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value);
        }
        return [];
    }

    /**
     * Safely get a property value from an object by key
     */
    getPropertyValue(obj: any, key: string): any {
        if (obj && typeof obj === 'object' && key in obj) {
            return obj[key];
        }
        return undefined;
    }

    copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text).then(() => {
            this.messageService.add({
                severity: 'info',
                summary: 'Copied',
                detail: 'Copied to clipboard',
                life: 2000
            });
        });
    }

    refreshAll(): void {
        this.loadTables();
        if (this.selectedTable()?.name) {
            this.loadRows(this.selectedTable()!.name!);
        }
    }
}
