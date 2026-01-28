import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, delay } from 'rxjs';
import {
    ReportTemplateConfig,
    TemplateChapter,
    TemplateBlock,
    BlockConstraint,
    AiSummaryField,
    AiAnalysisResult,
    UploadedDocument,
    generateId,
    incrementVersion,
    createEmptyTemplate,
    createDefaultAiSummaryFields,
    createEmptyChapter,
    createEmptyBlock
} from '../models/template-config.model';
import { AiProviderService } from '../ai-providers/ai-provider.service';
import { StorageService } from '../../../core/services/storage.service';

@Injectable({
    providedIn: 'root'
})
export class TemplateConfigService {
    private readonly STORAGE_KEY = 'templates';
    private templates: ReportTemplateConfig[] = [];
    private templatesSubject = new BehaviorSubject<ReportTemplateConfig[]>([]);

    // Inject services
    private aiProviderService = inject(AiProviderService);
    private storageService = inject(StorageService);

    constructor() {
        this.loadData();
    }

    /**
     * Load data from storage or fall back to mock data
     */
    private loadData(): void {
        const savedTemplates = this.storageService.load<ReportTemplateConfig[]>(this.STORAGE_KEY);
        if (savedTemplates && savedTemplates.length > 0) {
            this.templates = savedTemplates;
            this.templatesSubject.next(this.templates);
            console.log(`Loaded ${this.templates.length} templates from storage`);
        } else {
            this.loadMockData();
            console.log('No saved templates found, using mock data');
        }
    }

    /**
     * Save templates to persistent storage
     */
    private saveData(): void {
        this.storageService.save(this.STORAGE_KEY, this.templates);
        this.templatesSubject.next(this.templates);
    }

