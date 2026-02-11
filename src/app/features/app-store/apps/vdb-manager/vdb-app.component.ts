import { Component, inject, signal, OnInit, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';

// JSON Editor
import { JsonEditorComponent as AngJsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';

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
        IconFieldModule,
        InputIconModule,
        MultiSelectModule,
        SelectButtonModule
    ],
    providers: [VdbApiService, ConfirmationService, MessageService],
    templateUrl: './vdb-app.component.html',
    styleUrls: ['./vdb-app.component.less']
})
export class VdbAppComponent implements OnInit {
    private readonly vdbApi = inject(VdbApiService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);

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

    // New Table Dialog State
    showNewTableDialog = false;
    newTableName = '';
    isCreatingTable = signal(false);
    editDialogMaximized = signal(false);
    editKey = '';
    editValue = '';
    editTtl = 7;
    editData: object = {};
    pendingEditData: object | null = null; // Stores changes without triggering re-render

    // JSON Editor Options (for editing)
    jsonEditorOptions: JsonEditorOptions = new JsonEditorOptions();

    // JSON Editor Options (for preview - readonly)
    previewEditorOptions: JsonEditorOptions = new JsonEditorOptions();

    // ViewChild references to get data directly from editors
    @ViewChild('editJsonEditor') editJsonEditor?: AngJsonEditorComponent;
    @ViewChild('addJsonEditor') addJsonEditor?: AngJsonEditorComponent;

    // ==================== Skim View State ====================

    /** Table view mode: 'table' (key-value) or 'skim' (dynamic columns) */
    tableViewMode = signal<'table' | 'skim'>('table');

    /** View mode toggle options for SelectButton */
    viewModeOptions = [
        { label: 'Table', value: 'table', icon: 'pi pi-list' },
        { label: 'Skim', value: 'skim', icon: 'pi pi-th-large' }
    ];

    /** All available columns extracted from row values */
    allSkimColumns = signal<{ field: string; header: string }[]>([]);

    /** Currently selected columns for skim view */
    selectedSkimColumns = signal<{ field: string; header: string }[]>([]);

    /** Expanded rows in skim view (for nested object display) */
    expandedRows: Record<string, boolean> = {};

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
        const allRows = this.rows();
        if (!filter) return allRows;
        return allRows.filter(r => r.key?.toLowerCase().includes(filter));
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

                // Restore selected table from URL query params
                const tableParam = this.activatedRoute.snapshot.queryParamMap.get('table');
                if (tableParam) {
                    const table = this.tables().find(t => t.name === tableParam);
                    if (table) {
                        this.selectTable(table, false); // Don't update URL again
                    }
                }
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

    selectTable(table: VirtualDbDto, updateUrl: boolean = true): void {
        this.selectedTable.set(table);
        this.selectedRow.set(null);
        this.keyFilter = '';
        if (table.name) {
            this.loadRows(table.name);

            // Update URL with selected table for browser history
            if (updateUrl) {
                this.router.navigate([], {
                    relativeTo: this.activatedRoute,
                    queryParams: { table: table.name },
                    queryParamsHandling: 'merge',
                    replaceUrl: false
                });
            }
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

    // ==================== Create Table ====================

    openNewTableDialog(): void {
        this.newTableName = '';
        this.showNewTableDialog = true;
    }

    createTable(): void {
        const tableName = this.newTableName.trim();
        if (!tableName) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please enter a table name'
            });
            return;
        }

