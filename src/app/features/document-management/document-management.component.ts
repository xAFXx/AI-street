import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';

// Document Viewer
import { NgxDocViewerModule } from 'ngx-doc-viewer';

// ZIP extraction
import JSZip from 'jszip';

// Services
import { SchemaService, Schema, SchemaProperty, MappedData, PropertyMapping } from '../../core/services/schema.service';
import { AiChatService } from '../../core/services/ai-chat.service';
import { SettingsService, CachedDocument, CachedResult } from '../../core/services/settings.service';
import { hasApiKey } from '../template-editor/ai-providers/ai-config';
import { OnboardingDialogComponent } from '../../shared/components/onboarding-dialog.component';
import { JsonTreeViewComponent } from '../../shared/components/json-tree-view/json-tree-view.component';
import { JsonDataViewerComponent } from '../../shared/components/json-data-viewer/json-data-viewer.component';

interface UploadedFile {
    id: string;             // Unique identifier (path-based or generated UUID)
    name: string;
    size: number;
    type: string;
    path?: string;         // Full path for hierarchy (e.g., "folder1/subfolder/file.pdf")
    content?: string;
    file?: File;           // Original file object for doc viewer
    objectUrl?: string;    // Object URL for doc viewer (temporary, lost on reload)
    dataUrl?: string;      // Base64 data URL for persistence (survives page reload)
    status: 'pending' | 'analyzing' | 'analyzed' | 'mapped' | 'error';
    errorMessage?: string; // Error message if status is 'error'
    analysisResult?: string;
    mappedData?: MappedData;
}

// Hierarchical file structure for folder display
interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;           // Full path: "folder1/subfolder/file.pdf"
    children: FileNode[];   // For folders (empty for files)
    file?: UploadedFile;    // For files
    isExpanded: boolean;
    status: 'pending' | 'processing' | 'completed' | 'error';
    errorMessage?: string;
}

// Failed file tracking (persisted to localStorage)
interface FailedFile {
    id: string;
    path: string;
    name: string;
    errorMessage: string;
    failedAt: Date;
    retryCount: number;
    dataUrl?: string;       // Preserved for retry
}

// Processing queue item for visual queue display
interface ProcessingQueueItem {
    id: string;
    fileId?: string;  // Original file ID for reliable lookup
    name: string;
    size: number;
    fileIndex: number;
    status: 'queued' | 'processing' | 'completed' | 'error';
    progress: number; // 0-100
    startTime?: number;
    endTime?: number;
    estimatedTimeMs?: number;
    errorMessage?: string;
}



@Component({
    selector: 'app-document-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        SelectModule,
        InputTextModule,
        TextareaModule,
        FileUploadModule,
        ProgressBarModule,
        TagModule,
        TooltipModule,
        DividerModule,
        TabsModule,
        MessageModule,
        ProgressSpinnerModule,
        DialogModule,
        CheckboxModule,
        NgxDocViewerModule,
        RouterLink,
        OnboardingDialogComponent,
        JsonTreeViewComponent,
        JsonDataViewerComponent
    ],
    templateUrl: './document-management.component.html',
    styleUrls: ['./document-management.component.less']
})
export class DocumentManagementComponent implements OnInit, OnDestroy {
    // Services
    private schemaService = inject(SchemaService);
    private aiChatService = inject(AiChatService);
    private settingsService = inject(SettingsService);
    private sanitizer = inject(DomSanitizer);

    // State signals
    schemas = this.schemaService.schemas;
    selectedSchemaId = signal<string | null>(null);
    schemaEditorContent = signal<string>('');
    isNewSchema = signal<boolean>(false);
    newSchemaName = signal<string>('');