    private loadMockData(): void {
        this.templates = [
            {
                id: '1',
                name: 'Damage Assessment Report',
                description: 'Standard template for vehicle damage assessment reports',
                version: '2.1',
                status: 'published',
                createdAt: new Date('2024-01-15'),
                lastModified: new Date('2024-03-10'),
                publishedAt: new Date('2024-03-10'),
                createdBy: 'admin',
                lastModifiedBy: 'john.doe',
                aiSummary: [
                    {
                        id: 'as1',
                        label: 'Required Documents',
                        value: 'Vehicle photos (front, back, sides), Insurance policy document, Vehicle registration',
                        placeholder: 'List required documents',
                        aiGenerated: true,
                        validated: true,
                        validatedAt: new Date('2024-03-10')
                    },
                    {
                        id: 'as2',
                        label: 'Target Audience',
                        value: 'Insurance adjusters, Claims processors',
                        placeholder: 'Who will use this report?',
                        aiGenerated: true,
                        validated: true,
                        validatedAt: new Date('2024-03-10')
                    }
                ],
                chapters: [
                    {
                        id: 'ch1',
                        key: 'executive-summary',
                        label: 'Executive Summary',
                        order: 1,
                        indent: 0,
                        expanded: true,
                        blocks: [
                            {
                                id: 'b1',
                                type: 'text',
                                content: '<p>Provide a brief overview of the damage assessment findings.</p>',
                                mandatory: true,
                                constraints: [
                                    { id: 'c1', text: 'Must include total estimated damage cost', aiGenerated: true, requiresValidation: true, validated: false },
                                    { id: 'c2', text: 'Spell check and grammar validation', aiGenerated: true, requiresValidation: true, validated: false }
                                ],
                                order: 1
                            }
                        ],
                        children: []
                    },
                    {
                        id: 'ch2',
                        key: 'vehicle-details',
                        label: 'Vehicle Details',
                        order: 2,
                        indent: 0,
                        expanded: true,
                        blocks: [
                            {
                                id: 'b2',
                                type: 'text',
                                content: '<p>Document vehicle make, model, year, and registration.</p>',
                                mandatory: true,
                                constraints: [
                                    { id: 'c3', text: 'Include VIN number', aiGenerated: true, requiresValidation: false, validated: false }
                                ],
                                order: 1
                            }
                        ],
                        children: [
                            {
                                id: 'ch2-1',
                                key: 'damage-photos',
                                label: 'Damage Photos',
                                order: 1,
                                indent: 1,
                                expanded: true,
                                blocks: [
                                    {
                                        id: 'b3',
                                        type: 'image',
                                        content: '',
                                        mandatory: true,
                                        constraints: [
                                            { id: 'c4', text: 'Minimum 4 photos required', aiGenerated: true, requiresValidation: true, validated: false }
                                        ],
                                        order: 1
                                    }
                                ],
                                children: []
                            }
                        ]
                    }
                ],
                versionHistory: [
                    { version: '1.0', status: 'published', createdAt: new Date('2024-01-15'), publishedAt: new Date('2024-01-20'), createdBy: 'admin' },
                    { version: '2.0', status: 'published', createdAt: new Date('2024-02-10'), publishedAt: new Date('2024-02-15'), createdBy: 'admin', changelog: 'Added photo requirements' },
                    { version: '2.1', status: 'published', createdAt: new Date('2024-03-05'), publishedAt: new Date('2024-03-10'), createdBy: 'john.doe', changelog: 'Updated constraints' }
                ]
            },
            {
                id: '2',
                name: 'SRPM Audit Report',
                description: 'Social Responsible Process Management audit template',
                version: '1.2',
                status: 'draft',
                createdAt: new Date('2024-02-01'),
                lastModified: new Date('2024-03-18'),
                createdBy: 'admin',
                lastModifiedBy: 'jane.smith',
                aiSummary: [
                    {
                        id: 'as3',
                        label: 'Audit Scope',
                        value: 'Management responsibility, Chain management, Monitoring systems',
                        placeholder: 'Define audit scope',
                        aiGenerated: false,
                        validated: false
                    }
                ],
                chapters: [
                    {
                        id: 'ch3',
                        key: 'management-responsibility',
                        label: 'Management Responsibility',
                        order: 1,
                        indent: 0,
                        expanded: true,
                        blocks: [
                            {
                                id: 'b4',
                                type: 'text',
                                content: '<p>Assess management commitment to social responsibility.</p>',
                                mandatory: true,
                                constraints: [],
                                order: 1
                            }
                        ],
                        children: []
                    }
                ],
                versionHistory: [
                    { version: '1.0', status: 'published', createdAt: new Date('2024-02-01'), publishedAt: new Date('2024-02-05'), createdBy: 'admin' },
                    { version: '1.1', status: 'published', createdAt: new Date('2024-02-20'), publishedAt: new Date('2024-02-25'), createdBy: 'admin' },
                    { version: '1.2', status: 'draft', createdAt: new Date('2024-03-15'), createdBy: 'jane.smith', changelog: 'Adding new chapters' }
                ]
            }
        ];
        this.templatesSubject.next(this.templates);
    }

    // Get all templates
    getAllTemplates(): Observable<ReportTemplateConfig[]> {
        return this.templatesSubject.asObservable();
    }

    // Get template by ID
    getTemplateById(id: string): Observable<ReportTemplateConfig | undefined> {
        return of(this.templates.find(t => t.id === id));
    }

    // Create new template
    createTemplate(template: Partial<ReportTemplateConfig>): Observable<ReportTemplateConfig> {
        const newTemplate: ReportTemplateConfig = {
            ...createEmptyTemplate(),
            ...template,
            id: generateId(),
            createdAt: new Date(),
            lastModified: new Date(),
            aiSummary: template.aiSummary || createDefaultAiSummaryFields()
        };
        this.templates.push(newTemplate);
        this.saveData();
        return of(newTemplate);
    }

