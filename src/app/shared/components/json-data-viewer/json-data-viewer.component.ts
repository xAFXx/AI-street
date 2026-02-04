import { Component, Input, Output, EventEmitter, signal, computed, TemplateRef, ContentChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { JsonTreeViewComponent } from '../json-tree-view/json-tree-view.component';

export type DataViewMode = 'friendly' | 'technical' | 'code';

/**
 * JsonDataViewerComponent - A reusable component for visualizing JSON data
 * 
 * Features:
 * - Three view modes: Friendly (tree view), Technical (table), Code (raw JSON)
 * - Customizable first/friendly view via content projection
 * - Optional document preview panel
 * - Copy to clipboard support
 * - Configurable for different contexts
 */
@Component({
    selector: 'app-json-data-viewer',
    standalone: true,
    imports: [CommonModule, ButtonModule, TooltipModule, JsonTreeViewComponent],
    template: `
        <div class="json-data-viewer" [class.full-height]="fullHeight">
            <!-- Header with view mode toggle -->
            <div class="viewer-header" *ngIf="showHeader">
                <div class="view-mode-toggle">
                    <button pButton [text]="true" size="small" icon="pi pi-th-large" 
                        [label]="friendlyLabel"
                        [class.active]="viewMode() === 'friendly'"
                        (click)="setViewMode('friendly')"></button>
                    <button pButton [text]="true" size="small" icon="pi pi-table" 
                        label="Technical"
                        [class.active]="viewMode() === 'technical'"
                        (click)="setViewMode('technical')"></button>
                    <button pButton [text]="true" size="small" icon="pi pi-code" 
                        [label]="codeLabel"
                        [class.active]="viewMode() === 'code'"
                        (click)="setViewMode('code')"></button>
                </div>
                
                <div class="viewer-actions" *ngIf="showActions">
                    <button pButton icon="pi pi-copy" [text]="true" severity="secondary" size="small"
                        (click)="copyData()" pTooltip="Copy JSON"></button>
                </div>
            </div>
            
            <!-- View Content -->
            <div class="viewer-content">
                <!-- FRIENDLY VIEW -->
                <div *ngIf="viewMode() === 'friendly'" class="friendly-view">
                    <!-- Custom friendly view via content projection -->
                    <ng-container *ngIf="customFriendlyView; else defaultFriendlyView">
                        <ng-container *ngTemplateOutlet="customFriendlyView; context: { $implicit: data }"></ng-container>
                    </ng-container>
                    
                    <ng-template #defaultFriendlyView>
                        <app-json-tree-view 
                            [data]="data" 
                            [initialExpandDepth]="initialExpandDepth"
                            [maxChildrenToShow]="maxChildrenToShow"
                            [compact]="compact">
                        </app-json-tree-view>
                    </ng-template>
                </div>
                
                <!-- TECHNICAL VIEW -->
                <div *ngIf="viewMode() === 'technical'" class="technical-view">
                    <div class="tech-table-wrapper">
                        <table class="tech-table">
                            <thead>
                                <tr>
                                    <th>Property</th>
                                    <th>Value</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                <ng-container *ngFor="let entry of flatEntries()">
                                    <tr [class.nested]="entry.depth > 0">
                                        <td class="prop-name" [style.padding-left.px]="entry.depth * 16 + 12">
                                            <span class="prop-path">{{ entry.key }}</span>
                                        </td>
                                        <td class="prop-value">
                                            <span *ngIf="entry.isSimple" class="value-display" [ngClass]="'type-' + entry.type">
                                                {{ formatTechValue(entry.value) }}
                                            </span>
                                            <span *ngIf="!entry.isSimple" class="value-complex">
                                                <i class="pi" [ngClass]="entry.type === 'array' ? 'pi-list' : 'pi-box'"></i>
                                                {{ getComplexValueSummary(entry) }}
                                            </span>
                                        </td>
                                        <td class="prop-type">
                                            <span class="type-badge" [ngClass]="'type-' + entry.type">{{ entry.type }}</span>
                                        </td>
                                    </tr>
                                </ng-container>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- CODE VIEW -->
                <div *ngIf="viewMode() === 'code'" class="code-view">
                    <pre class="code-block">{{ formattedJson() }}</pre>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .json-data-viewer {
            display: flex;
            flex-direction: column;
            background: var(--surface-card);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .json-data-viewer.full-height {
            height: 100%;
        }
        
        .viewer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--surface-border);
            background: var(--surface-50);
        }
        
        .view-mode-toggle {
            display: flex;
            gap: 0.25rem;
            background: var(--surface-100);
            padding: 0.25rem;
            border-radius: 8px;
        }
        
        .view-mode-toggle button {
            transition: all 0.15s ease;
        }
        
        .view-mode-toggle button.active {
            background: var(--surface-card) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .viewer-actions {
            display: flex;
            gap: 0.25rem;
        }
        
        .viewer-content {
            flex: 1;
            overflow: auto;
            padding: 1rem;
        }
        
        /* Friendly View */
        .friendly-view {
            height: 100%;
        }
        
        /* Technical View */
        .technical-view {
            height: 100%;
        }
        
        .tech-table-wrapper {
            border: 1px solid var(--surface-border);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .tech-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
        }
        
        .tech-table thead tr {
            background: var(--surface-100);
        }
        
        .tech-table th {
            text-align: left;
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: var(--text-color-secondary);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .tech-table td {
            padding: 0.75rem 1rem;
            border-top: 1px solid var(--surface-border);
        }
        
        .tech-table tr:hover td {
            background: var(--surface-50);
        }
        
        .prop-name {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-weight: 500;
        }
        
        .prop-path {
            color: var(--text-color);
        }
        
        .prop-value {
            max-width: 300px;
        }
        
        .value-display {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            word-break: break-word;
        }
        
        .value-display.type-string { color: #059669; }
        .value-display.type-number { color: #2563eb; }
        .value-display.type-boolean { color: #db2777; }
        .value-display.type-null { color: var(--text-color-secondary); font-style: italic; }
        
        .value-complex {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-color-secondary);
        }
        
        .value-complex i {
            font-size: 0.8rem;
        }
        
        .type-badge {
            display: inline-block;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .type-badge.type-string { background: #d1fae5; color: #059669; }
        .type-badge.type-number { background: #dbeafe; color: #2563eb; }
        .type-badge.type-boolean { background: #fce7f3; color: #db2777; }
        .type-badge.type-object { background: #e0e7ff; color: #4f46e5; }
        .type-badge.type-array { background: #d1fae5; color: #10b981; }
        .type-badge.type-null { background: var(--surface-200); color: var(--text-color-secondary); }
        
        /* Code View */
        .code-view {
            height: 100%;
        }
        
        .code-block {
            margin: 0;
            padding: 1rem;
            background: var(--surface-50);
            border: 1px solid var(--surface-border);
            border-radius: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.8rem;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
            overflow: auto;
            max-height: 100%;
            color: var(--text-color);
        }
    `]
})
export class JsonDataViewerComponent {
    // Data to display
    @Input() data: any = null;

