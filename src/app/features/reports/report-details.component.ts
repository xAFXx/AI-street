import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { TreeModule } from 'primeng/tree';
import { SplitterModule } from 'primeng/splitter';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { EditorModule } from 'primeng/editor';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProgressBarModule } from 'primeng/progressbar';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { TreeNode } from 'primeng/api';

import { Report, ContentImage, ContentBlock, ReferenceDoc } from './models/report.model';
import { ReportDataService } from './services/report-data.service';

interface ChatMessage {
    id: string;
    side: 'user' | 'ai';
    text: string;
    at: Date;
}

@Component({
    selector: 'app-report-details',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TreeModule,
        SplitterModule,
        ButtonModule,
        InputTextModule,
        ToolbarModule,
        CardModule,
        ScrollPanelModule,
        DividerModule,
        DragDropModule,
        FileUploadModule,
        DialogModule,
        TextareaModule,
        EditorModule,
        SelectModule,
        TagModule,
        TabsModule,
        CheckboxModule,
        SelectButtonModule,
        ProgressBarModule,
        FormsModule
    ],
    templateUrl: './report-details.component.html',
    styleUrls: ['./report-details.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportDetailsComponent implements OnInit, OnDestroy {
    @Input() templateName = 'Damage Report';
    reportTitle = 'Loading...';
    reportId: string | null = null;
    showAddBlockModal = false;
    showAddRefModal = false;
    editingBlockId: string | null = null;

    chapterTree: TreeNode[] = [];
    private originalChapterTree: TreeNode[] = [];
    chapterSearchText = '';
    showReviewModal = false;
    reviewViewMode: 'rendered' | 'source' = 'rendered';
    reviewViewOptions = [
        { label: 'Rendered', value: 'rendered', icon: 'pi pi-eye' },
        { label: 'Source', value: 'source', icon: 'pi pi-code' }
    ];

    // AI Readiness - tracks what data/documents AI has available to generate report
    aiReadinessItems: { label: string; available: boolean; weight: number }[] = [
        { label: 'Photos', available: false, weight: 20 },
        { label: 'Insurance Docs', available: false, weight: 25 },
        { label: 'Owner Info', available: false, weight: 15 },
        { label: 'Inspection Report', available: false, weight: 25 },
        { label: 'Reference Docs', available: false, weight: 15 }
    ];

    referenceDocs: ReferenceDoc[] = [];

    selectedChapter = 'summary';
    selectedNode: TreeNode | null = null;
    private readonly content = new Map<string, ContentBlock[]>();

    pendingImages: ContentImage[] = [];

    // ✅ Typed, NON-nullable forms
    textForm: FormGroup<{ text: FormControl<string> }>;
    imageForm: FormGroup<{ caption: FormControl<string> }>;
    refForm: FormGroup<{ title: FormControl<string>; description: FormControl<string>; type: FormControl<'pdf' | 'image' | 'csv' | 'doc'> }>;

    chatMessages: ChatMessage[] = [
        { id: this.uid(), side: 'ai', text: 'How can I help with this report?', at: new Date() }
    ];
    chatInput = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });

    reportStatus = 'Draft';
    statusOptions = [
        { label: 'Draft', value: 'Draft', severity: 'secondary' as 'secondary' },
        { label: 'Final', value: 'Final', severity: 'info' as 'info' },
        { label: 'Approved', value: 'Approved', severity: 'success' as 'success' }
    ];

    private captionUpdate$ = new Subject<{ index: number; caption: string }>();
    private captionSub?: Subscription;

    constructor(
        private fb: FormBuilder,
        private sanitizer: DomSanitizer,
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private reportDataService: ReportDataService
    ) {
        // ✅ Build controls as non-nullable to satisfy FormControl<string>
        this.textForm = this.fb.group({
            text: this.fb.control('', { nonNullable: true })
        });

        this.imageForm = this.fb.group({
            caption: this.fb.control('', { nonNullable: true })
        });

        this.refForm = this.fb.group({
            title: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
            description: this.fb.control('', { nonNullable: true }),
            type: this.fb.control<'pdf' | 'image' | 'csv' | 'doc'>('pdf', { nonNullable: true, validators: [Validators.required] })
        });
    }

    ngOnInit(): void {
        this.captionSub = this.captionUpdate$
            .pipe(debounceTime(300))
            .subscribe(({ index, caption }) => {
                this.pendingImages = this.pendingImages.map((img, i) =>
                    i === index ? { ...img, caption } : img
                );
                this.cdr.markForCheck();
            });

        // Load report data from route parameter
        this.reportId = this.route.snapshot.paramMap.get('id');
        if (this.reportId) {
            this.loadReport(this.reportId);
        }
    }

    private loadReport(id: string): void {
        this.reportDataService.getReportById(id).subscribe(report => {
            if (report) {
                this.reportTitle = report.title;
                this.templateName = report.template;
                this.reportStatus = report.status;
                this.chapterTree = this.convertChaptersToTreeNodes(report.chapters);
                this.originalChapterTree = this.deepCloneTree(this.chapterTree);
                this.referenceDocs = report.referenceDocs;

                // Load content blocks into the map
                this.loadChapterContent(report.chapters);

                // Initialize selectedNode
                if (this.chapterTree.length > 0 && this.chapterTree[0].children) {
                    this.selectedNode = this.chapterTree[0].children[0] || null;
                    if (this.selectedNode) {
                        this.selectedChapter = this.selectedNode.key!;
                    }
                }

                // Update AI readiness based on loaded data
                this.updateAiReadiness();

                this.cdr.markForCheck();
            }
        });
    }

    private convertChaptersToTreeNodes(chapters: any[]): TreeNode[] {
        return chapters.map(chapter => ({
            key: chapter.key,
            label: chapter.label,
            expanded: chapter.expanded,
            children: chapter.children ? this.convertChaptersToTreeNodes(chapter.children) : undefined
        }));
    }

    private loadChapterContent(chapters: any[]): void {
        chapters.forEach(chapter => {
            if (chapter.blocks) {
                this.content.set(chapter.key, chapter.blocks);
            }
            if (chapter.children) {
                this.loadChapterContent(chapter.children);
            }
        });
    }

    // Filter chapters based on search text
    filterChapters(): void {
        if (!this.chapterSearchText.trim()) {
            this.chapterTree = this.deepCloneTree(this.originalChapterTree);
            this.cdr.markForCheck();
            return;
        }

        const searchLower = this.chapterSearchText.toLowerCase();
        this.chapterTree = this.filterTree(this.originalChapterTree, searchLower);
        this.cdr.markForCheck();
    }

    private filterTree(nodes: TreeNode[], searchText: string): TreeNode[] {
        const result: TreeNode[] = [];

        for (const node of nodes) {
            const labelMatches = node.label?.toLowerCase().includes(searchText);
            const filteredChildren = node.children ? this.filterTree(node.children, searchText) : [];

            if (labelMatches || filteredChildren.length > 0) {
                result.push({
                    ...node,
                    expanded: true,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children
                });
            }
        }

        return result;
    }

    private deepCloneTree(nodes: TreeNode[]): TreeNode[] {
        return nodes.map(node => ({
            ...node,
            expanded: node.expanded,
            children: node.children ? this.deepCloneTree(node.children) : undefined
        }));
    }

    // Open review modal to show all chapters
    openReviewModal(): void {
        this.showReviewModal = true;
        this._cachedChaptersForReview = this.computeChaptersForReview();
        this.cdr.markForCheck();
    }

    // Cached chapters for review (computed only when modal opens)
    _cachedChaptersForReview: { key: string; label: string; blocks: ContentBlock[] }[] = [];

    get allChaptersForReview(): { key: string; label: string; blocks: ContentBlock[] }[] {
        return this._cachedChaptersForReview;
    }

    // Only chapters that have content (for continuous document view)
    get chaptersWithContent(): { key: string; label: string; blocks: ContentBlock[] }[] {
        return this._cachedChaptersForReview.filter(chapter => chapter.blocks.length > 0);
    }

    private computeChaptersForReview(): { key: string; label: string; blocks: ContentBlock[] }[] {
        const chapters: { key: string; label: string; blocks: ContentBlock[] }[] = [];
        this.flattenChapters(this.originalChapterTree, chapters);
        return chapters;
    }

    private flattenChapters(nodes: TreeNode[], result: { key: string; label: string; blocks: ContentBlock[] }[]): void {
        for (const node of nodes) {
            const blocks = this.content.get(node.key!) ?? [];
            result.push({ key: node.key!, label: node.label!, blocks });
            if (node.children) {
                this.flattenChapters(node.children, result);
            }
        }
    }

    ngOnDestroy(): void {
        this.captionSub?.unsubscribe();
    }

    get blocks(): ContentBlock[] {
        return this.content.get(this.selectedChapter) ?? [];
    }

    // AI Readiness progress calculation
    get aiReadinessProgress(): number {
        const totalWeight = this.aiReadinessItems.reduce((sum, item) => sum + item.weight, 0);
        const availableWeight = this.aiReadinessItems
            .filter(item => item.available)
            .reduce((sum, item) => sum + item.weight, 0);
        return totalWeight > 0 ? Math.round((availableWeight / totalWeight) * 100) : 0;
    }

    getAiReadinessColor(): string {
        const progress = this.aiReadinessProgress;
        if (progress >= 75) return 'var(--p-green-500)';
        if (progress >= 50) return 'var(--p-yellow-500)';
        if (progress >= 25) return 'var(--p-orange-500)';
        return 'var(--p-red-500)';
    }

    getAiReadinessClass(): string {
        const progress = this.aiReadinessProgress;
        if (progress >= 75) return 'text-green-500';
        if (progress >= 50) return 'text-yellow-500';
        if (progress >= 25) return 'text-orange-500';
        return 'text-red-500';
    }

    getAiReadinessMessage(): string {
        const progress = this.aiReadinessProgress;
        const available = this.aiReadinessItems.filter(item => item.available).length;
        const total = this.aiReadinessItems.length;

        if (progress >= 75) {
            return `Excellent! AI has sufficient data (${available}/${total} sources) to generate most of this report automatically.`;
        } else if (progress >= 50) {
            return `Good progress. Add more reference documents to improve AI auto-generation quality.`;
        } else if (progress >= 25) {
            return `Limited data available. Upload more documents to enable better AI assistance.`;
        }
        return `Upload photos, documents and reference materials to enable AI report generation.`;
    }

    updateAiReadiness(): void {
        // Check for photos across ALL chapters, not just current
        let hasPhotos = false;
        this.content.forEach((blocks) => {
            if (blocks.some(b => b.images && b.images.length > 0)) {
                hasPhotos = true;
            }
        });

        const hasReferenceDocs = this.referenceDocs.length > 0;

        this.aiReadinessItems = this.aiReadinessItems.map(item => {
            if (item.label === 'Photos') return { ...item, available: hasPhotos };
            if (item.label === 'Reference Docs') return { ...item, available: hasReferenceDocs };
            return item;
        });
        this.cdr.markForCheck();
    }

    get referredDocs(): ReferenceDoc[] {
        const docs: ReferenceDoc[] = [];
        const seenIds = new Set<string>();

        this.blocks.forEach(b => {
            b.images?.forEach(img => {
                if (!seenIds.has(img.id)) {
                    seenIds.add(img.id);
                    docs.push({
                        id: img.id,
                        title: img.caption || 'Untitled Asset',
                        type: 'image',
                        description: 'Asset used in ' + this.selectedChapter
                    });
                }
            });
        });

        return docs;
    }

    onNodeSelect(event: any): void {
        this.selectChapter(event.node.key);
    }

    isChapterFinished(node: TreeNode): boolean {
        if (!node.children || node.children.length === 0) {
            const blocks = this.content.get(node.key!);
            return !!(blocks && blocks.length > 0);
        }
        // Parent node is finished if all children are finished
        return node.children.every(c => this.isChapterFinished(c));
    }

    get overallProgress(): number {
        const leafNodes: TreeNode[] = [];
        const traverse = (n: TreeNode) => {
            if (!n.children || n.children.length === 0) {
                leafNodes.push(n);
            }
            if (n.children) {
                n.children.forEach(traverse);
            }
        };

        this.chapterTree.forEach(traverse);
        if (leafNodes.length === 0) return 0;

        const completed = leafNodes.filter(n => this.isChapterFinished(n)).length;
        return Math.round((completed / leafNodes.length) * 100);
    }

    getProgressColor(): string {
        const p = this.overallProgress;
        if (p >= 80) return '#22c55e'; // Green
        if (p >= 40) return '#eab308'; // Yellow
        return '#94a3b8'; // Gray
    }

    selectChapter(event: any): void {
        this.selectedChapter = event?.node?.key;
        if (!this.selectedChapter) {
            return;
        }

        if (!this.content.has(this.selectedChapter)) {
            this.content.set(this.selectedChapter, []);
        }
    }

    onFileSelect(event: any, fileUpload?: any): void {
        const files: File[] = event.files;
        if (!files || files.length === 0) return;

        const newImages: ContentImage[] = Array.from(files).map((file: File) => ({
            id: this.uid(),
            url: URL.createObjectURL(file),
            caption: ''
        }));

        this.pendingImages = [...this.pendingImages, ...newImages];

        if (fileUpload) {
            fileUpload.clear();
        }

        this.cdr.markForCheck();
    }

    removePendingImage(index: number): void {
        this.pendingImages = this.pendingImages.filter((_, i) => i !== index);
        this.cdr.markForCheck();
    }

    updatePendingCaption(index: number, caption: string): void {
        this.captionUpdate$.next({ index, caption });
    }

    editBlock(block: ContentBlock): void {
        this.editingBlockId = block.id;
        this.textForm.reset({ text: block.text || '' });
        this.pendingImages = block.images ? [...block.images] : [];
        this.showAddBlockModal = true;
        this.cdr.markForCheck();
    }

    openAddBlockModal(): void {
        this.editingBlockId = null;
        this.textForm.reset({ text: '' });
        this.pendingImages = [];
        this.showAddBlockModal = true;
        this.cdr.markForCheck();
    }

    trackByImage(index: number, item: ContentImage): string {
        return item.id;
    }

    saveBlock(): void {
        const { text } = this.textForm.getRawValue();
        const trimmedText = text.trim();

        if (trimmedText || this.pendingImages.length > 0) {
            if (this.editingBlockId) {
                // Update existing block
                const updatedBlocks = this.blocks.map(b =>
                    b.id === this.editingBlockId
                        ? { ...b, text: trimmedText || undefined, images: this.pendingImages.length > 0 ? [...this.pendingImages] : undefined }
                        : b
                );
                this.content.set(this.selectedChapter, updatedBlocks);
            } else {
                // Create new block
                const newBlock: ContentBlock = {
                    id: this.uid(),
                    text: trimmedText || undefined,
                    images: this.pendingImages.length > 0 ? [...this.pendingImages] : undefined
                };
                this.content.set(this.selectedChapter, [...this.blocks, newBlock]);
            }

            // Reset
            this.textForm.reset({ text: '' });
            this.imageForm.reset({ caption: '' });
            this.pendingImages = [];
            this.editingBlockId = null;
            this.showAddBlockModal = false;
            this.cdr.markForCheck();
        } else {
            this.textForm.markAllAsTouched();
        }
    }

    safe(url?: string): SafeUrl | undefined {
        return url ? this.sanitizer.bypassSecurityTrustUrl(url) : undefined;
    }

    sendChat(): void {
        if (this.chatInput.invalid) {
            this.chatInput.markAsTouched();
            return;
        }

        const text = this.chatInput.getRawValue().trim();
        if (!text) {
            return;
        }

        this.chatMessages.push({
            id: this.uid(),
            side: 'user',
            text,
            at: new Date()
        });

        // Placeholder AI response (wire to your AI endpoint)
        this.chatMessages.push({
            id: this.uid(),
            side: 'ai',
            text: 'AI integration placeholder for Reports.',
            at: new Date()
        });

        this.chatInput.setValue('');
    }

    onDrop(event: CdkDragDrop<ContentBlock[]>): void {
        const newBlocks = [...this.blocks];
        moveItemInArray(newBlocks, event.previousIndex, event.currentIndex);
        this.content.set(this.selectedChapter, newBlocks);
    }

    deleteBlock(index: number): void {
        this.content.set(this.selectedChapter, this.blocks.filter((_, i) => i !== index));
        this.cdr.markForCheck();
    }

    getRefIcon(type: string): string {
        switch (type) {
            case 'pdf': return 'pi pi-file-pdf';
            case 'image': return 'pi pi-image';
            case 'csv': return 'pi pi-file-excel';
            case 'doc': return 'pi pi-file-word';
            default: return 'pi pi-file';
        }
    }

    getRefColor(type: string): string {
        switch (type) {
            case 'pdf': return '#ef4444'; // Red
            case 'image': return '#3b82f6'; // Blue
            case 'csv': return '#22c55e'; // Green
            case 'doc': return '#6366f1'; // Indigo
            default: return '#64748b'; // Slate
        }
    }

    getStatusSeverity(status: string): 'secondary' | 'info' | 'success' {
        const option = this.statusOptions.find(o => o.value === status);
        return option ? option.severity : 'secondary';
    }

    exportReport(): void {
        console.log('Exporting report...');
    }

    printReport(): void {
        console.log('Printing report...');
    }

    emailReport(): void {
        console.log('Emailing report...');
    }

    openAddRefModal(): void {
        this.refForm.reset({
            title: '',
            description: '',
            type: 'pdf'
        });
        this.showAddRefModal = true;
    }

    onRefFileSelect(event: any): void {
        const file = event.files[0];
        if (!file) return;

        const name = file.name;
        const ext = name.split('.').pop()?.toLowerCase();

        let type: 'pdf' | 'image' | 'csv' | 'doc' = 'pdf';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) type = 'image';
        else if (['csv', 'xls', 'xlsx'].includes(ext)) type = 'csv';
        else if (['doc', 'docx'].includes(ext)) type = 'doc';

        this.refForm.patchValue({
            title: name,
            type: type
        });
    }

    saveReferenceDoc(): void {
        if (this.refForm.invalid) return;

        const val = this.refForm.getRawValue();
        const newDoc: ReferenceDoc = {
            id: this.uid(),
            ...val
        };

        this.referenceDocs = [newDoc, ...this.referenceDocs];
        this.showAddRefModal = false;
        this.cdr.markForCheck();
    }

    private uid(): string {
        return Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
    }
}