        // Check if table already exists
        const existing = this.tables().find(t => t.name?.toLowerCase() === tableName.toLowerCase());
        if (existing) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `Table "${tableName}" already exists`
            });
            return;
        }

        this.isCreatingTable.set(true);

        // Create table by saving an initial empty structure
        const input: SaveToVirtualDbInput = {
            databaseName: tableName,
            key: '_init',
            innerObject: { _created: new Date().toISOString() },
            ttl: 30
        };

        this.vdbApi.saveToVirtualDb(input).subscribe({
            next: () => {
                this.showNewTableDialog = false;
                this.newTableName = '';
                this.isCreatingTable.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Table "${tableName}" created`
                });
                // Reload tables and select the new one
                this.loadTables();
            },
            error: (err) => {
                console.error('Failed to create table:', err);
                this.isCreatingTable.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to create table'
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
                // Extract columns for skim view
                this.extractSkimColumns();
                this.loadSavedSkimColumns(tableName);
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

    /**
     * Handle row selection change from p-table (signal-compatible pattern)
     */
    onRowSelect(row: VirtualDbRowDto | null): void {
        this.selectedRow.set(row);
    }

    // ==================== Edit Operations ====================

    openAddDialog(): void {
        this.editKey = '';
        this.editValue = '';
        this.editData = {};
        this.pendingEditData = null;
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
        this.pendingEditData = null; // Clear any pending data from previous edit
        this.showEditDialog = true;
    }

    onJsonChange(event: any): void {
        // ang-jsoneditor emits different event formats depending on mode:
        // - In tree mode: event is the modified data object
        // - In code/text mode: event may have isTrusted property (native event) or be the data
        // We need to extract the actual data properly

        if (event === null || event === undefined) {
            return;
        }

        // If event has isTrusted, it's a native event - ignore it
        if (event.isTrusted !== undefined) {
            return;
        }

        // Store the data - ang-jsoneditor passes the data directly
        this.pendingEditData = event;
        console.log('[VDB] JSON change captured:', event);
    }

    saveRow(): void {
        if (!this.selectedTable()?.name || !this.editKey.trim()) return;

        // Get data directly from the JSON editor ViewChild - this is more reliable than change events
        // Use the appropriate editor based on which dialog is open
        let dataToSave: any;
        const activeEditor = this.showEditDialog ? this.editJsonEditor : this.addJsonEditor;

        if (activeEditor?.get) {
            try {
                dataToSave = activeEditor.get();
                console.log('[VDB] Data from editor.get():', dataToSave);
            } catch (e) {
                console.warn('[VDB] Could not get data from editor, using pendingEditData:', e);
                dataToSave = this.pendingEditData ?? this.editData;
            }
        } else {
            // Fallback to pendingEditData if editor not available
            dataToSave = this.pendingEditData ?? this.editData;
        }

        const input: SaveToVirtualDbInput = {
            databaseName: this.selectedTable()!.name,
            key: this.editKey.trim(),
            innerObject: dataToSave,
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

    // ==================== Skim View Methods ====================

    /**
     * Extract all unique columns from row values
     * Only extracts top-level keys from object values
     */
    extractSkimColumns(): void {
        const rows = this.rows();
        const columnSet = new Set<string>();

        for (const row of rows) {
            const parsed = this.getParsedValue(row.value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                Object.keys(parsed).forEach(key => columnSet.add(key));
            }
        }

        const columns = Array.from(columnSet)
            .sort()
            .map(field => ({ field, header: field }));

        // Read current selection count BEFORE writing to any signals
        const currentSelectionCount = this.selectedSkimColumns().length;

        this.allSkimColumns.set(columns);

        // If no columns selected yet, select first 5 by default
        if (currentSelectionCount === 0 && columns.length > 0) {
            this.selectedSkimColumns.set(columns.slice(0, 5));
        }
    }

    /**
     * Load saved skim columns from localStorage for a specific table
     */
    loadSavedSkimColumns(tableName: string): void {
        const storageKey = `vdb_skim_columns_${tableName}`;
        const saved = localStorage.getItem(storageKey);

        if (saved) {
            try {
                const savedFields: string[] = JSON.parse(saved);
                const allCols = this.allSkimColumns();
                // Map saved field names back to column objects
                const selected = savedFields
                    .map(field => allCols.find(c => c.field === field))
                    .filter((c): c is { field: string; header: string } => c !== undefined);

                if (selected.length > 0) {
                    this.selectedSkimColumns.set(selected);
                }
            } catch (e) {
                console.warn('Failed to load saved skim columns:', e);
            }
        }
    }

    /**
     * Save selected skim columns to localStorage
     */
    saveSkimColumns(): void {
        const tableName = this.selectedTableName();
        if (!tableName) return;

        const storageKey = `vdb_skim_columns_${tableName}`;
        const selectedFields = this.selectedSkimColumns().map(c => c.field);
        localStorage.setItem(storageKey, JSON.stringify(selectedFields));
    }

    /**
     * Handle column selection change
     */
    onSkimColumnChange(selected: { field: string; header: string }[]): void {
        this.selectedSkimColumns.set(selected);
        this.saveSkimColumns();
    }

    /**
     * Get column value from a row for skim view
     */
    getSkimColumnValue(row: VirtualDbRowDto, columnField: string): any {
        const parsed = this.getParsedValue(row.value);
        if (parsed && typeof parsed === 'object' && columnField in parsed) {
            return (parsed as Record<string, any>)[columnField];
        }
        return undefined;
    }

    /**
     * Format a skim column value for display
     */
    formatSkimValue(value: any): string {
        if (value === undefined || value === null) {
            return '—';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    /**
     * Toggle row expansion state
     */
    toggleRowExpand(row: VirtualDbRowDto): void {
        const key = row.key;
        if (key) {
            // Toggle the expanded state
            if (this.expandedRows[key]) {
                delete this.expandedRows[key];
            } else {
                this.expandedRows[key] = true;
            }
            // Create a new object reference to trigger change detection
            this.expandedRows = { ...this.expandedRows };
        }
    }

    /**
     * Check if a row is expanded
     */
    isRowExpanded(row: VirtualDbRowDto): boolean {
        return !!row.key && !!this.expandedRows[row.key];
    }

    /**
     * Check if a row has nested objects in its value (for row expansion)
     * Only returns true for plain objects, not arrays
     */
    hasNestedObjects(row: VirtualDbRowDto): boolean {
        const parsed = this.getParsedValue(row.value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return Object.values(parsed).some(v =>
                v !== null && typeof v === 'object' && !Array.isArray(v)
            );
        }
        return false;
    }

    /**
     * Get nested properties from a row value (for row expansion display)
     * Only returns plain objects (not arrays) - arrays should be shown in main columns
     */
    getNestedProperties(row: VirtualDbRowDto): { key: string; value: any }[] {
        const parsed = this.getParsedValue(row.value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return Object.entries(parsed)
                .filter(([_, v]) => v !== null && typeof v === 'object' && !Array.isArray(v))
                .map(([key, value]) => ({ key, value }));
        }
        return [];
    }

    /**
     * Format nested value for display in expansion table
     */
    formatNestedValue(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        }
        return String(value);
    }

    /**
     * Check if value is an array of objects (for table display)
     */
    isArrayOfObjects(value: any): boolean {
        return Array.isArray(value) &&
            value.length > 0 &&
            typeof value[0] === 'object' &&
            value[0] !== null;
    }

    /**
     * Check if value is a plain object (not array)
     */
    isNonArrayObject(value: any): boolean {
        return value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value);
    }

    /**
     * Get column headers from an array of objects
     */
    getArrayTableColumns(arr: any[]): string[] {
        if (!Array.isArray(arr) || arr.length === 0) return [];
        const firstItem = arr[0];
        if (typeof firstItem !== 'object' || firstItem === null) return [];
        return Object.keys(firstItem);
    }

    /**
     * Convert a single object to an array of key-value pairs for table display
     */
    getObjectAsTableRows(obj: any): { key: string; value: any }[] {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
        return Object.entries(obj).map(([key, value]) => ({ key, value }));
    }

    /**
     * Format a cell value for display in nested tables
     */
    formatCellValue(value: any): string {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return String(value);
    }

    /**
     * Check if value is an array of primitives (strings, numbers, booleans)
     */
    isArrayOfPrimitives(value: any): boolean {
        if (!Array.isArray(value) || value.length === 0) return false;
        const firstItem = value[0];
        return typeof firstItem === 'string' ||
            typeof firstItem === 'number' ||
            typeof firstItem === 'boolean';
    }

    /**
     * Handle view mode change
     */
    onViewModeChange(mode: 'table' | 'skim'): void {
        this.tableViewMode.set(mode);
    }

    /**
     * Convert any value to string (template-accessible wrapper for String())
     */
    String(value: any): string {
        if (value === null || value === undefined) return '';
        return String(value);
    }
}

