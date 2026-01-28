import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TreeModule } from 'primeng/tree';
import { TreeNode } from 'primeng/api';
import { SplitterModule } from 'primeng/splitter';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { FileUploadModule } from 'primeng/fileupload';
import { EditorModule } from 'primeng/editor';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { TemplateConfigService } from './services/template-config.service';
import {
    ReportTemplateConfig,
    TemplateChapter,
    TemplateBlock,
    BlockConstraint,
    AiSummaryField,
    UploadedDocument,
    AiAnalysisResult,
    createEmptyTemplate,
    createDefaultAiSummaryFields,
    createEmptyChapter,
    createEmptyBlock,
    createEmptyConstraint,
    generateId
} from './models/template-config.model';

type EditorMode = 'create' | 'edit';

@Component({
    selector: 'app-template-editor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        TreeModule,
        SplitterModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        ToolbarModule,
        TagModule,
        CheckboxModule,
        DialogModule,
        TooltipModule,
        ProgressBarModule,
        FileUploadModule,
        EditorModule,
        DragDropModule
    ],
    templateUrl: './template-editor.component.html',
    styleUrls: ['./template-editor.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateEditorComponent implements OnInit {
    mode: EditorMode = 'create';
    template: ReportTemplateConfig | null = null;

    // Form
    templateName = '';
    templateDescription = '';

    // Chapter tree
    chapterTree: TreeNode[] = [];
    selectedChapterNode: TreeNode | null = null;
    selectedChapter: TemplateChapter | null = null;

    // Block editing
    selectedBlock: TemplateBlock | null = null;
    blockContent = '';

    // Creation mode - document upload
    uploadedDocuments: UploadedDocument[] = [];
    isAnalyzing = false;
    analysisResult: AiAnalysisResult | null = null;
    hasAnalyzed = false; // Tracks if user has analyzed docs or skipped onboarding

    // AI Summary validation
    validatingFieldId: string | null = null;

    // Dialogs
    showDeleteConfirm = false;
    showPublishConfirm = false;
    itemToDelete: { type: 'chapter' | 'block' | 'constraint'; id: string } | null = null;

    // Saving state
    isSaving = false;
    hasUnsavedChanges = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private templateService: TemplateConfigService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'new') {
            this.mode = 'edit';
            this.loadTemplate(id);
        } else {
            this.mode = 'create';
            this.initializeNewTemplate();
        }
    }

    private loadTemplate(id: string): void {
        this.templateService.getTemplateById(id).subscribe(template => {
            if (template) {
                this.template = template;
                this.templateName = template.name;
                this.templateDescription = template.description;
                this.buildChapterTree();
                this.cdr.markForCheck();
            }
        });
    }

    private initializeNewTemplate(): void {
        this.template = createEmptyTemplate();
        this.template.aiSummary = createDefaultAiSummaryFields();
        this.templateName = '';
        this.templateDescription = '';
        this.cdr.markForCheck();
    }

    private buildChapterTree(): void {
        if (!this.template) return;
        this.chapterTree = this.convertChaptersToTree(this.template.chapters);
    }

    private convertChaptersToTree(chapters: TemplateChapter[]): TreeNode[] {
        return chapters.map(chapter => ({
            key: chapter.id,
            label: chapter.label,
            data: chapter,
            expanded: chapter.expanded,
            children: chapter.children ? this.convertChaptersToTree(chapter.children) : [],
            icon: chapter.blocks.some(b => b.mandatory) ? 'pi pi-star-fill' : 'pi pi-file'
        }));
    }

    // Document Upload (Creation Mode)
    onDocumentUpload(event: any): void {
        // PrimeNG FileUpload provides files in currentFiles or files property
        const files = event.currentFiles || event.files || [];

        if (!files || files.length === 0) {
            console.warn('No files found in upload event:', event);
            return;
        }

        files.forEach((file: File) => {
            // Check if file already exists to avoid duplicates
            const exists = this.uploadedDocuments.some(d => d.name === file.name);
            if (!exists) {
                const doc: UploadedDocument = {
                    id: generateId(),
                    name: file.name,
                    type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx',
                    size: this.formatFileSize(file.size),
                    uploadedAt: new Date(),
                    analyzed: false
                };
                this.uploadedDocuments.push(doc);
            }
        });

        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
        this.cdr.detectChanges(); // Force immediate change detection
    }

    removeDocument(doc: UploadedDocument): void {
        const index = this.uploadedDocuments.findIndex(d => d.id === doc.id);
        if (index !== -1) {
            this.uploadedDocuments.splice(index, 1);
            this.cdr.markForCheck();
        }
    }

    analyzeDocuments(): void {
        if (this.uploadedDocuments.length === 0) return;

        this.isAnalyzing = true;
        this.cdr.markForCheck();

        this.templateService.analyzeDocuments(this.uploadedDocuments).subscribe(result => {
            this.analysisResult = result;
            this.isAnalyzing = false;
            this.hasAnalyzed = true; // Mark as analyzed to show editor

            // Apply analysis to template
            if (this.template) {
                this.templateName = result.suggestedName;
                this.templateDescription = result.suggestedDescription;
                this.template.aiSummary = result.aiSummaryFields;
                this.template.chapters = result.chapters;
                this.buildChapterTree();
            }

            // Mark documents as analyzed
            this.uploadedDocuments.forEach(d => d.analyzed = true);

            this.hasUnsavedChanges = true;
            this.cdr.markForCheck();
        });
    }

    // Skip onboarding and start from scratch
    skipOnboarding(): void {
        this.hasAnalyzed = true;
        this.cdr.markForCheck();
    }

    // AI Summary Field Validation
    validateField(field: AiSummaryField): void {
        if (!this.template) return;

        this.validatingFieldId = field.id;
        this.cdr.markForCheck();

        this.templateService.validateAiSummaryField(this.template.id, field.id).subscribe(valid => {
            field.validated = valid;
            field.validatedAt = new Date();
            this.validatingFieldId = null;
            this.hasUnsavedChanges = true;
            this.cdr.markForCheck();
        });
    }

    onFieldChange(field: AiSummaryField): void {
        field.validated = false;
        field.aiGenerated = false;
        this.hasUnsavedChanges = true;
    }

    // Chapter Selection
    onChapterSelect(event: any): void {
        const node = event.node as TreeNode;
        this.selectedChapterNode = node;
        this.selectedChapter = node.data as TemplateChapter;
        this.selectedBlock = null;
        this.cdr.markForCheck();
    }

    // Chapter Operations
    addChapter(): void {
        if (!this.template) return;

        const newChapter = createEmptyChapter(this.template.chapters.length + 1);
        this.template.chapters.push(newChapter);
        this.buildChapterTree();
        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
    }

    addSubChapter(): void {
        if (!this.template || !this.selectedChapter) return;

        const newChapter = createEmptyChapter(
            (this.selectedChapter.children?.length || 0) + 1,
            this.selectedChapter.indent + 1
        );
        this.selectedChapter.children = this.selectedChapter.children || [];
        this.selectedChapter.children.push(newChapter);
        this.buildChapterTree();
        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
    }

    moveChapterUp(): void {
        if (!this.template || !this.selectedChapter) return;

        const chapters = this.getParentChapterList();
        const index = chapters.findIndex(c => c.id === this.selectedChapter!.id);
        if (index > 0) {
            moveItemInArray(chapters, index, index - 1);
            this.reorderChapters(chapters);
            this.buildChapterTree();
            this.hasUnsavedChanges = true;
            this.cdr.markForCheck();
        }
    }

    moveChapterDown(): void {
        if (!this.template || !this.selectedChapter) return;

        const chapters = this.getParentChapterList();
        const index = chapters.findIndex(c => c.id === this.selectedChapter!.id);
        if (index < chapters.length - 1) {
            moveItemInArray(chapters, index, index + 1);
            this.reorderChapters(chapters);
            this.buildChapterTree();
            this.hasUnsavedChanges = true;
            this.cdr.markForCheck();
        }
    }

    indentChapter(): void {
        if (!this.template || !this.selectedChapter) return;
        this.selectedChapter.indent++;
        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
    }

    outdentChapter(): void {
        if (!this.template || !this.selectedChapter || this.selectedChapter.indent <= 0) return;
        this.selectedChapter.indent--;
        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
    }

    private getParentChapterList(): TemplateChapter[] {
        if (!this.template || !this.selectedChapter) return [];

        if (this.selectedChapter.indent === 0) {
            return this.template.chapters;
        }

        // Find parent
        const parent = this.findParentChapter(this.template.chapters, this.selectedChapter.id);
        return parent?.children || [];
    }

    private findParentChapter(chapters: TemplateChapter[], childId: string): TemplateChapter | undefined {
        for (const chapter of chapters) {
            if (chapter.children?.some(c => c.id === childId)) {
                return chapter;
            }
            if (chapter.children) {
                const found = this.findParentChapter(chapter.children, childId);
                if (found) return found;
            }
        }
        return undefined;
    }

    private reorderChapters(chapters: TemplateChapter[]): void {
        chapters.forEach((chapter, index) => {
            chapter.order = index + 1;
        });
    }

    // Block Operations
    selectBlock(block: TemplateBlock): void {
        this.selectedBlock = block;
        this.blockContent = block.content;
        this.cdr.markForCheck();
    }

    addBlock(): void {
        if (!this.selectedChapter) return;

        const newBlock = createEmptyBlock(this.selectedChapter.blocks.length + 1);
        this.selectedChapter.blocks.push(newBlock);
        this.selectBlock(newBlock);
        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
    }

    deleteBlock(block: TemplateBlock): void {
        if (!this.selectedChapter) return;

        if (block.mandatory) {
            // Show confirmation for mandatory blocks
            this.itemToDelete = { type: 'block', id: block.id };
            this.showDeleteConfirm = true;
        } else {
            this.removeBlock(block);
        }
    }

    private removeBlock(block: TemplateBlock): void {
        if (!this.selectedChapter) return;

        const index = this.selectedChapter.blocks.findIndex(b => b.id === block.id);
        if (index !== -1) {
            this.selectedChapter.blocks.splice(index, 1);
            if (this.selectedBlock?.id === block.id) {
                this.selectedBlock = null;
            }
            this.hasUnsavedChanges = true;
            this.cdr.markForCheck();
        }
    }

    onBlockContentChange(): void {
        if (this.selectedBlock) {
            this.selectedBlock.content = this.blockContent;
            this.hasUnsavedChanges = true;
        }
    }

    toggleBlockMandatory(block: TemplateBlock): void {
        block.mandatory = !block.mandatory;
        this.buildChapterTree(); // Update icons
        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
    }

    // Constraint Operations
    addConstraint(): void {
        if (!this.selectedBlock) return;

        const newConstraint = createEmptyConstraint();
        this.selectedBlock.constraints.push(newConstraint);
        this.hasUnsavedChanges = true;
        this.cdr.markForCheck();
    }

    removeConstraint(constraint: BlockConstraint): void {
        if (!this.selectedBlock) return;

        const index = this.selectedBlock.constraints.findIndex(c => c.id === constraint.id);
        if (index !== -1) {
            this.selectedBlock.constraints.splice(index, 1);
            this.hasUnsavedChanges = true;
            this.cdr.markForCheck();
        }
    }

    toggleConstraintValidation(constraint: BlockConstraint): void {
        constraint.requiresValidation = !constraint.requiresValidation;
        this.hasUnsavedChanges = true;
    }

    // Save Operations
    saveTemplate(): void {
        if (!this.template) return;

        this.isSaving = true;
        this.template.name = this.templateName;
        this.template.description = this.templateDescription;
        this.template.lastModified = new Date();

        if (this.mode === 'create') {
            this.templateService.createTemplate(this.template).subscribe(created => {
                this.template = created;
                this.mode = 'edit';
                this.isSaving = false;
                this.hasUnsavedChanges = false;
                this.cdr.markForCheck();
            });
        } else {
            this.templateService.updateTemplate(this.template.id, this.template).subscribe(() => {
                this.isSaving = false;
                this.hasUnsavedChanges = false;
                this.cdr.markForCheck();
            });
        }
    }

    publishTemplate(): void {
        if (!this.template) return;

        this.templateService.publishTemplate(this.template.id).subscribe(updated => {
            if (updated) {
                this.template = updated;
                this.showPublishConfirm = false;
                this.cdr.markForCheck();
            }
        });
    }

    // Helpers
    formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    getConstraintSummary(): string {
        if (!this.selectedChapter) return '';

        let total = 0;
        let requiresValidation = 0;

        this.selectedChapter.blocks.forEach(block => {
            total += block.constraints.length;
            requiresValidation += block.constraints.filter(c => c.requiresValidation).length;
        });

        if (total === 0) return 'No constraints defined';
        return `${total} constraint${total !== 1 ? 's' : ''}, ${requiresValidation} require${requiresValidation !== 1 ? '' : 's'} AI validation`;
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'secondary' {
        return status === 'published' ? 'success' : 'secondary';
    }

    canPublish(): boolean {
        return !!(this.template && this.templateName && this.template.chapters.length > 0);
    }

    // Template helper methods
    hasMandatoryBlocks(chapter: TemplateChapter | undefined): boolean {
        if (!chapter || !chapter.blocks) return false;
        return chapter.blocks.some(b => b.mandatory);
    }

    getMandatoryBlockCount(chapter: TemplateChapter | undefined): number {
        if (!chapter || !chapter.blocks) return 0;
        return chapter.blocks.filter(b => b.mandatory).length;
    }

    onChapterLabelChange(): void {
        this.hasUnsavedChanges = true;
        this.rebuildChapterTree();
    }

    rebuildChapterTree(): void {
        if (!this.template) return;
        this.chapterTree = this.convertChaptersToTree(this.template.chapters);
    }

    goBack(): void {
        this.router.navigate(['/block-templates']);
    }
}
