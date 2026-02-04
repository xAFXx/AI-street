import { Component, Input, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

interface TreeNode {
    key: string;
    value: any;
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
    children?: TreeNode[];
    depth: number;
    isLast: boolean;
    parentPath: boolean[]; // Track which ancestors are "last" for line rendering
    nodeId: string; // Pre-computed node ID
}

@Component({
    selector: 'app-json-tree-view',
    standalone: true,
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
        <div class="json-tree-view" [class.compact]="compact">
            <ng-container *ngIf="rootNodes().length > 0">
                <ng-container *ngFor="let node of rootNodes(); let i = index">
                    <ng-container *ngTemplateOutlet="treeNode; context: { $implicit: node }"></ng-container>
                </ng-container>
            </ng-container>
            
            <div *ngIf="rootNodes().length === 0" class="empty-tree text-400 text-sm p-3">
                <i class="pi pi-info-circle mr-2"></i>
                No data to display
            </div>
        </div>
        
        <ng-template #treeNode let-node>
            <div class="tree-node" 
                 [style.--depth]="node.depth"
                 [class.is-expandable]="isExpandable(node)"
                 [class.is-expanded]="isExpanded(node)"
                 [class.is-last]="node.isLast">
                
                <!-- Tree lines for visual connection -->
                <div class="tree-lines">
                    <ng-container *ngFor="let isParentLast of node.parentPath; let idx = index">
                        <span class="tree-line-segment" 
                              [class.has-line]="!isParentLast"
                              [style.left.px]="idx * 20 + 10"></span>
                    </ng-container>
                    <span class="tree-connector" 
                          [class.is-last]="node.isLast"
                          [style.left.px]="node.depth * 20"></span>
                </div>
                
                <!-- Node content -->
                <div class="node-content" 
                     [style.padding-left.px]="node.depth * 20 + 24"
                     (click)="toggleNode(node)">
                    
                    <!-- Expand/collapse indicator -->
                    <span *ngIf="isExpandable(node)" class="expand-icon">
                        <i class="pi" [class.pi-chevron-right]="!isExpanded(node)" 
                           [class.pi-chevron-down]="isExpanded(node)"></i>
                    </span>
                    <span *ngIf="!isExpandable(node)" class="expand-placeholder"></span>
                    
                    <!-- Type icon -->
                    <span class="type-icon" [ngClass]="getTypeIconClass(node)">
                        <i [class]="getTypeIcon(node)"></i>
                    </span>
                    
                    <!-- Key name -->
                    <span class="node-key" [class.is-index]="isArrayIndex(node.key)">
                        {{ formatKey(node.key) }}
                    </span>
                    
                    <!-- Value or summary -->
                    <ng-container *ngIf="!isExpandable(node)">
                        <span class="node-separator">:</span>
                        <span class="node-value" [ngClass]="getValueClass(node)">
                            {{ formatValue(node.value) }}
                        </span>
                    </ng-container>
                    
                    <ng-container *ngIf="isExpandable(node)">
                        <span class="node-count text-400 text-xs ml-2">
                            {{ getNodeSummary(node) }}
                        </span>
                    </ng-container>
                </div>
            </div>
            
            <!-- Render children if expanded -->
            <ng-container *ngIf="isExpandable(node) && isExpanded(node)">
                <ng-container *ngFor="let child of getVisibleChildren(node); let i = index">
                    <ng-container *ngTemplateOutlet="treeNode; context: { $implicit: child }"></ng-container>
                </ng-container>
                
                <!-- "Show more" indicator -->
                <div *ngIf="hasMoreChildren(node)" 
                     class="tree-node show-more"
                     [style.padding-left.px]="(node.depth + 1) * 20 + 24">
                    <div class="tree-lines">
                        <ng-container *ngFor="let isParentLast of node.parentPath; let idx = index">
                            <span class="tree-line-segment" 
                                  [class.has-line]="!isParentLast"
                                  [style.left.px]="idx * 20 + 10"></span>
                        </ng-container>
                        <span class="tree-line-segment has-line" 
                              [style.left.px]="node.depth * 20 + 10"></span>
                    </div>
                    <button pButton [text]="true" size="small" 
                            class="more-button"
                            (click)="showAllChildren(node); $event.stopPropagation()">
                        <i class="pi pi-ellipsis-h mr-1"></i>
                        {{ getRemainingCount(node) }} more items
                    </button>
                </div>
            </ng-container>
        </ng-template>
    `,
    styles: [`
        .json-tree-view {
            font-family: var(--font-family);
            font-size: 0.875rem;
            line-height: 1.6;
        }
        
        .json-tree-view.compact {
            font-size: 0.8rem;
            line-height: 1.4;
        }
        
        .tree-node {
            position: relative;
            min-height: 28px;
        }
        
        .tree-lines {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: 100%;
            pointer-events: none;
        }
        
        .tree-line-segment {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
        }
        
        .tree-line-segment.has-line {
            background: var(--surface-300);
        }
        
        .tree-connector {
            position: absolute;
            top: 0;
            width: 12px;
            height: 14px;
            border-left: 1px solid var(--surface-300);
            border-bottom: 1px solid var(--surface-300);
            border-bottom-left-radius: 4px;
        }
        
        .tree-connector.is-last {
            height: 14px;
        }
        
        .tree-node:first-child > .tree-lines > .tree-connector {
            top: 0;
        }
        
        .node-content {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 6px;
            cursor: default;
            transition: background 0.15s ease;
        }
        
        .is-expandable .node-content {
            cursor: pointer;
        }
        
        .node-content:hover {
            background: var(--surface-100);
        }
        
        .expand-icon {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-color-secondary);
            transition: transform 0.15s ease;
        }
        
        .expand-icon i {
            font-size: 0.7rem;
        }
        
        .expand-placeholder {
            width: 16px;
        }
        
        .type-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            font-size: 0.7rem;
        }
        
        .type-icon.type-object {
            background: linear-gradient(135deg, #818cf8, #6366f1);
            color: white;
        }
        
        .type-icon.type-array {
            background: linear-gradient(135deg, #34d399, #10b981);
            color: white;
        }
        
        .type-icon.type-string {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
        }
        
        .type-icon.type-number {
            background: linear-gradient(135deg, #60a5fa, #3b82f6);
            color: white;
        }
        
        .type-icon.type-boolean {
            background: linear-gradient(135deg, #f472b6, #ec4899);
            color: white;
        }
        
        .type-icon.type-null {
            background: var(--surface-300);
            color: var(--text-color-secondary);
        }
        
        .node-key {
            font-weight: 500;
            color: var(--text-color);
        }
        
        .node-key.is-index {
            color: var(--text-color-secondary);
            font-weight: 400;
            font-style: italic;
        }
        
        .node-separator {
            color: var(--text-color-secondary);
        }
        
        .node-value {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .node-value.value-string {
            color: #059669;
        }
        
        .node-value.value-number {
            color: #2563eb;
        }
        
        .node-value.value-boolean {
            color: #db2777;
            font-weight: 500;
        }
        
        .node-value.value-null {
            color: var(--text-color-secondary);
            font-style: italic;
        }
        
        .node-count {
            opacity: 0.7;
        }
        
        .show-more {
            position: relative;
        }
        
        .more-button {
            font-size: 0.75rem !important;
            padding: 2px 8px !important;
            color: var(--primary-color) !important;
        }
        
        .empty-tree {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: var(--surface-50);
            border-radius: 8px;
        }
    `]
})
export class JsonTreeViewComponent implements OnChanges {
    @Input() data: any = null;
    @Input() maxDepth: number = 10;
    @Input() initialExpandDepth: number = 2;
    @Input() maxChildrenToShow: number = 5;
    @Input() compact: boolean = false;

    private expandedNodes = signal<Set<string>>(new Set());
    private showAllNodes = signal<Set<string>>(new Set());
    private cachedNodes = signal<TreeNode[]>([]);

    // Use a simple computed that doesn't write to signals
    rootNodes = computed(() => this.cachedNodes());

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] || changes['initialExpandDepth'] || changes['maxDepth']) {
            this.rebuildTree();
        }
    }

    private rebuildTree(): void {
        if (this.data === null || this.data === undefined) {
            this.cachedNodes.set([]);
            this.expandedNodes.set(new Set());
            return;
        }

        // Build the tree
        let nodes: TreeNode[];
        if (typeof this.data === 'object') {
            nodes = this.buildTree(this.data, '', 0, true, []);
        } else {
            // Primitive value - wrap it
            nodes = [{
                key: 'value',
                value: this.data,
                type: this.getValueType(this.data),
                depth: 0,
                isLast: true,
                parentPath: [],
                nodeId: '0-value-0'
            }];
        }

        // Collect nodes to auto-expand
        const toExpand = new Set<string>();
        this.collectNodesToExpand(nodes, toExpand);

        // Update state
        this.cachedNodes.set(nodes);
        this.expandedNodes.set(toExpand);
    }

    private collectNodesToExpand(nodes: TreeNode[], toExpand: Set<string>): void {
        for (const node of nodes) {
            if (this.isExpandable(node)) {
                // Auto-expand based on depth setting
                const shouldExpandByDepth = node.depth < this.initialExpandDepth;

                // Auto-expand single-child objects/arrays (reduces unnecessary clicks)
                const hasSingleChild = node.children && node.children.length === 1;

                if (shouldExpandByDepth || hasSingleChild) {
                    toExpand.add(node.nodeId);
                }
            }
            if (node.children) {
                this.collectNodesToExpand(node.children, toExpand);
            }
        }
    }

    private buildTree(data: any, parentKey: string, depth: number, isLast: boolean, parentPath: boolean[]): TreeNode[] {
        if (depth > this.maxDepth) return [];

        const nodes: TreeNode[] = [];

        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                const isItemLast = index === data.length - 1;
                const node = this.createNode(
                    `[${index}]`,
                    item,
                    depth,
                    isItemLast,
                    [...parentPath, isLast]
                );
                nodes.push(node);
            });
        } else if (typeof data === 'object' && data !== null) {
            const keys = Object.keys(data);
            keys.forEach((key, index) => {
                const isKeyLast = index === keys.length - 1;
                const node = this.createNode(
                    key,
                    data[key],
                    depth,
                    isKeyLast,
                    [...parentPath, isLast]
                );
                nodes.push(node);
            });
        }

        return nodes;
    }

    private createNode(key: string, value: any, depth: number, isLast: boolean, parentPath: boolean[]): TreeNode {
        const type = this.getValueType(value);
        const nodeId = `${depth}-${key}-${parentPath.length}`;
        const node: TreeNode = {
            key,
            value,
            type,
            depth,
            isLast,
            parentPath,
            nodeId
        };

        if (type === 'object' || type === 'array') {
            node.children = this.buildTree(value, key, depth + 1, isLast, parentPath);
        }

        return node;
    }

    private getValueType(value: any): TreeNode['type'] {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        return 'string';
    }

    isExpandable(node: TreeNode): boolean {
        return (node.type === 'object' || node.type === 'array') &&
            node.children !== undefined &&
            node.children.length > 0;
    }

    isExpanded(node: TreeNode): boolean {
        return this.expandedNodes().has(node.nodeId);
    }

    toggleNode(node: TreeNode): void {
        if (!this.isExpandable(node)) return;

        this.expandedNodes.update(set => {
            const newSet = new Set(set);
            if (newSet.has(node.nodeId)) {
                newSet.delete(node.nodeId);
            } else {
                newSet.add(node.nodeId);
            }
            return newSet;
        });
    }

    getVisibleChildren(node: TreeNode): TreeNode[] {
        if (!node.children) return [];

        if (this.showAllNodes().has(node.nodeId)) {
            return node.children;
        }

        return node.children.slice(0, this.maxChildrenToShow);
    }

    hasMoreChildren(node: TreeNode): boolean {
        if (!node.children) return false;
        if (this.showAllNodes().has(node.nodeId)) return false;
        return node.children.length > this.maxChildrenToShow;
    }

    getRemainingCount(node: TreeNode): number {
        if (!node.children) return 0;
        return node.children.length - this.maxChildrenToShow;
    }

    showAllChildren(node: TreeNode): void {
        this.showAllNodes.update(s => new Set([...s, node.nodeId]));
    }

    getTypeIcon(node: TreeNode): string {
        switch (node.type) {
            case 'object': return 'pi pi-box';
            case 'array': return 'pi pi-list';
            case 'string': return 'pi pi-align-left';
            case 'number': return 'pi pi-hashtag';
            case 'boolean': return 'pi pi-check-circle';
            case 'null': return 'pi pi-minus-circle';
            default: return 'pi pi-circle';
        }
    }

    getTypeIconClass(node: TreeNode): string {
        return `type-${node.type}`;
    }

    getValueClass(node: TreeNode): string {
        return `value-${node.type}`;
    }

    formatKey(key: string): string {
        // Format array indices nicely
        if (key.startsWith('[') && key.endsWith(']')) {
            const index = parseInt(key.slice(1, -1), 10);
            return `Item ${index + 1}`;
        }

        // Convert camelCase/snake_case to readable
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^\s/, '')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'string') {
            if (value.length > 50) {
                return `"${value.substring(0, 47)}..."`;
            }
            return `"${value}"`;
        }
        return String(value);
    }

    isArrayIndex(key: string): boolean {
        return key.startsWith('[') && key.endsWith(']');
    }

    getNodeSummary(node: TreeNode): string {
        if (node.type === 'array') {
            const count = Array.isArray(node.value) ? node.value.length : 0;
            return `${count} item${count !== 1 ? 's' : ''}`;
        }
        if (node.type === 'object') {
            const count = node.value ? Object.keys(node.value).length : 0;
            return `${count} field${count !== 1 ? 's' : ''}`;
        }
        return '';
    }
}