    // Configuration
    @Input() showHeader: boolean = true;
    @Input() showActions: boolean = true;
    @Input() fullHeight: boolean = false;
    @Input() compact: boolean = false;
    @Input() initialExpandDepth: number = 2;
    @Input() maxChildrenToShow: number = 5;
    @Input() defaultViewMode: DataViewMode = 'friendly';
    @Input() friendlyLabel: string = 'Friendly';
    @Input() codeLabel: string = 'Raw';

    // Events
    @Output() viewModeChange = new EventEmitter<DataViewMode>();
    @Output() copyClicked = new EventEmitter<void>();

    // Custom friendly view template
    @ContentChild('friendlyView') customFriendlyView?: TemplateRef<any>;

    // State
    viewMode = signal<DataViewMode>('friendly');

    // Computed
    formattedJson = computed(() => {
        try {
            return JSON.stringify(this.data, null, 2);
        } catch {
            return String(this.data);
        }
    });

    flatEntries = computed(() => {
        return this.flattenData(this.data, '', 0);
    });

    ngOnInit() {
        this.viewMode.set(this.defaultViewMode);
    }

    setViewMode(mode: DataViewMode): void {
        this.viewMode.set(mode);
        this.viewModeChange.emit(mode);
    }

    copyData(): void {
        const json = this.formattedJson();
        navigator.clipboard.writeText(json);
        this.copyClicked.emit();
    }

    private flattenData(data: any, prefix: string, depth: number): any[] {
        const entries: any[] = [];

        if (data === null || data === undefined) {
            return entries;
        }

        if (typeof data !== 'object') {
            return [{
                key: prefix || 'value',
                value: data,
                type: this.getType(data),
                isSimple: true,
                depth
            }];
        }

        const keys = Array.isArray(data)
            ? data.map((_, i) => `[${i}]`)
            : Object.keys(data);

        keys.forEach((key, index) => {
            const value = Array.isArray(data) ? data[index] : data[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const type = this.getType(value);
            const isSimple = !['object', 'array'].includes(type);

            entries.push({
                key: key,
                fullKey,
                value,
                type,
                isSimple,
                depth
            });

            // Recursively flatten nested objects (up to depth 2)
            if (!isSimple && depth < 2) {
                entries.push(...this.flattenData(value, fullKey, depth + 1));
            }
        });

        return entries;
    }

    private getType(value: any): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    formatTechValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'string') {
            if (value.length > 100) {
                return `"${value.substring(0, 97)}..."`;
            }
            return `"${value}"`;
        }
        return String(value);
    }

    getComplexValueSummary(entry: any): string {
        if (entry.type === 'array') {
            const count = entry.value?.length || 0;
            return `${count} items`;
        }
        const count = entry.value ? Object.keys(entry.value).length : 0;
        return `${count} fields`;
    }
}