    // AI Model selection (OpenAI models only - others require separate API integration)
    availableAiModels = [
        { id: 'gpt-4o', name: 'GPT-4o (Recommended)', provider: 'openai' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)', provider: 'openai' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Budget)', provider: 'openai' }
    ];
    selectedAiModel = signal<string>('gpt-4o');

    // File upload state
    uploadedFiles = signal<UploadedFile[]>([]);
    isAnalyzing = signal<boolean>(false);

    // Mapping state
    mappedData = signal<MappedData | null>(null);
    isMpping = signal<boolean>(false);

    // UI state
    activeTab = signal<number>(0);
    previewModalVisible = signal<boolean>(false);
    previewJson = signal<string>('');
    selectedPreviewFileIndex = signal<number>(0);

    // Result navigation state
    selectedResultIndex = signal<number>(-1);

    // Document preview state
    documentPreviewVisible = signal<boolean>(false);
    documentPreviewFile = signal<UploadedFile | null>(null);

    // View mode for original document (responsive)
    sideBySideMode = signal<boolean>(false);

    // Data view mode: friendly (cards), technical (table), raw (JSON)
    dataViewMode = signal<'friendly' | 'technical' | 'raw'>('friendly');

    // Processing queue state
    processingQueue = signal<ProcessingQueueItem[]>([]);
    showProcessingQueue = signal<boolean>(false);
    currentProcessingIndex = signal<number>(-1);
    processingStartTime = signal<number>(0);
    averageProcessingTimeMs = signal<number>(30000); // Default 30s estimate
    private progressInterval: ReturnType<typeof setInterval> | null = null;
    private completedItemsToRemove: string[] = [];

    // API Key dialog state
    showApiKeyDialog = signal<boolean>(false);

    // File hierarchy state (for folder uploads)
    fileHierarchy = signal<FileNode[]>([]);
    failedFiles = signal<FailedFile[]>([]);
    showFailedFilesPanel = signal<boolean>(false);

    // Credit exhaustion blocking state
    creditExhausted = signal<boolean>(false);
    creditExhaustedMessage = signal<string>('');

    // Parallel processing state (4 concurrent workers)
    readonly MAX_CONCURRENT_PROCESSING = 4;
    activeProcessingFiles = signal<{
        index: number;
        file: UploadedFile;
        thumbnail?: string; // Base64 data URL for preview
        startTime: number;
    }[]>([]);

    // Multi-select state for results management
    selectedResultIds = signal<Set<string>>(new Set());
    resultsTimeFilter = signal<'all' | 'today' | 'week' | 'older'>('all');
    resultsQualityFilter = signal<'all' | 'high' | 'medium' | 'low'>('all');

    // Computed values
    selectedSchema = computed(() => {
        const id = this.selectedSchemaId();
        return id ? this.schemaService.getSchemaById(id) : null;
    });

    hasFilesForAnalysis = computed(() => {
        return this.uploadedFiles().some(f => f.status === 'pending' || f.status === 'analyzed');
    });

    canPerformMapping = computed(() => {
        return this.selectedSchema() !== null &&
            this.uploadedFiles().some(f => f.status === 'analyzed');
    });

    hasAnalyzedFiles = computed(() => {
        return this.uploadedFiles().some(f => f.analysisResult !== undefined);
    });

    // Files that are still pending/processing (not yet mapped) for the document list
    pendingFiles = computed(() => {
        return this.uploadedFiles().filter(f => f.status !== 'mapped');
    });

    // Count of pending/processing queue items (not yet completed)
    pendingQueueCount = computed(() => {
        return this.processingQueue().filter(i => i.status !== 'completed').length;
    });

    mappedFiles = computed(() => {
        return this.uploadedFiles().filter(f => f.mappedData !== undefined);
    });

    hasMappedFiles = computed(() => {
        return this.mappedFiles().length > 0;
    });

    // Current preview file based on selection
    currentPreviewFile = computed(() => {
        const idx = this.selectedResultIndex();
        const files = this.filteredMappedFiles();
        return idx >= 0 && idx < files.length ? files[idx] : null;
    });

    // Search/filter state
    searchQuery = signal<string>('');

    // Filtered results based on search, time, and quality filters
    filteredMappedFiles = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const timeFilter = this.resultsTimeFilter();
        const qualityFilter = this.resultsQualityFilter();
        let files = this.mappedFiles();

        // Search filter
        if (query) {
            files = files.filter(f =>
                f.name.toLowerCase().includes(query) ||
                JSON.stringify(f.mappedData?.mappings).toLowerCase().includes(query)
            );
        }

        // Time filter - use upload time since processedAt may not exist
        if (timeFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            files = files.filter(f => {
                // Use a timestamp from mappedData or default to now
                const rawTime = (f.mappedData as any)?.timestamp || (f.mappedData as any)?.processedAt;
                const fileDate = rawTime ? new Date(rawTime) : new Date();
                if (timeFilter === 'today') return fileDate >= today;
                if (timeFilter === 'week') return fileDate >= weekAgo && fileDate < today;
                if (timeFilter === 'older') return fileDate < weekAgo;
                return true;
            });
        }

        // Quality filter based on confidence
        if (qualityFilter !== 'all') {
            files = files.filter(f => {
                const confidence = f.mappedData?.confidence ?? 0.5; // Default to medium if not set
                if (qualityFilter === 'high') return confidence >= 0.8;
                if (qualityFilter === 'medium') return confidence >= 0.5 && confidence < 0.8;
                if (qualityFilter === 'low') return confidence < 0.5;
                return true;
            });
        }

        return files;
    });

    // Schema dropdown options
    schemaOptions = computed(() => {
        return this.schemas().map(s => ({
            label: s.name,
            value: s.id
        }));
    });

    // Context ID for AI chat
    private readonly AI_CONTEXT_ID = 'document-analysis';

    constructor() {
        // Auto-save documents and results when they change
        effect(() => {
            const files = this.uploadedFiles();
            // Only save if there are files (avoid saving empty on init)
            if (files.length > 0) {
                const docs: CachedDocument[] = files.map(file => ({
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: file.content,
                    base64Data: file.dataUrl,  // Persist image data URL
                    status: file.status,
                    analysisResult: file.analysisResult,
                    addedAt: new Date()
                }));
                this.settingsService.saveDocuments(docs);
            }
        });

        // Auto-save results when mapped files change
        effect(() => {
            const mapped = this.mappedFiles();
            const schemaId = this.selectedSchemaId();
            if (mapped.length > 0) {
                const results: CachedResult[] = mapped.map(file => ({
                    id: crypto.randomUUID(),
                    documentName: file.name,
                    schemaId: schemaId || '',
                    mappedData: file.mappedData,
                    processedAt: new Date()
                }));
                this.settingsService.saveResults(results);
            }
        });

        // Auto-save schema content when it changes
        effect(() => {
            const content = this.schemaEditorContent();
            const schemaId = this.selectedSchemaId();
            // Only save if there's content and a schema selected
            if (content && content.length > 10 && schemaId) {
                this.settingsService.setSchemaContent(content);
            }
        });

        // Auto-save failed files to localStorage for persistence across browser sessions
        effect(() => {
            const failed = this.failedFiles();
            if (failed.length > 0) {
                this.saveFailedFilesToStorage();
            } else {
                // Clear storage when no failed files
                localStorage.removeItem('document_management_failed_files');
            }
        });
    }

    ngOnInit(): void {
        // Initialize AI context with document analysis prompt
        this.aiChatService.getContext(this.AI_CONTEXT_ID, this.getDocumentAnalysisPrompt());

        // Restore settings from localStorage
        this.restoreFromSettings();

        // Load failed files from storage for retry after browser restart
        this.loadFailedFilesFromStorage();
    }

    ngOnDestroy(): void {
        this.aiChatService.clearContext(this.AI_CONTEXT_ID);
        // Save current state to localStorage
        this.saveToSettings();
    }

    /**
     * Restore state from settings service
     */
    private restoreFromSettings(): void {
        const settings = this.settingsService.getSettings();

        // Restore last used schema - prioritize saved content over template
        if (settings.lastSchemaId) {
            this.selectedSchemaId.set(settings.lastSchemaId);

            // Try to restore custom schema content first
            const savedContent = this.settingsService.getSchemaContent();
            if (savedContent) {
                this.schemaEditorContent.set(savedContent);
            } else {
                // Fall back to loading from schema service
                const schema = this.schemaService.getSchemaById(settings.lastSchemaId);
                if (schema) {
                    const jsonSchema = this.schemaService.toJsonSchema(schema);
                    this.schemaEditorContent.set(JSON.stringify(jsonSchema, null, 2));
                }
            }
        }

        // Restore last used AI model
        if (settings.lastAiModel) {
            this.selectedAiModel.set(settings.lastAiModel);
        }

        // Restore cached documents
        const cachedDocs = this.settingsService.loadDocuments();
        if (cachedDocs.length > 0) {
            const restoredFiles: UploadedFile[] = cachedDocs.map(doc => ({
                id: doc.id || crypto.randomUUID(), // Restore or generate new ID
                name: doc.name,
                size: doc.size,
                type: doc.type,
                content: doc.content,
                path: doc.path,           // Restore folder path
                dataUrl: doc.base64Data,  // Restore persisted image data URL
                status: doc.status as UploadedFile['status'],
                analysisResult: doc.analysisResult
            }));
            this.uploadedFiles.set(restoredFiles);
        }

        // Restore cached results
        const cachedResults = this.settingsService.loadResults();
        if (cachedResults.length > 0) {
            this.uploadedFiles.update(files => {
                return files.map(file => {
                    const cachedResult = cachedResults.find(r => r.documentName === file.name);
                    if (cachedResult) {
                        return {
                            ...file,
                            status: 'mapped' as const,
                            mappedData: cachedResult.mappedData
                        };
                    }
                    return file;
                });
            });
        }

        // Rebuild file hierarchy after restoring documents
        if (cachedDocs.length > 0) {
            this.buildFileHierarchy();
        }
    }

    /**
     * Save current state to settings/localStorage
     */
    private saveToSettings(): void {
        // Save last used schema and AI model
        this.settingsService.setLastSchema(this.selectedSchemaId());
        this.settingsService.setLastAiModel(this.selectedAiModel());

        // Save documents
        const docs: CachedDocument[] = this.uploadedFiles().map(file => ({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: file.content,
            base64Data: file.dataUrl,  // Persist file preview data
            path: file.path,           // Persist folder path
            status: file.status,
            analysisResult: file.analysisResult,
            addedAt: new Date()
        }));
        this.settingsService.saveDocuments(docs);

        // Save results
        const results: CachedResult[] = this.mappedFiles().map(file => ({
            id: crypto.randomUUID(),
            documentName: file.name,
            schemaId: this.selectedSchemaId() || '',
            mappedData: file.mappedData,
            processedAt: new Date()
        }));
        this.settingsService.saveResults(results);
    }

    /**
     * Handle schema selection from dropdown
     */
    onSchemaSelect(schemaId: string): void {
        this.selectedSchemaId.set(schemaId);
        this.isNewSchema.set(false);

        // Clear any previously saved content for this schema
        // (user is switching to a fresh template)
        this.settingsService.setSchemaContent(null);

        const schema = this.schemaService.getSchemaById(schemaId);
        if (schema) {
            const jsonSchema = this.schemaService.toJsonSchema(schema);
            this.schemaEditorContent.set(JSON.stringify(jsonSchema, null, 2));
        }

        // Save to settings immediately
        this.settingsService.setLastSchema(schemaId);
    }

    /**
     * Create new schema
     */
    onNewSchema(): void {
        this.selectedSchemaId.set(null);
        this.isNewSchema.set(true);
        this.newSchemaName.set('New Schema');

        const template = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "New Schema",
            "type": "object",
            "properties": {
                "field1": {
                    "type": "string",
                    "description": "Description of field 1"
                },
                "field2": {
                    "type": "number",
                    "description": "Description of field 2"
                }
            },
            "required": ["field1"]
        };

        this.schemaEditorContent.set(JSON.stringify(template, null, 2));
    }

    /**
     * Save current schema
     */
    saveSchema(): void {
        console.log('[DocumentManagement] saveSchema called');
        console.log('[DocumentManagement] isNewSchema:', this.isNewSchema());
        console.log('[DocumentManagement] selectedSchemaId:', this.selectedSchemaId());
        console.log('[DocumentManagement] newSchemaName:', this.newSchemaName());
        console.log('[DocumentManagement] editorContent length:', this.schemaEditorContent().length);

        try {
            const content = this.schemaEditorContent();
            const parsed = JSON.parse(content);
            console.log('[DocumentManagement] Parsed JSON:', parsed.title, parsed.description);

            if (this.isNewSchema()) {
                // Create new schema from JSON
                const properties = this.extractPropertiesFromJsonSchema(parsed);
                console.log('[DocumentManagement] Creating new schema with', properties.length, 'properties');
                const schema = this.schemaService.createSchema(
                    parsed.title || this.newSchemaName(),
                    properties,
                    parsed.description
                );
                console.log('[DocumentManagement] Created schema:', schema.id, schema.name);
                this.selectedSchemaId.set(schema.id);
                this.isNewSchema.set(false);
            } else {
                // Update existing schema
                const schemaId = this.selectedSchemaId();
                console.log('[DocumentManagement] Updating schema:', schemaId);
                if (schemaId) {
                    const properties = this.extractPropertiesFromJsonSchema(parsed);
                    console.log('[DocumentManagement] Updating with', properties.length, 'properties');
                    const updated = this.schemaService.updateSchema(schemaId, {
                        name: parsed.title,
                        description: parsed.description,
                        properties
                    });
                    console.log('[DocumentManagement] Update result:', updated?.name);
                }
            }
            console.log('[DocumentManagement] Save completed successfully');
        } catch (error) {
            console.error('[DocumentManagement] Failed to save schema:', error);
        }
    }

    /**
     * Extract schema properties from JSON Schema format
     */
    private extractPropertiesFromJsonSchema(jsonSchema: any): SchemaProperty[] {
        if (!jsonSchema.properties) return [];

        const required = jsonSchema.required || [];
        const properties: SchemaProperty[] = [];

        for (const [name, prop] of Object.entries<any>(jsonSchema.properties)) {
            properties.push({
                name,
                type: this.mapJsonSchemaType(prop.type),
                description: prop.description,
                required: required.includes(name),
                format: prop.format,
                enum: prop.enum
            });
        }

        return properties;
    }

    private mapJsonSchemaType(type: string): SchemaProperty['type'] {
        const typeMap: Record<string, SchemaProperty['type']> = {
            'string': 'string',
            'number': 'number',
            'integer': 'number',
            'boolean': 'boolean',
            'array': 'array',
            'object': 'object'
        };
        return typeMap[type] || 'string';
    }

    /**
     * Delete current schema
     */
    deleteSchema(): void {
        const id = this.selectedSchemaId();
        if (id) {
            this.schemaService.deleteSchema(id);
            this.selectedSchemaId.set(null);
            this.schemaEditorContent.set('');
        }
    }

    /**
     * Handle file upload
     */
    onFileUpload(event: any): void {
        const files = event.files as File[];

        for (const file of files) {
            // Check if it's a ZIP file
            if (file.type === 'application/zip' ||
                file.type === 'application/x-zip-compressed' ||
                file.name.toLowerCase().endsWith('.zip')) {
                this.extractZipFile(file);
                continue;
            }

            // Create object URL for doc viewer
            const objectUrl = URL.createObjectURL(file);

            const uploadedFile: UploadedFile = {
                id: crypto.randomUUID(), // Unique ID for each file
                name: file.name,
                size: file.size,
                type: file.type,
                file: file,
                objectUrl: objectUrl,
                status: 'pending'
            };

            // Read file content for text files (including XML/UBL/PEPPOL)
            if (file.type.startsWith('text/') ||
                file.type === 'application/json' ||
                file.type === 'application/xml' ||
                file.type === 'text/xml' ||
                file.name.endsWith('.txt') ||
                file.name.toLowerCase().endsWith('.xml')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedFile.content = e.target?.result as string;
                    this.uploadedFiles.update(files => [...files, uploadedFile]);
                    this.buildFileHierarchy();
                };
                reader.readAsText(file);
            } else if (file.type.startsWith('image/')) {
                // For image files, convert to base64 data URL for persistence
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedFile.dataUrl = e.target?.result as string;
                    this.uploadedFiles.update(files => [...files, uploadedFile]);
                    this.buildFileHierarchy();
                };
                reader.readAsDataURL(file);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                // For PDF files, also store as base64 dataUrl for persistence and original preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedFile.dataUrl = e.target?.result as string;
                    this.uploadedFiles.update(files => [...files, uploadedFile]);
                    this.buildFileHierarchy();
                };
                reader.readAsDataURL(file);
            } else {
                // For other files (docs), just add metadata
                this.uploadedFiles.update(files => [...files, uploadedFile]);
                this.buildFileHierarchy();
            }
        }
    }

    /**
     * Extract ZIP file and add contents to uploaded files
     */
    async extractZipFile(zipFile: File): Promise<void> {
        try {
            console.log('[DocumentManagement] Extracting ZIP file:', zipFile.name);
            const zip = await JSZip.loadAsync(zipFile);
            const zipBaseName = zipFile.name.replace(/\.zip$/i, '');

            const extractedFiles: UploadedFile[] = [];
            const filePromises: Promise<void>[] = [];

            zip.forEach((relativePath, zipEntry) => {
                // Skip directories
                if (zipEntry.dir) return;

                // Skip __MACOSX folder (Mac OS resource fork files)
                if (relativePath.includes('__MACOSX/') || relativePath.startsWith('__MACOSX')) return;

                // Skip hidden files (starting with .)
                const fileName = relativePath.split('/').pop() || relativePath;
                if (fileName.startsWith('.')) return;

                // Create a promise for each file extraction
                const promise = zipEntry.async('blob').then(async (blob) => {
                    // Skip 0kb files (empty files)
                    if (blob.size === 0) return;

                    const filePath = `${zipBaseName}/${relativePath}`;

                    // Determine file type from name
                    const ext = fileName.split('.').pop()?.toLowerCase() || '';
                    let type = 'application/octet-stream';
                    if (['txt', 'json', 'csv'].includes(ext)) type = 'text/plain';
                    else if (ext === 'xml') type = 'application/xml';
                    else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                    else if (ext === 'pdf') type = 'application/pdf';

                    const file = new File([blob], fileName, { type });
                    const objectUrl = URL.createObjectURL(blob);

                    const uploadedFile: UploadedFile = {
                        id: crypto.randomUUID(), // Unique ID for each file
                        name: fileName,
                        size: blob.size,
                        type: type,
                        path: filePath,
                        file: file,
                        objectUrl: objectUrl,
                        status: 'pending'
                    };

                    // Read content based on type (including XML for text-based processing)
                    if (type.startsWith('text/') || type === 'application/json' || type === 'application/xml') {
                        uploadedFile.content = await blob.text();
                    } else if (type.startsWith('image/')) {
                        uploadedFile.dataUrl = await this.blobToDataUrl(blob);
                    } else if (type === 'application/pdf') {
                        // PDFs also need dataUrl for preview persistence after page reload
                        uploadedFile.dataUrl = await this.blobToDataUrl(blob);
                    }

                    extractedFiles.push(uploadedFile);
                });

                filePromises.push(promise);
            });

            await Promise.all(filePromises);

            console.log(`[DocumentManagement] Extracted ${extractedFiles.length} files from ZIP`);

            // Add all extracted files
            this.uploadedFiles.update(files => [...files, ...extractedFiles]);
            this.buildFileHierarchy();

        } catch (error) {
            console.error('[DocumentManagement] Failed to extract ZIP:', error);
            // Add the ZIP file as-is if extraction fails
            const objectUrl = URL.createObjectURL(zipFile);
            this.uploadedFiles.update(files => [...files, {
                id: crypto.randomUUID(),
                name: zipFile.name,
                size: zipFile.size,
                type: zipFile.type,
                file: zipFile,
                objectUrl: objectUrl,
                status: 'error',
                errorMessage: 'Failed to extract ZIP file'
            }]);
            this.buildFileHierarchy();
        }
    }

    /**
     * Convert blob to data URL
     */
    private blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Remove uploaded file
     */
    removeFile(index: number): void {
        this.uploadedFiles.update(files => files.filter((_, i) => i !== index));
    }

    /**
     * Clear all files
     */
    clearFiles(): void {
        this.uploadedFiles.set([]);
        this.mappedData.set(null);
        this.fileHierarchy.set([]);
        this.failedFiles.set([]);
        this.settingsService.clearDocuments();
        this.settingsService.clearResults();
    }

    /**
     * Handle folder selection via webkitdirectory
     */
    onFolderSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);

        if (files.length === 0) return;

        // Process files with their relative paths (webkitRelativePath)
        const processedFiles: UploadedFile[] = [];
        let filesProcessed = 0;

        for (const file of files) {
            const webkitFile = file as File & { webkitRelativePath?: string };
            const relativePath = webkitFile.webkitRelativePath || file.name;

            const objectUrl = URL.createObjectURL(file);

            const uploadedFile: UploadedFile = {
                id: crypto.randomUUID(), // Unique ID for folder-uploaded files
                name: file.name,
                size: file.size,
                type: file.type,
                path: relativePath,
                file: file,
                objectUrl: objectUrl,
                status: 'pending'
            };

            // Convert images to base64 for persistence
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedFile.dataUrl = e.target?.result as string;
                    processedFiles.push(uploadedFile);
                    filesProcessed++;

                    if (filesProcessed === files.length) {
                        this.finalizeFileUpload(processedFiles);
                    }
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('text/') || file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedFile.content = e.target?.result as string;
                    processedFiles.push(uploadedFile);
                    filesProcessed++;

                    if (filesProcessed === files.length) {
                        this.finalizeFileUpload(processedFiles);
                    }
                };
                reader.readAsText(file);
            } else {
                processedFiles.push(uploadedFile);
                filesProcessed++;

                if (filesProcessed === files.length) {
                    this.finalizeFileUpload(processedFiles);
                }
            }
        }

        // Reset input so same folder can be selected again
        input.value = '';
    }

    /**
     * Finalize file upload after all files are processed
     */
    private finalizeFileUpload(files: UploadedFile[]): void {
        this.uploadedFiles.update(existing => [...existing, ...files]);
        this.buildFileHierarchy();
    }

    /**
     * Build hierarchical file structure from uploadedFiles
     * Excludes 'mapped' files since they are now shown in results
     */
    buildFileHierarchy(): void {
        // Filter out mapped files - they should only appear in results, not in the upload queue
        const files = this.uploadedFiles().filter(f => f.status !== 'mapped');
        const rootNodes: FileNode[] = [];
        const nodeMap = new Map<string, FileNode>();

        for (const file of files) {
            const path = file.path || file.name;
            const parts = path.split('/');

            let currentPath = '';
            let parentChildren = rootNodes;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                let node = nodeMap.get(currentPath);

                if (!node) {
                    node = {
                        id: crypto.randomUUID(),
                        name: part,
                        type: isFile ? 'file' : 'folder',
                        path: currentPath,
                        children: [],
                        file: isFile ? file : undefined,
                        isExpanded: true, // Expand by default
                        status: isFile ? this.getFileStatus(file) : 'pending'
                    };
                    nodeMap.set(currentPath, node);
                    parentChildren.push(node);
                }

                if (!isFile) {
                    parentChildren = node.children;
                }
            }
        }

        // Update folder statuses based on children
        this.updateFolderStatuses(rootNodes);
        this.fileHierarchy.set(rootNodes);
    }

    /**
     * Get status for display based on file status
     */
    private getFileStatus(file: UploadedFile): FileNode['status'] {
        switch (file.status) {
            case 'pending': return 'pending';
            case 'analyzing': return 'processing';
            case 'analyzed':
            case 'mapped': return 'completed';
            case 'error': return 'error';
            default: return 'pending';
        }
    }

    /**
     * Update folder statuses based on their children's statuses
     */
    private updateFolderStatuses(nodes: FileNode[]): void {
        for (const node of nodes) {
            if (node.type === 'folder' && node.children.length > 0) {
                this.updateFolderStatuses(node.children);

                const childStatuses = node.children.map(c => c.status);
                if (childStatuses.every(s => s === 'completed')) {
                    node.status = 'completed';
                } else if (childStatuses.some(s => s === 'processing')) {
                    node.status = 'processing';
                } else if (childStatuses.some(s => s === 'error')) {
                    node.status = 'error';
                } else {
                    node.status = 'pending';
                }
            }
        }
    }

    /**
     * Toggle folder expansion
     */
    toggleFolderExpand(node: FileNode): void {
        this.fileHierarchy.update(hierarchy => {
            const findAndToggle = (nodes: FileNode[]): boolean => {
                for (const n of nodes) {
                    if (n.id === node.id) {
                        n.isExpanded = !n.isExpanded;
                        return true;
                    }
                    if (n.children.length > 0 && findAndToggle(n.children)) {
                        return true;
                    }
                }
                return false;
            };
            findAndToggle(hierarchy);
            return [...hierarchy];
        });
    }

    /**
     * Check if error indicates credit exhaustion (rate limit / quota exceeded)
     * Only triggers on very specific OpenAI errors to avoid false positives
     */
    isCreditExhausted(error: any): boolean {
        const errorStr = error?.message || error?.error?.message || error?.toString() || '';
        const errorLower = errorStr.toLowerCase();

        // Only truly credit-related errors - be very specific
        const isTrueRateLimit = errorStr.includes('429') && errorLower.includes('rate');
        const isQuotaExceeded = errorLower.includes('insufficient_quota');
        const isBillingError = errorLower.includes('billing') && errorLower.includes('hard limit');

        return isTrueRateLimit || isQuotaExceeded || isBillingError;
    }

    /**
     * Show credit exhaustion dialog
     */
    showCreditExhaustedDialog(message: string): void {
        this.creditExhausted.set(true);
        this.creditExhaustedMessage.set(message);
    }

    /**
     * Dismiss credit exhaustion dialog
     */
    dismissCreditExhaustedDialog(): void {
        this.creditExhausted.set(false);
        this.creditExhaustedMessage.set('');
    }

    /**
     * Mark a file as failed and add to failed files list
     */
    markFileFailed(file: UploadedFile, error: string): void {
        // Update file status
        this.uploadedFiles.update(files =>
            files.map(f => f.name === file.name ? { ...f, status: 'error' as const, errorMessage: error } : f)
        );

        // Add to failed files list
        const failedFile: FailedFile = {
            id: crypto.randomUUID(),
            path: file.path || file.name,
            name: file.name,
            errorMessage: error,
            failedAt: new Date(),
            retryCount: 0,
            dataUrl: file.dataUrl
        };

        this.failedFiles.update(files => {
            // Remove existing entry for same file if present
            const filtered = files.filter(f => f.path !== failedFile.path);
            return [...filtered, failedFile];
        });

        // Rebuild hierarchy to reflect error status
        this.buildFileHierarchy();
    }

    /**
     * Retry failed files
     */
    async retryFailedFiles(): Promise<void> {
        const failed = this.failedFiles();
        if (failed.length === 0) return;

        // Reset failed files' statuses to pending
        this.uploadedFiles.update(files =>
            files.map(f => {
                const isFailed = failed.some(ff => ff.path === (f.path || f.name));
                return isFailed ? { ...f, status: 'pending' as const, errorMessage: undefined } : f;
            })
        );

        // Clear failed files list
        this.failedFiles.set([]);

        // Rebuild hierarchy and re-analyze
        this.buildFileHierarchy();
        await this.analyzeFiles();
    }

    /**
     * Retry a single failed file
     */
    async retrySingleFile(failedFile: FailedFile): Promise<void> {
        // Reset this specific file's status to pending
        this.uploadedFiles.update(files =>
            files.map(f => {
                if ((f.path || f.name) === failedFile.path) {
                    return { ...f, status: 'pending' as const, errorMessage: undefined };
                }
                return f;
            })
        );

        // Remove from failed files list
        this.failedFiles.update(files => files.filter(f => f.id !== failedFile.id));

        // Rebuild hierarchy
        this.buildFileHierarchy();

        // Re-analyze (will only process pending files)
        await this.analyzeFiles();
    }

    /**
     * Remove a single failed file from the list (dismiss without retrying)
     */
    removeFailedFile(failedFile: FailedFile): void {
        // Remove from failed files list
        this.failedFiles.update(files => files.filter(f => f.id !== failedFile.id));

        // Also remove from uploaded files list
        this.uploadedFiles.update(files =>
            files.filter(f => (f.path || f.name) !== failedFile.path)
        );

        // Rebuild hierarchy
        this.buildFileHierarchy();

        // Persist the updated state
        this.saveFailedFilesToStorage();
    }

    /**
     * Clear all failed files from the list
     */
    clearFailedFiles(): void {
        const failedPaths = new Set(this.failedFiles().map(f => f.path));

        // Remove all failed files from uploaded files
        this.uploadedFiles.update(files =>
            files.filter(f => !failedPaths.has(f.path || f.name))
        );

        // Clear failed files signal
        this.failedFiles.set([]);

        // Rebuild hierarchy
        this.buildFileHierarchy();

        // Persist the updated state
        this.saveFailedFilesToStorage();
    }

    /**
     * Remove completed items from the processing queue (keep only processing/queued/error)
     */
    clearCompletedFromQueue(): void {
        this.processingQueue.update(queue =>
            queue.filter(item => item.status !== 'completed')
        );
    }

    /**
     * Remove a specific item from the queue (and optionally the file)
     * Allows users to manually remove items they don't want to process
     */
    removeFromQueue(queueId: string, alsoRemoveFile: boolean = true): void {
        const queue = this.processingQueue();
        const item = queue.find(q => q.id === queueId);

        if (!item) return;

        // Remove from queue
        this.processingQueue.update(q => q.filter(i => i.id !== queueId));

        // Also remove the file from uploaded files if requested
        if (alsoRemoveFile && item.fileId) {
            this.uploadedFiles.update(files => files.filter(f => f.id !== item.fileId));
            this.buildFileHierarchy();
        }

        console.log('[DocumentManagement] Removed from queue:', item.name);
    }

    /**
     * Remove an uploaded file by its id
     */
    removeUploadedFile(fileId: string): void {
        this.uploadedFiles.update(files => files.filter(f => f.id !== fileId));
        this.buildFileHierarchy();
        console.log('[DocumentManagement] Removed file:', fileId);
    }

    /**
     * Save failed files to localStorage for persistence across browser sessions
     */
    private saveFailedFilesToStorage(): void {
        try {
            const failedData = this.failedFiles().map(f => ({
                ...f,
                failedAt: f.failedAt.toISOString()
            }));
            localStorage.setItem('document_management_failed_files', JSON.stringify(failedData));
        } catch (e) {
            console.warn('[DocumentManagement] Failed to save failed files to storage:', e);
        }
    }

    /**
     * Load failed files from localStorage
     */
    private loadFailedFilesFromStorage(): void {
        try {
            const data = localStorage.getItem('document_management_failed_files');
            if (data) {
                const parsed = JSON.parse(data);
                const failedFiles = parsed.map((f: any) => ({
                    ...f,
                    failedAt: new Date(f.failedAt)
                }));
                this.failedFiles.set(failedFiles);
            }
        } catch (e) {
            console.warn('[DocumentManagement] Failed to load failed files from storage:', e);
        }
    }

    /**
     * Trigger file upload dialog programmatically
     */
    triggerFileUpload(): void {
        const input = document.querySelector('.upload-zone-btn input[type="file"]') as HTMLInputElement;
        if (input) {
            input.click();
        }
    }

    /**
     * Handle file drop event
     */
    onFileDrop(event: DragEvent): void {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.onFileUpload({ files: Array.from(files) });
        }
    }

    /**
     * Analyze uploaded files with AI - parallel processing with 4 concurrent workers
     */
    async analyzeFiles(): Promise<void> {
        // Check if API key is configured
        if (!hasApiKey('openai')) {
            this.showApiKeyDialog.set(true);
            return;
        }

        const files = this.uploadedFiles();
        // Filter for files that are pending AND processable (exclude ZIPs, folders, 0kb files)
        const pendingFiles = files.filter(f => f.status === 'pending' && this.isProcessableFile(f));
        if (pendingFiles.length === 0) return;

        // Initialize processing queue
        this.initializeProcessingQueue(pendingFiles);
        this.showProcessingQueue.set(true);
        this.isAnalyzing.set(true);
        this.processingStartTime.set(Date.now());
        this.activeProcessingFiles.set([]);

        // Set the selected AI model
        this.aiChatService.setModel(this.selectedAiModel());
        console.log('[DocumentManagement] Using AI model:', this.selectedAiModel());
        console.log('[DocumentManagement] Processing', pendingFiles.length, 'files with', this.MAX_CONCURRENT_PROCESSING, 'workers');

        // Start progress animation
        this.startProgressAnimation();

        // Create processing queue
        const fileIndices = files
            .map((f, idx) => ({ file: f, idx }))
            .filter(item => item.file.status === 'pending')
            .map(item => item.idx);

        let currentBatchIndex = 0;
        let creditExhaustedFlag = false;

        // Process files in parallel batches
        const processFile = async (fileIndex: number): Promise<void> => {
            const file = files[fileIndex];

            // Generate thumbnail for the file
            const thumbnail = await this.generateThumbnail(file);

            // Add to active processing files
            this.activeProcessingFiles.update(active => [
                ...active,
                { index: fileIndex, file, thumbnail, startTime: Date.now() }
            ]);

            // Update queue status to processing
            this.updateQueueItemStatus(fileIndex, 'processing');
            this.currentProcessingIndex.set(fileIndex);

            // Update status to analyzing
            this.uploadedFiles.update(files =>
                files.map((f, idx) => idx === fileIndex ? { ...f, status: 'analyzing' as const } : f)
            );
            this.buildFileHierarchy(); // Refresh tree to show processing status

            const startTime = Date.now();

            try {
                let result = '';

                // Check if this is a file that needs Vision API (PDF, images)
                const needsVisionApi = this.isImageFile(file) || this.isPdfFile(file);

                if (needsVisionApi && file.file) {
                    // Use Vision API for PDFs and images
                    const visionPrompt = this.buildVisionAnalysisPrompt(file);
                    console.log('[DocumentManagement] Using Vision API for:', file.name);
                    result = await this.aiChatService.analyzeFileWithVision(file.file, visionPrompt);
                } else {
                    // Use regular text-based analysis
                    const analysisPrompt = this.buildAnalysisPrompt(file);
                    await this.aiChatService.sendMessageWithStreaming(
                        this.AI_CONTEXT_ID,
                        analysisPrompt,
                        (chunk) => {
                            result += chunk;
                        }
                    );
                }

                const processingTime = Date.now() - startTime;
                this.updateAverageProcessingTime(processingTime);

                console.log('[DocumentManagement] Completed:', file.name, 'in', processingTime + 'ms');

                // Update with analysis result
                this.uploadedFiles.update(files =>
                    files.map((f, idx) => idx === fileIndex ? {
                        ...f,
                        status: 'analyzed' as const,
                        analysisResult: result
                    } : f)
                );
                this.buildFileHierarchy(); // Refresh tree to show analyzed status

                // IMMEDIATELY map this file so it appears in results right away
                const schema = this.selectedSchema();
                if (schema) {
                    try {
                        const mappingPrompt = this.buildMappingPromptForFile(schema, { ...file, analysisResult: result });
                        let mappingResult = '';

                        await this.aiChatService.sendMessageWithStreaming(
                            this.AI_CONTEXT_ID,
                            mappingPrompt,
                            (chunk) => { mappingResult += chunk; }
                        );

                        const mappings = this.parseMappingResult(mappingResult, schema);
                        const parsedDocument = this.lastParsedDocument;

                        // Update file with mapping data - this makes it appear in results immediately
                        this.uploadedFiles.update(files =>
                            files.map((f, idx) => idx === fileIndex ? {
                                ...f,
                                status: 'mapped' as const,
                                mappedData: {
                                    schemaId: schema.id,
                                    sourceFile: f.name,
                                    mappings,
                                    parsedDocument,
                                    confidence: this.calculateOverallConfidence(mappings),
                                    timestamp: new Date()
                                }
                            } : f)
                        );

                        console.log('[DocumentManagement] File mapped and visible in results:', file.name);
                        this.buildFileHierarchy(); // Refresh tree to show completed status
                    } catch (mapError) {
                        console.error('[DocumentManagement] Inline mapping failed:', file.name, mapError);
                        // File stays in analyzed state - can be mapped later
                    }
                }

                // Mark queue item as completed
                this.markQueueItemCompleted(fileIndex);
            } catch (error) {
                console.error('[DocumentManagement] Analysis failed:', file.name, error);

                const errorMessage = error instanceof Error ? error.message : 'Analysis failed';

                // Check if this is a credit exhaustion error
                if (this.isCreditExhausted(error)) {
                    console.warn('[DocumentManagement] Credit exhaustion detected');
                    creditExhaustedFlag = true;
                    this.markFileFailed(file, errorMessage);
                    this.updateQueueItemStatus(fileIndex, 'error', 'Credits exhausted');
                    this.showCreditExhaustedDialog(errorMessage);
                } else {
                    // Regular error - mark as failed
                    this.markFileFailed(file, errorMessage);
                    this.updateQueueItemStatus(fileIndex, 'error', errorMessage);
                }
            } finally {
                // Remove from active processing files
                this.activeProcessingFiles.update(active =>
                    active.filter(a => a.index !== fileIndex)
                );
            }
        };

        // Process in batches of MAX_CONCURRENT_PROCESSING
        while (currentBatchIndex < fileIndices.length && !creditExhaustedFlag) {
            const batchIndices = fileIndices.slice(
                currentBatchIndex,
                currentBatchIndex + this.MAX_CONCURRENT_PROCESSING
            );

            // Process batch in parallel
            await Promise.all(batchIndices.map(idx => processFile(idx)));

            currentBatchIndex += this.MAX_CONCURRENT_PROCESSING;
        }

        // Stop progress animation
        this.stopProgressAnimation();
        this.isAnalyzing.set(false);
        this.currentProcessingIndex.set(-1);
        this.activeProcessingFiles.set([]);

        // Auto-hide queue after a delay when all complete
        setTimeout(() => {
            if (!this.isAnalyzing()) {
                this.showProcessingQueue.set(false);
            }
        }, 2000);

        // Auto-trigger mapping if schema is selected
        if (this.selectedSchema() && this.hasAnalyzedFiles()) {
            await this.performMapping();
        }
    }

    /**
     * Initialize processing queue from pending files
     */
    private initializeProcessingQueue(pendingFiles: UploadedFile[]): void {
        const allFiles = this.uploadedFiles();
        const queueItems: ProcessingQueueItem[] = pendingFiles.map((file, index) => {
            // Use unique id for reliable lookup instead of name
            const fileIndex = allFiles.findIndex(f => f.id === file.id);
            return {
                id: `queue-${Date.now()}-${index}`,
                fileId: file.id, // Store file id for reliable lookup
                name: file.name,
                size: file.size,
                fileIndex: fileIndex,
                status: 'queued' as const,
                progress: 0,
                estimatedTimeMs: this.averageProcessingTimeMs() * (index + 1)
            };
        });
        this.processingQueue.set(queueItems);
    }

    /**
     * Update queue item status
     */
    private updateQueueItemStatus(fileIndex: number, status: ProcessingQueueItem['status'], errorMessage?: string): void {
        this.processingQueue.update(queue =>
            queue.map(item => {
                if (item.fileIndex === fileIndex) {
                    return {
                        ...item,
                        status,
                        startTime: status === 'processing' ? Date.now() : item.startTime,
                        errorMessage
                    };
                }
                return item;
            })
        );
    }

    /**
     * Mark queue item as completed with animation
     */
    private markQueueItemCompleted(fileIndex: number): void {
        this.processingQueue.update(queue =>
            queue.map(item => {
                if (item.fileIndex === fileIndex) {
                    return {
                        ...item,
                        status: 'completed' as const,
                        progress: 100,
                        endTime: Date.now()
                    };
                }
                return item;
            })
        );

        // Schedule removal from visual queue after animation
        setTimeout(() => {
            this.processingQueue.update(queue =>
                queue.filter(item => item.fileIndex !== fileIndex)
            );
        }, 1500);
    }

    /**
     * Start progress animation interval
     */
    private startProgressAnimation(): void {
        this.progressInterval = setInterval(() => {
            this.processingQueue.update(queue =>
                queue.map(item => {
                    if (item.status === 'processing' && item.startTime) {
                        const elapsed = Date.now() - item.startTime;
                        const estimated = this.averageProcessingTimeMs();
                        // Asymptotic progress that never quite reaches 100%
                        const progress = Math.min(95, Math.floor((elapsed / estimated) * 80));
                        return { ...item, progress };
                    }
                    return item;
                })
            );
        }, 200);
    }

    /**
     * Stop progress animation
     */
    private stopProgressAnimation(): void {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Update average processing time based on completed file
     */
    private updateAverageProcessingTime(newTime: number): void {
        const current = this.averageProcessingTimeMs();
        // Weighted average favoring recent times
        const updated = Math.floor(current * 0.7 + newTime * 0.3);
        this.averageProcessingTimeMs.set(updated);
    }

    /**
     * Dismiss processing queue panel
     */
    dismissProcessingQueue(): void {
        this.showProcessingQueue.set(false);
    }

    /**
     * Get formatted time remaining for a queue item
     */
    getTimeRemaining(item: ProcessingQueueItem): string {
        if (item.status === 'completed') return 'Done';
        if (item.status === 'error') return 'Failed';
        if (item.status === 'processing' && item.startTime) {
            const elapsed = Date.now() - item.startTime;
            const remaining = Math.max(0, this.averageProcessingTimeMs() - elapsed);
            return this.formatDuration(remaining);
        }
        if (item.estimatedTimeMs) {
            return '~' + this.formatDuration(item.estimatedTimeMs);
        }
        return 'Waiting...';
    }

    /**
     * Format duration in human-readable format
     */
    formatDuration(ms: number): string {
        if (ms < 1000) return '<1s';
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    /**
     * Get queue position text
     */
    getQueuePosition(item: ProcessingQueueItem): string {
        const queue = this.processingQueue();
        const queuedItems = queue.filter(i => i.status === 'queued');
        const position = queuedItems.findIndex(i => i.id === item.id);
        if (position === -1) return '';
        return `#${position + 1} in queue`;
    }

    /**
     * TrackBy function for queue items
     */
    trackQueueItem(index: number, item: ProcessingQueueItem): string {
        return item.id;
    }

    // ========== MULTI-SELECT BULK OPERATIONS ==========

    /**
     * Toggle selection of a single result by name
     */
    toggleResultSelection(fileName: string): void {
        this.selectedResultIds.update(ids => {
            const newSet = new Set(ids);
            if (newSet.has(fileName)) {
                newSet.delete(fileName);
            } else {
                newSet.add(fileName);
            }
            return newSet;
        });
    }

    /**
     * Select all visible (filtered) results
     */
    selectAllResults(): void {
        const fileNames = this.filteredMappedFiles().map(f => f.name);
        this.selectedResultIds.set(new Set(fileNames));
    }

    /**
     * Deselect all results
     */
    deselectAllResults(): void {
        this.selectedResultIds.set(new Set());
    }

    /**
     * Delete selected results (removes from mappedFiles list)
     */
    deleteSelectedResults(): void {
        const selected = this.selectedResultIds();
        if (selected.size === 0) return;

        this.uploadedFiles.update(files =>
            files.map(f => {
                if (selected.has(f.name) && f.status === 'mapped') {
                    // Reset to analyzed state (removes mapping)
                    return { ...f, status: 'analyzed' as const, mappedData: undefined };
                }
                return f;
            })
        );

        // Clear selection
        this.selectedResultIds.set(new Set());
    }

    /**
     * Requeue selected results for reprocessing
     * Resets files to pending status and triggers re-analysis
     */
    async requeueSelectedResults(): Promise<void> {
        const selected = this.selectedResultIds();
        if (selected.size === 0) return;

        // Reset selected files to pending
        this.uploadedFiles.update(files =>
            files.map(f => {
                if (selected.has(f.name)) {
                    return {
                        ...f,
                        status: 'pending' as const,
                        analysisResult: undefined,
                        mappedData: undefined
                    };
                }
                return f;
            })
        );

        // Clear selection and rebuild hierarchy
        this.selectedResultIds.set(new Set());
        this.buildFileHierarchy();

        // Re-analyze
        await this.analyzeFiles();
    }

    /**
     * Check if a result is selected
     */
    isResultSelected(fileName: string): boolean {
        return this.selectedResultIds().has(fileName);
    }

    /**
     * Get count of selected results
     */
    get selectedCount(): number {
        return this.selectedResultIds().size;
    }

    /**
     * Handle API key saved from dialog - close dialog and retry analysis
     */
    onApiKeySaved(): void {
        this.showApiKeyDialog.set(false);
        // Retry analysis now that key is available
        this.analyzeFiles();
    }

    /**
     * Handle API key dialog closed (user skipped)
     */
    onApiKeyDialogClosed(): void {
        this.showApiKeyDialog.set(false);
    }


    /**
     * Reset all state - clear files, mapping results, and optionally schema selection
     */
    resetAll(keepSchema: boolean = false): void {
        // Clear files
        this.uploadedFiles.set([]);
        this.mappedData.set(null);

        // Optionally reset schema selection
        if (!keepSchema) {
            this.selectedSchemaId.set(null);
            this.schemaEditorContent.set('');
            this.isNewSchema.set(false);
            this.newSchemaName.set('');
        }

        // Reset UI state
        this.activeTab.set(0);
        this.previewModalVisible.set(false);
        this.previewJson.set('');
        this.selectedPreviewFileIndex.set(0);

        console.log('[DocumentManagement] Reset complete');
    }

    /**
     * Build analysis prompt for a file
     */
    private buildAnalysisPrompt(file: UploadedFile): string {
        const schema = this.selectedSchema();

        let prompt = `Analyze the following document and extract key information.\n\n`;

        // Include schema context if available
        if (schema) {
            prompt += `IMPORTANT: This document is expected to be a ${schema.name.replace(' Schema', '').replace(' (Full)', '').replace(' (Simple)', '')}.\n`;
            prompt += `Expected fields to extract:\n`;
            for (const prop of schema.properties.slice(0, 10)) {
                prompt += `- ${prop.name}: ${prop.description || prop.type}\n`;
            }
            if (schema.properties.length > 10) {
                prompt += `- ... and ${schema.properties.length - 10} more fields\n`;
            }
            prompt += `\n`;
        }

        prompt += `File: ${file.name}\n`;
        prompt += `Type: ${file.type}\n\n`;

        if (file.content) {
            prompt += `Document Content:\n${file.content.substring(0, 5000)}\n\n`;
        } else {
            prompt += `[No text content available for this file type]\n\n`;
        }

        prompt += `Please extract and identify:\n`;
        prompt += `1. Document type confirmation (is this an invoice/contract/etc.?)\n`;
        prompt += `2. All key entities (names, organizations, addresses, dates, amounts, IDs)\n`;
        prompt += `3. Line items or list data if present\n`;
        prompt += `4. Any structured data (tables, key-value pairs)\n\n`;
        prompt += `Format your response as a structured analysis with clear sections.`;

        // DEBUG: Log what we're sending
        console.log('[DocumentManagement] === ANALYSIS PROMPT ===');
        console.log('[DocumentManagement] File:', file.name);
        console.log('[DocumentManagement] Schema:', schema?.name || 'None');
        console.log('[DocumentManagement] Has content:', !!file.content);
        console.log('[DocumentManagement] Content length:', file.content?.length || 0);
        console.log('[DocumentManagement] Full prompt length:', prompt.length);
        console.log('[DocumentManagement] Prompt preview:', prompt.substring(0, 800) + '...');

        return prompt;
    }

    /**
     * Build analysis prompt for Vision API (PDFs and images)
     */
    private buildVisionAnalysisPrompt(file: UploadedFile): string {
        const schema = this.selectedSchema();

        let prompt = `Analyze this document image and extract all relevant information.\n\n`;

        // Include schema context if available
        if (schema) {
            prompt += `IMPORTANT: This document is expected to be a ${schema.name.replace(' Schema', '').replace(' (Full)', '').replace(' (Simple)', '')}.\n`;
            prompt += `Look for these specific fields:\n`;
            for (const prop of schema.properties.slice(0, 15)) {
                prompt += `- ${prop.name}: ${prop.description || prop.type}\n`;
            }
            if (schema.properties.length > 15) {
                prompt += `- ... and ${schema.properties.length - 15} more fields\n`;
            }
            prompt += `\n`;
        }

        prompt += `File: ${file.name}\n\n`;

        prompt += `Please carefully examine the document and extract:\n`;
        prompt += `1. Document type (invoice, purchase order, contract, receipt, etc.)\n`;
        prompt += `2. All text content you can read from the document\n`;
        prompt += `3. Key entities: names, organizations, addresses, dates, amounts, IDs, reference numbers\n`;
        prompt += `4. Line items with descriptions, quantities, prices, and totals\n`;
        prompt += `5. Any tables, headers, or structured data\n`;
        prompt += `6. Totals, subtotals, taxes, and payment information\n\n`;
        prompt += `Format your response as a structured analysis with clear sections. Be thorough and extract all visible text.`;

        console.log('[DocumentManagement] === VISION ANALYSIS PROMPT ===');
        console.log('[DocumentManagement] File:', file.name);
        console.log('[DocumentManagement] Schema:', schema?.name || 'None');
        console.log('[DocumentManagement] Prompt length:', prompt.length);

        return prompt;
    }

    /**
     * Map analyzed files to schema - processes each file individually
     */
    async performMapping(): Promise<void> {
        const schema = this.selectedSchema();
        const analyzedFiles = this.uploadedFiles().filter(f => f.status === 'analyzed');

        if (!schema || analyzedFiles.length === 0) return;

        this.isMpping.set(true);

        // Process each file individually
        for (let i = 0; i < this.uploadedFiles().length; i++) {
            const file = this.uploadedFiles()[i];
            if (file.status !== 'analyzed') continue;

            try {
                const mappingPrompt = this.buildMappingPromptForFile(schema, file);
                let result = '';

                await this.aiChatService.sendMessageWithStreaming(
                    this.AI_CONTEXT_ID,
                    mappingPrompt,
                    (chunk) => {
                        result += chunk;
                    }
                );

                // DEBUG: Log AI mapping response
                console.log('[DocumentManagement] === AI MAPPING RESPONSE ===');
                console.log('[DocumentManagement] File:', file.name);
                console.log('[DocumentManagement] Response length:', result.length);
                console.log('[DocumentManagement] Raw response:', result);

                // Parse the mapping result
                const mappings = this.parseMappingResult(result, schema);
                const parsedDocument = this.lastParsedDocument; // Get the stored complete document

                // DEBUG: Log parsed mappings
                console.log('[DocumentManagement] Parsed mappings count:', mappings.length);
                console.log('[DocumentManagement] Has complete document:', !!parsedDocument);

                // Store mapping in the file object
                this.uploadedFiles.update(files =>
                    files.map((f, idx) => idx === i ? {
                        ...f,
                        status: 'mapped' as const,
                        mappedData: {
                            schemaId: schema.id,
                            sourceFile: f.name,
                            mappings,
                            parsedDocument, // Store the complete document for preview
                            confidence: this.calculateOverallConfidence(mappings),
                            timestamp: new Date()
                        }
                    } : f)
                );
            } catch (error) {
                console.error(`[DocumentManagement] Mapping failed for ${file.name}:`, error);
            }
        }

        // Also update the legacy single mappedData for backward compatibility
        const mappedFiles = this.uploadedFiles().filter(f => f.mappedData);
        if (mappedFiles.length > 0) {
            this.mappedData.set(mappedFiles[0].mappedData || null);
        }

        this.isMpping.set(false);
    }

    /**
     * Build mapping prompt for a single file
     * Now outputs complete JSON document matching schema structure exactly
     */
    private buildMappingPromptForFile(schema: Schema, file: UploadedFile): string {
        // Get the full schema JSON for reference
        const schemaJson = this.getSchemaJsonForPrompt(schema);

        let prompt = `Extract data from the document and output a JSON object that EXACTLY matches the following JSON Schema structure.\n\n`;
        prompt += `=== TARGET JSON SCHEMA ===\n`;
        prompt += `${schemaJson}\n\n`;

        prompt += `=== CRITICAL RULES ===\n`;
        prompt += `1. Your output MUST be a valid JSON object matching the schema structure EXACTLY\n`;
        prompt += `2. Use the EXACT property names from the schema (case-sensitive)\n`;
        prompt += `3. For arrays like "InvoiceLines", output an array of objects with the EXACT properties defined (Position, Id, ArtikelId, Name, Description, Quantity, Amount, etc.)\n`;
        prompt += `4. Numbers must be numeric values (e.g., 1330.68), NOT strings with currency symbols\n`;
        prompt += `5. Dates must be in ISO format: "YYYY-MM-DD"\n`;
        prompt += `6. For nested objects, preserve the full structure (e.g., AccountingSupplierParty.Party.PartyName.Name)\n`;
        prompt += `7. Use null for properties that cannot be found in the document\n`;
        prompt += `8. DO NOT invent property names - only use property names from the schema\n\n`;

        prompt += `=== DOCUMENT TO EXTRACT DATA FROM ===\n`;
        prompt += `Filename: ${file.name}\n\n`;

        // Include original document content if available
        if (file.content) {
            prompt += `Document Content:\n${file.content.substring(0, 6000)}\n\n`;
        }

        if (file.analysisResult) {
            prompt += `Previous Analysis:\n${file.analysisResult.substring(0, 3000)}\n\n`;
        }

        prompt += `=== OUTPUT FORMAT ===\n`;
        prompt += `Respond with ONLY a valid JSON object. No markdown code blocks, no explanations. Just the JSON.\n`;
        prompt += `The JSON must match the schema structure exactly.\n`;

        console.log('[DocumentManagement] === MAPPING PROMPT FOR FILE ===');
        console.log('[DocumentManagement] File:', file.name);
        console.log('[DocumentManagement] Prompt length:', prompt.length);

        return prompt;
    }

    /**
     * Get a simplified schema JSON for the prompt
     */
    private getSchemaJsonForPrompt(schema: Schema): string {
        // Convert our internal schema to JSON Schema format
        const jsonSchema: any = {
            type: 'object',
            properties: {}
        };

        for (const prop of schema.properties) {
            jsonSchema.properties[prop.name] = this.propertyToJsonSchema(prop);
        }

        return JSON.stringify(jsonSchema, null, 2);
    }

    /**
     * Convert a schema property to JSON Schema format
     */
    private propertyToJsonSchema(prop: SchemaProperty): any {
        const result: any = {
            type: prop.type,
            description: prop.description
        };

        if (prop.items) {
            result.items = this.propertyToJsonSchema(prop.items);
        }

        if (prop.properties && prop.properties.length > 0) {
            result.properties = {};
            for (const subProp of prop.properties) {
                result.properties[subProp.name] = this.propertyToJsonSchema(subProp);
            }
        }

        return result;
    }

    /**
     * Build mapping prompt
     */
    private buildMappingPrompt(schema: Schema, files: UploadedFile[]): string {
        let prompt = `Map the analyzed document data to the following schema:\n\n`;
        prompt += `Schema: ${schema.name}\n`;
        prompt += `Properties:\n`;

        for (const prop of schema.properties) {
            prompt += `- ${prop.name} (${prop.type}${prop.required ? ', required' : ''}): ${prop.description || ''}\n`;
        }

        prompt += `\nDocument Analysis Results:\n`;
        for (const file of files) {
            prompt += `\n--- ${file.name} ---\n`;
            prompt += file.analysisResult || 'No analysis available';
        }

        prompt += `\n\nPlease map the extracted information to each schema property. For each property, provide:\n`;
        prompt += `1. The extracted value (or null if not found)\n`;
        prompt += `2. Confidence score (0-100)\n`;
        prompt += `3. Source information (where in the document this was found)\n\n`;
        prompt += `Format your response as JSON with this structure:\n`;
        prompt += `{\n  "mappings": [\n    { "property": "fieldName", "value": "extractedValue", "confidence": 85, "source": "from paragraph 2" }\n  ]\n}`;

        return prompt;
    }

    /**
     * Parse mapping result from AI response
     * Now handles complete JSON document format instead of mappings array
     */
    private parseMappingResult(result: string, schema: Schema): PropertyMapping[] {
        try {
            // Clean up the result - remove markdown code blocks if present
            let cleanResult = result.trim();
            if (cleanResult.startsWith('```json')) {
                cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/```$/, '');
            } else if (cleanResult.startsWith('```')) {
                cleanResult = cleanResult.replace(/^```\s*/, '').replace(/```$/, '');
            }

            // Try to extract JSON from the response
            const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Check if it's the old format with mappings array
                if (parsed.mappings && Array.isArray(parsed.mappings)) {
                    return parsed.mappings.map((m: any) => ({
                        propertyName: m.property,
                        extractedValue: m.value,
                        confidence: m.confidence || 0,
                        source: m.source
                    }));
                }

                // New format: complete JSON document matching schema
                // Extract each top-level property from the parsed document
                const mappings: PropertyMapping[] = [];
                for (const prop of schema.properties) {
                    const value = parsed[prop.name];
                    mappings.push({
                        propertyName: prop.name,
                        extractedValue: value !== undefined ? value : null,
                        confidence: value !== undefined && value !== null ? 85 : 0,
                        source: value !== undefined && value !== null ? 'Extracted from document' : 'Not found'
                    });
                }

                // Store the complete document JSON for display
                console.log('[DocumentManagement] Parsed complete document with', mappings.filter(m => m.extractedValue !== null).length, 'non-null values');

                // Also store the raw parsed document for the preview
                this.lastParsedDocument = parsed;

                return mappings;
            }
        } catch (error) {
            console.error('[DocumentManagement] Failed to parse mapping JSON:', error);
        }

        // Fallback: create empty mappings for all properties
        return schema.properties.map(prop => ({
            propertyName: prop.name,
            extractedValue: null,
            confidence: 0,
            source: 'Not found in document'
        }));
    }

    // Store the last parsed document for display
    private lastParsedDocument: any = null;

    /**
     * Get the last parsed document JSON
     */
    getLastParsedDocument(): any {
        return this.lastParsedDocument;
    }

    /**
     * Calculate overall confidence score
     */
    private calculateOverallConfidence(mappings: PropertyMapping[]): number {
        if (mappings.length === 0) return 0;
        const sum = mappings.reduce((acc, m) => acc + m.confidence, 0);
        return Math.round(sum / mappings.length);
    }

    /**
     * Get document analysis system prompt
     */
    private getDocumentAnalysisPrompt(): string {
        return `You are a document analysis assistant. Your job is to:
1. Analyze uploaded documents and extract structured information
2. Identify key entities, dates, amounts, and relationships
3. Map extracted data to user-defined schemas
4. Provide confidence scores for your extractions

Be thorough but concise. When mapping to schemas, try to match data types appropriately.
If information is not found, indicate this clearly rather than making assumptions.`;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get status severity for tags
     */
    getStatusSeverity(status: UploadedFile['status']): 'secondary' | 'info' | 'success' | 'warn' | 'danger' {
        const map: Record<UploadedFile['status'], 'secondary' | 'info' | 'success' | 'warn' | 'danger'> = {
            'pending': 'secondary',
            'analyzing': 'info',
            'analyzed': 'success',
            'mapped': 'success',
            'error': 'danger'
        };
        return map[status];
    }

    /**
     * Get confidence severity
     */
    getConfidenceSeverity(confidence: number): 'success' | 'warn' | 'danger' {
        if (confidence >= 70) return 'success';
        if (confidence >= 40) return 'warn';
        return 'danger';
    }

    /**
     * Export mapped data as JSON
     */
    exportMappedData(): void {
        const data = this.mappedData();
        if (!data) return;

        const exportObj: Record<string, any> = {};
        for (const mapping of data.mappings) {
            exportObj[mapping.propertyName] = mapping.extractedValue;
        }

        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mapped-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Export all mapped data as single JSON file
     */
    exportAllMappedData(): void {
        const mappedFiles = this.mappedFiles();
        if (mappedFiles.length === 0) return;

        const allData: Record<string, any> = {};
        for (const file of mappedFiles) {
            if (file.mappedData) {
                const fileData: Record<string, any> = {};
                for (const mapping of file.mappedData.mappings) {
                    fileData[mapping.propertyName] = mapping.extractedValue;
                }
                allData[file.name] = fileData;
            }
        }

        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `all-mapped-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Show preview modal with mapped JSON for selected file
     */
    showPreviewModal(fileIndex?: number): void {
        const mappedFiles = this.mappedFiles();
        if (mappedFiles.length === 0) return;

        const index = fileIndex ?? 0;
        this.selectedPreviewFileIndex.set(index);
        this.updatePreviewJson(index);
        this.previewModalVisible.set(true);
    }

    /**
     * Update preview JSON for selected file
     */
    updatePreviewJson(fileIndex: number): void {
        const mappedFiles = this.mappedFiles();
        if (fileIndex >= mappedFiles.length) return;

        const file = mappedFiles[fileIndex];
        if (!file.mappedData) return;

        // Use the stored complete document if available
        if (file.mappedData.parsedDocument) {
            this.previewJson.set(JSON.stringify(file.mappedData.parsedDocument, null, 2));
        } else {
            // Fallback: rebuild from mappings
            const exportObj: Record<string, any> = {};
            for (const mapping of file.mappedData.mappings) {
                exportObj[mapping.propertyName] = mapping.extractedValue;
            }
            this.previewJson.set(JSON.stringify(exportObj, null, 2));
        }
    }

    /**
     * Select file in preview modal
     */
    selectPreviewFile(index: number): void {
        this.selectedPreviewFileIndex.set(index);
        this.updatePreviewJson(index);
    }

    /**
     * Get current preview file
     */
    getCurrentPreviewFile(): UploadedFile | null {
        const mappedFiles = this.mappedFiles();
        const index = this.selectedPreviewFileIndex();
        return index < mappedFiles.length ? mappedFiles[index] : null;
    }

    /**
     * Copy JSON to clipboard
     */
    copyToClipboard(): void {
        const json = this.previewJson();
        navigator.clipboard.writeText(json).then(() => {
            console.log('[DocumentManagement] Copied to clipboard');
        }).catch(err => {
            console.error('[DocumentManagement] Failed to copy:', err);
        });
    }

    /**
     * Show document preview modal
     */
    showDocumentPreview(file: UploadedFile): void {
        this.documentPreviewFile.set(file);
        this.documentPreviewVisible.set(true);
    }

    /**
     * Close document preview modal
     */
    closeDocumentPreview(): void {
        this.documentPreviewVisible.set(false);
        this.documentPreviewFile.set(null);
    }

    /**
     * Check if file is an image
     */
    isImageFile(file: UploadedFile): boolean {
        return file.type.startsWith('image/');
    }

    /**
     * Check if file is a PDF
     */
    isPdfFile(file: UploadedFile): boolean {
        return file.type === 'application/pdf';
    }

    /**
     * Check if file is an XML file (including UBL/PEPPOL e-invoices)
     */
    isXmlFile(file: UploadedFile): boolean {
        return file.type === 'text/xml' ||
            file.type === 'application/xml' ||
            file.name.toLowerCase().endsWith('.xml');
    }

    /**
     * Get appropriate icon class for file type
     */
    getFileIcon(file: UploadedFile): string {
        if (this.isPdfFile(file)) return 'pi-file-pdf';
        if (this.isImageFile(file)) return 'pi-image';
        if (this.isXmlFile(file)) return 'pi-code';
        if (file.type === 'application/json' || file.name.endsWith('.json')) return 'pi-code';
        if (file.type.startsWith('text/')) return 'pi-file-edit';
        return 'pi-file';
    }

    /**
     * Check if file should be sent for AI processing
     * Excludes ZIP files and folders (visual groupings only)
     */
    isProcessableFile(file: UploadedFile): boolean {
        // Exclude ZIP files (they are containers, not documents)
        if (file.type === 'application/zip' ||
            file.type === 'application/x-zip-compressed' ||
            file.name.toLowerCase().endsWith('.zip')) {
            return false;
        }
        // Only process files that have actual content to analyze
        return file.size > 0;
    }

    /**
     * Generate a thumbnail for a file to show during processing
     * Returns base64 data URL for the thumbnail
     */
    async generateThumbnail(file: UploadedFile): Promise<string | undefined> {
        try {
            // For images, use existing dataUrl or objectUrl
            if (this.isImageFile(file)) {
                return file.dataUrl || file.objectUrl;
            }

            // For PDFs, render first page as thumbnail
            if (this.isPdfFile(file) && file.file) {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';

                const arrayBuffer = await file.file.arrayBuffer();
                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);

                // Render at small scale for thumbnail
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas as any
                }).promise;

                return canvas.toDataURL('image/jpeg', 0.7);
            }

            // No thumbnail for other file types
            return undefined;
        } catch (error) {
            console.warn('[DocumentManagement] Thumbnail generation failed:', file.name, error);
            return undefined;
        }
    }

    /**
     * Check if file is an Office document
     */
    isOfficeFile(file: UploadedFile): boolean {
        const officeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        return officeTypes.includes(file.type) ||
            file.name.endsWith('.pdf') ||
            file.name.endsWith('.doc') ||
            file.name.endsWith('.docx') ||
            file.name.endsWith('.xls') ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.ppt') ||
            file.name.endsWith('.pptx');
    }

    /**
     * Get viewer type for ngx-doc-viewer
     * Options: google, office, mammoth, pdf, url
     */
    getDocViewerType(file: UploadedFile): 'google' | 'office' | 'mammoth' | 'pdf' | 'url' {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            return 'pdf';
        }
        if (file.name.endsWith('.docx')) {
            return 'mammoth'; // Use mammoth for .docx (works offline)
        }
        // Use Google Docs Viewer for other Office formats
        return 'google';
    }

    /**
     * Get sanitized URL for PDF iframe display
     * Required to bypass Angular's security for base64 data URLs
     */
    getSanitizedPdfUrl(file: UploadedFile): SafeResourceUrl | null {
        const url = file.dataUrl || file.objectUrl;
        if (!url) return null;
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    /**
     * Handle keyboard navigation in results list
     */
    onResultsKeydown(event: KeyboardEvent): void {
        const files = this.mappedFiles();
        if (files.length === 0) return;

        const currentIndex = this.selectedResultIndex();

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const newIndex = Math.min(currentIndex + 1, files.length - 1);
            this.selectResult(newIndex);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const newIndex = Math.max(currentIndex - 1, 0);
            this.selectResult(newIndex);
        } else if (event.key === 'Enter' && currentIndex >= 0) {
            event.preventDefault();
            // Open preview modal
            this.showPreviewModal();
        }
    }

    /**
     * Select a result by index and update preview
     */
    selectResult(index: number): void {
        this.selectedResultIndex.set(index);
        this.updatePreviewJson(index);
    }

    /**
     * Get relative time string (e.g., "2 min ago")
     */
    getRelativeTime(date: Date | undefined): string {
        if (!date) return '';
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return new Date(date).toLocaleDateString();
    }

    /**
     * Get list of missing or low-confidence fields
     */
    getMissingFields(file: UploadedFile): string[] {
        if (!file.mappedData || !this.selectedSchema()) return [];

        const schema = this.selectedSchema()!;
        const mappedFieldNames = file.mappedData.mappings
            .filter(m => m.extractedValue !== null && m.extractedValue !== undefined && m.extractedValue !== '')
            .map(m => m.propertyName);

        // Find required fields that are missing
        const requiredFields = schema.properties
            .filter(p => p.required)
            .map(p => p.name);

        return requiredFields.filter(name => !mappedFieldNames.includes(name));
    }

    /**
     * Get count of missing fields
     */
    getMissingFieldsCount(file: UploadedFile): number {
        return this.getMissingFields(file).length;
    }

    /**
     * Get tooltip text for confidence indicator
     */
    getConfidenceTooltip(file: UploadedFile): string {
        const confidence = file.mappedData?.confidence || 0;
        if (confidence >= 90) return 'Excellent data quality - ready for use';
        if (confidence >= 70) return 'Good quality - minor review recommended';
        if (confidence >= 50) return 'Fair quality - review suggested';
        return 'Low quality - verification required';
    }

    /**
     * View the original document - responsive behavior
     */
    viewOriginalDocument(): void {
        const file = this.currentPreviewFile();
        if (!file) return;

        // Check screen width for responsive behavior
        const optimalMode = this.settingsService.getOptimalViewMode();
        if (optimalMode === 'side-by-side') {
            this.sideBySideMode.set(true);
        } else {
            this.documentPreviewFile.set(file);
            this.documentPreviewVisible.set(true);
        }
    }

    /**
     * Toggle original document view
     */
    toggleOriginalView(): void {
        const optimalMode = this.settingsService.getOptimalViewMode();
        if (optimalMode === 'side-by-side') {
            this.sideBySideMode.update(v => !v);
        } else {
            if (this.sideBySideMode()) {
                this.sideBySideMode.set(false);
            } else {
                this.viewOriginalDocument();
            }
        }
    }

    /**
     * Get data quality label based on confidence
     */
    getDataQualityLabel(confidence: number): string {
        if (confidence >= 90) return 'Excellent';
        if (confidence >= 70) return 'Good';
        if (confidence >= 50) return 'Fair';
        return 'Low';
    }

    /**
     * Get data quality issues for a file
     * Focus on actionability - can this data be used to create bookings, invoices, etc.
     */
    getDataQualityIssues(file: UploadedFile): string[] {
        if (!file.mappedData) return [];

        const issues: string[] = [];
        const confidence = file.mappedData.confidence;
        const mappings = file.mappedData.mappings || [];

        // Check for low-confidence individual fields
        const lowConfFields = mappings.filter(m => m.confidence < 70);
        if (lowConfFields.length > 0) {
            issues.push(`${lowConfFields.length} field(s) have uncertain values`);
        }

        // Check for empty critical fields (based on common patterns)
        const criticalFields = ['id', 'date', 'amount', 'total', 'name', 'number'];
        const emptyFields = mappings.filter(m =>
            criticalFields.some(cf => m.propertyName.toLowerCase().includes(cf)) &&
            (m.extractedValue === null || m.extractedValue === undefined || m.extractedValue === '')
        );
        if (emptyFields.length > 0) {
            issues.push(`${emptyFields.length} key field(s) could not be extracted`);
        }

        // Overall confidence check
        if (confidence < 70) {
            issues.push('Overall extraction confidence is low');
        }

        // Check for potential data type issues
        const numericFields = mappings.filter(m =>
            (m.propertyName.toLowerCase().includes('amount') ||
                m.propertyName.toLowerCase().includes('total') ||
                m.propertyName.toLowerCase().includes('price')) &&
            typeof m.extractedValue !== 'number'
        );
        if (numericFields.length > 0) {
            issues.push('Some numeric fields may have incorrect formats');
        }

        return issues;
    }

    /**
     * Handle AI model change
     */
    onAiModelChange(modelId: string): void {
        this.selectedAiModel.set(modelId);
        this.settingsService.setLastAiModel(modelId);
    }

    // ==================== Multi-View Display Helpers ====================

    /**
     * Check if a field mapping has an issue
     */
    hasFieldIssue(mapping: PropertyMapping): boolean {
        // Low confidence
        if (mapping.confidence < 70) return true;
        // Empty value
        if (mapping.extractedValue === null || mapping.extractedValue === undefined || mapping.extractedValue === '') return true;
        return false;
    }

    /**
     * Get the issue message for a field
     */
    getFieldIssueMessage(mapping: PropertyMapping): string {
        if (mapping.extractedValue === null || mapping.extractedValue === undefined || mapping.extractedValue === '') {
            return 'Value could not be extracted from document';
        }
        if (mapping.confidence < 50) {
            return 'Very low confidence - verification strongly recommended';
        }
        if (mapping.confidence < 70) {
            return 'Low confidence - may need verification';
        }
        return '';
    }

    /**
     * Format field name for friendly display
     * camelCase/snake_case -> Title Case
     */
    formatFieldName(name: string): string {
        return name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Check if value is simple (string, number, boolean) vs complex (object, array)
     */
    isSimpleValue(value: any): boolean {
        if (value === null || value === undefined) return true;
        const type = typeof value;
        return type === 'string' || type === 'number' || type === 'boolean';
    }

    /**
     * Format value for friendly display
     */
    formatDisplayValue(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') {
            // Format currency-like numbers
            if (value > 100 && Number.isInteger(value * 100)) {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
            }
            return value.toLocaleString();
        }
        // Truncate long strings
        const str = String(value);
        return str.length > 100 ? str.substring(0, 100) + '...' : str;
    }

    /**
     * Format value for technical view
     */
    formatTechValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        return JSON.stringify(value);
    }

    /**
     * Get preview text for complex values
     */
    getComplexValuePreview(value: any): string {
        if (Array.isArray(value)) {
            return `Array (${value.length} items)`;
        }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            return `Object (${keys.length} properties)`;
        }
        return 'View details';
    }

    /**
     * Expand a field to show full content in a dialog or console
     */
    expandField(fieldName: string): void {
        const file = this.currentPreviewFile();
        if (!file?.mappedData) return;

        const mapping = file.mappedData.mappings.find(m => m.propertyName === fieldName);
        if (!mapping) return;

        // For now, log to console and copy to clipboard
        const json = JSON.stringify(mapping.extractedValue, null, 2);
        console.log(`Field: ${fieldName}`, mapping.extractedValue);

        // Copy to clipboard
        navigator.clipboard.writeText(json).then(() => {
            console.log('Copied to clipboard');
        });
    }

    /**
     * Copy any field value to clipboard
     */
    copyFieldValue(mapping: PropertyMapping): void {
        if (mapping.extractedValue === null || mapping.extractedValue === undefined) return;

        const value = typeof mapping.extractedValue === 'object'
            ? JSON.stringify(mapping.extractedValue, null, 2)
            : String(mapping.extractedValue);

        navigator.clipboard.writeText(value).then(() => {
            console.log(`Copied ${mapping.propertyName} to clipboard`);
        });
    }

    /**
     * Check if value is an array
     */
    isArrayValue(value: any): boolean {
        return Array.isArray(value);
    }

    /**
     * Check if value is a plain object (not array, not null)
     */
    isObjectValue(value: any): boolean {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Get first N items from array for preview
     */
    getArrayPreviewItems(arr: any[]): any[] {
        return arr.slice(0, 3);
    }

    /**
     * Get a summary string for an object (for display in arrays)
     */
    getObjectSummary(obj: any): string {
        if (typeof obj !== 'object' || obj === null) return String(obj);

        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';

        // Try to find a "name" or "title" or "id" field
        const identityField = ['name', 'title', 'id', 'label', 'description'].find(k => obj[k]);
        if (identityField && this.isSimpleValue(obj[identityField])) {
            return `${String(obj[identityField])} (+${keys.length - 1} fields)`;
        }

        // Otherwise show first key-value
        const firstKey = keys[0];
        const firstVal = obj[firstKey];
        const valStr = this.isSimpleValue(firstVal) ? String(firstVal) : '{...}';
        return `${firstKey}: ${valStr.substring(0, 20)}${valStr.length > 20 ? '...' : ''}`;
    }

    /**
     * Get count of keys in an object
     */
    getObjectKeyCount(obj: any): number {
        return obj && typeof obj === 'object' ? Object.keys(obj).length : 0;
    }

    /**
     * Get first N keys from object for preview
     */
    getObjectPreviewKeys(obj: any): string[] {
        if (!obj || typeof obj !== 'object') return [];
        return Object.keys(obj).slice(0, 4);
    }

    /**
     * Format an object property value for display
     */
    formatObjectPropertyValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'number') return value.toLocaleString();
        if (typeof value === 'string') {
            return value.length > 30 ? value.substring(0, 30) + '...' : value;
        }
        if (Array.isArray(value)) {
            return `[${value.length} items]`;
        }
        if (typeof value === 'object') {
            return `{${Object.keys(value).length} props}`;
        }
        return String(value);
    }

    /**
     * Export all mapped documents to CSV
     * Column names are JSON paths (e.g., party.name, invoice.date)
     * Arrays are skipped as requested
     */
    exportToCsv(): void {
        const mappedFiles = this.uploadedFiles().filter(f => f.status === 'mapped' && f.mappedData?.parsedDocument);

        if (mappedFiles.length === 0) {
            console.warn('[DocumentManagement] No mapped documents to export');
            return;
        }

        // Collect all unique JSON paths across all documents (excluding arrays)
        const allPaths = new Set<string>();

        for (const file of mappedFiles) {
            const paths = this.flattenJsonPaths(file.mappedData!.parsedDocument, '');
            paths.forEach(path => allPaths.add(path));
        }

        // Sort paths for consistent column order
        const sortedPaths = Array.from(allPaths).sort();

        // Build CSV header: fileName + all paths
        const headers = ['fileName', ...sortedPaths];

        // Build CSV rows
        const rows: string[][] = [];

        for (const file of mappedFiles) {
            const row: string[] = [file.name];
            const flatData = this.flattenJsonToPathValues(file.mappedData!.parsedDocument, '');

            for (const path of sortedPaths) {
                const value = flatData.get(path);
                row.push(this.escapeCsvValue(value));
            }

            rows.push(row);
        }

        // Generate CSV content
        const csvContent = [
            headers.map(h => this.escapeCsvValue(h)).join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Trigger download
        this.downloadCsv(csvContent, `document_export_${new Date().toISOString().slice(0, 10)}.csv`);

        console.log(`[DocumentManagement] Exported ${mappedFiles.length} documents to CSV with ${sortedPaths.length} columns`);
    }

    /**
     * Flatten JSON object to array of paths (excluding arrays)
     */
    private flattenJsonPaths(obj: any, prefix: string): string[] {
        const paths: string[] = [];

        if (obj === null || obj === undefined) {
            return paths;
        }

        // Skip arrays entirely
        if (Array.isArray(obj)) {
            return paths;
        }

        if (typeof obj !== 'object') {
            // Primitive value - this is a leaf
            if (prefix) {
                paths.push(prefix);
            }
            return paths;
        }

        // Object - recurse into properties
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            const newPath = prefix ? `${prefix}.${key}` : key;

            // Skip arrays
            if (Array.isArray(value)) {
                continue;
            }

            if (value !== null && typeof value === 'object') {
                // Nested object - recurse
                paths.push(...this.flattenJsonPaths(value, newPath));
            } else {
                // Primitive value - add path
                paths.push(newPath);
            }
        }

        return paths;
    }

    /**
     * Flatten JSON object to Map of path -> value (excluding arrays)
     */
    private flattenJsonToPathValues(obj: any, prefix: string): Map<string, any> {
        const result = new Map<string, any>();

        if (obj === null || obj === undefined) {
            return result;
        }

        // Skip arrays entirely
        if (Array.isArray(obj)) {
            return result;
        }

        if (typeof obj !== 'object') {
            if (prefix) {
                result.set(prefix, obj);
            }
            return result;
        }

        // Object - recurse into properties
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            const newPath = prefix ? `${prefix}.${key}` : key;

            // Skip arrays
            if (Array.isArray(value)) {
                continue;
            }

            if (value !== null && typeof value === 'object') {
                // Nested object - recurse and merge results
                const nested = this.flattenJsonToPathValues(value, newPath);
                nested.forEach((v, k) => result.set(k, v));
            } else {
                // Primitive value
                result.set(newPath, value);
            }
        }

        return result;
    }

    /**
     * Escape a value for CSV (handle commas, quotes, newlines)
     */
    private escapeCsvValue(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }

        const str = String(value);

        // If contains special characters, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
    }

    /**
     * Trigger CSV file download with cross-browser compatibility
     * Uses File System Access API for Chrome (shows Save As dialog)
     */
    private async downloadCsv(content: string, filename: string): Promise<void> {
        // Ensure filename ends with .csv
        const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

        // Add UTF-8 BOM for Excel compatibility
        const BOM = '\uFEFF';
        const csvWithBom = BOM + content;

        // Try File System Access API first (Chrome 86+) - shows native Save As dialog
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: safeFilename,
                    types: [{
                        description: 'CSV Files',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(csvWithBom);
                await writable.close();
                console.log('[DocumentManagement] CSV saved via File System Access API:', safeFilename);
                return;
            } catch (err: any) {
                // User cancelled the save dialog
                if (err.name === 'AbortError') {
                    console.log('[DocumentManagement] Save dialog cancelled');
                    return;
                }
                console.warn('[DocumentManagement] File System Access API failed, falling back:', err);
            }
        }

        // Fallback: Create blob and download
        const blob = new Blob([csvWithBom], { type: 'application/octet-stream' });

        // Try IE/Edge-specific method (msSaveBlob)
        const nav = window.navigator as any;
        if (nav.msSaveOrOpenBlob) {
            nav.msSaveOrOpenBlob(blob, safeFilename);
            console.log('[DocumentManagement] CSV download via msSaveBlob:', safeFilename);
            return;
        }

        // Standard fallback
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 500);
        console.log('[DocumentManagement] CSV download triggered:', safeFilename);
    }
}