    // Update template
    updateTemplate(id: string, updates: Partial<ReportTemplateConfig>): Observable<ReportTemplateConfig | undefined> {
        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            // If editing a published template, change status to draft
            if (this.templates[index].status === 'published' && updates.status !== 'published') {
                updates.status = 'draft';
            }
            this.templates[index] = {
                ...this.templates[index],
                ...updates,
                lastModified: new Date()
            };
            this.saveData();
            return of(this.templates[index]);
        }
        return of(undefined);
    }

    // Publish template
    publishTemplate(id: string): Observable<ReportTemplateConfig | undefined> {
        const template = this.templates.find(t => t.id === id);
        if (template) {
            const newVersion = incrementVersion(template.version);
            template.version = newVersion;
            template.status = 'published';
            template.publishedAt = new Date();
            template.lastModified = new Date();
            template.versionHistory.push({
                version: newVersion,
                status: 'published',
                createdAt: new Date(),
                publishedAt: new Date(),
                createdBy: template.lastModifiedBy
            });
            this.saveData();
            return of(template);
        }
        return of(undefined);
    }

    // Unpublish template (revert to draft)
    unpublishTemplate(id: string): Observable<ReportTemplateConfig | undefined> {
        const template = this.templates.find(t => t.id === id);
        if (template) {
            template.status = 'draft';
            template.lastModified = new Date();
            this.saveData();
            return of(template);
        }
        return of(undefined);
    }

    // Delete template
    deleteTemplate(id: string): Observable<boolean> {
        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            this.templates.splice(index, 1);
            this.templatesSubject.next(this.templates);
            return of(true);
        }
        return of(false);
    }

    // Duplicate template
    duplicateTemplate(id: string): Observable<ReportTemplateConfig | undefined> {
        const template = this.templates.find(t => t.id === id);
        if (template) {
            const duplicate: ReportTemplateConfig = {
                ...JSON.parse(JSON.stringify(template)),
                id: generateId(),
                name: `${template.name} (Copy)`,
                version: '1.0',
                status: 'draft',
                createdAt: new Date(),
                lastModified: new Date(),
                publishedAt: undefined,
                versionHistory: [{
                    version: '1.0',
                    status: 'draft',
                    createdAt: new Date(),
                    createdBy: 'current-user'
                }]
            };
            this.templates.push(duplicate);
            this.templatesSubject.next(this.templates);
            return of(duplicate);
        }
        return of(undefined);
    }

    // ========================
    // AI Provider Integration
    // ========================

    /**
     * Get the AI Provider Service for direct access to provider configuration
     */
    getAiProviderService(): AiProviderService {
        return this.aiProviderService;
    }

    /**
     * Analyze documents using the configured AI provider
     * Uses the pluggable AI Provider Service architecture
     */
    analyzeDocuments(documents: UploadedDocument[]): Observable<AiAnalysisResult> {
        return this.aiProviderService.analyzeDocuments({ documents });
    }

    // Validate AI summary field (sends external request)
    validateAiSummaryField(templateId: string, fieldId: string): Observable<boolean> {
        // Simulate external validation request
        console.log(`Validating field ${fieldId} for template ${templateId}`);
        return of(true).pipe(delay(1000));
    }

    // Validate block constraints
    validateBlockConstraints(templateId: string, blockId: string): Observable<{ constraintId: string; valid: boolean; message?: string }[]> {
        // Simulate validation
        console.log(`Validating constraints for block ${blockId}`);
        return of([]).pipe(delay(1500));
    }

    // Chapter operations
    addChapter(templateId: string, chapter: TemplateChapter, parentId?: string): Observable<boolean> {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            if (parentId) {
                const parent = this.findChapterById(template.chapters, parentId);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(chapter);
                }
            } else {
                template.chapters.push(chapter);
            }
            template.lastModified = new Date();
            this.templatesSubject.next(this.templates);
            return of(true);
        }
        return of(false);
    }

    private findChapterById(chapters: TemplateChapter[], id: string): TemplateChapter | undefined {
        for (const chapter of chapters) {
            if (chapter.id === id) return chapter;
            if (chapter.children) {
                const found = this.findChapterById(chapter.children, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    // Block operations
    addBlock(templateId: string, chapterId: string, block: TemplateBlock): Observable<boolean> {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            const chapter = this.findChapterById(template.chapters, chapterId);
            if (chapter) {
                chapter.blocks.push(block);
                template.lastModified = new Date();
                this.templatesSubject.next(this.templates);
                return of(true);
            }
        }
        return of(false);
    }
}
