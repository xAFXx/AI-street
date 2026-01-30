import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

// Document Viewer
import { NgxDocViewerModule } from 'ngx-doc-viewer';

// Services
import { SchemaService, Schema, SchemaProperty, MappedData, PropertyMapping } from '../../core/services/schema.service';
import { AiChatService } from '../../core/services/ai-chat.service';

interface UploadedFile {
    name: string;
    size: number;
    type: string;
    content?: string;
    file?: File;           // Original file object for doc viewer
    objectUrl?: string;    // Object URL for doc viewer
    status: 'pending' | 'analyzing' | 'analyzed' | 'mapped' | 'error';
    analysisResult?: string;
    mappedData?: MappedData;
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
        NgxDocViewerModule
    ],
    templateUrl: './document-management.component.html',
    styleUrl: './document-management.component.less'
})
export class DocumentManagementComponent implements OnInit, OnDestroy {
    // Services
    private schemaService = inject(SchemaService);
    private aiChatService = inject(AiChatService);

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

    // Document preview state
    documentPreviewVisible = signal<boolean>(false);
    documentPreviewFile = signal<UploadedFile | null>(null);

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

    mappedFiles = computed(() => {
        return this.uploadedFiles().filter(f => f.mappedData !== undefined);
    });

    hasMappedFiles = computed(() => {
        return this.mappedFiles().length > 0;
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

    ngOnInit(): void {
        // Initialize AI context with document analysis prompt
        this.aiChatService.getContext(this.AI_CONTEXT_ID, this.getDocumentAnalysisPrompt());
    }

    ngOnDestroy(): void {
        this.aiChatService.clearContext(this.AI_CONTEXT_ID);
    }

    /**
     * Handle schema selection from dropdown
     */
    onSchemaSelect(schemaId: string): void {
        this.selectedSchemaId.set(schemaId);
        this.isNewSchema.set(false);

        const schema = this.schemaService.getSchemaById(schemaId);
        if (schema) {
            const jsonSchema = this.schemaService.toJsonSchema(schema);
            this.schemaEditorContent.set(JSON.stringify(jsonSchema, null, 2));
        }
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
            // Create object URL for doc viewer
            const objectUrl = URL.createObjectURL(file);

            const uploadedFile: UploadedFile = {
                name: file.name,
                size: file.size,
                type: file.type,
                file: file,
                objectUrl: objectUrl,
                status: 'pending'
            };

            // Read file content for text files
            if (file.type.startsWith('text/') ||
                file.type === 'application/json' ||
                file.name.endsWith('.txt')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedFile.content = e.target?.result as string;
                    this.uploadedFiles.update(files => [...files, uploadedFile]);
                };
                reader.readAsText(file);
            } else {
                // For other files, just add metadata
                this.uploadedFiles.update(files => [...files, uploadedFile]);
            }
        }
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
    }

    /**
     * Analyze uploaded files with AI
     */
    async analyzeFiles(): Promise<void> {
        const files = this.uploadedFiles();
        if (files.length === 0) return;

        this.isAnalyzing.set(true);

        // Set the selected AI model
        this.aiChatService.setModel(this.selectedAiModel());
        console.log('[DocumentManagement] Using AI model:', this.selectedAiModel());

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.status !== 'pending') continue;

            // Update status to analyzing
            this.uploadedFiles.update(files =>
                files.map((f, idx) => idx === i ? { ...f, status: 'analyzing' as const } : f)
            );

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

                // DEBUG: Log AI response
                console.log('[DocumentManagement] === AI ANALYSIS RESPONSE ===');
                console.log('[DocumentManagement] File:', file.name);
                console.log('[DocumentManagement] Used Vision API:', needsVisionApi);
                console.log('[DocumentManagement] Response length:', result.length);
                console.log('[DocumentManagement] Full response:', result);

                // Update with analysis result
                this.uploadedFiles.update(files =>
                    files.map((f, idx) => idx === i ? {
                        ...f,
                        status: 'analyzed' as const,
                        analysisResult: result
                    } : f)
                );
            } catch (error) {
                console.error('[DocumentManagement] Analysis failed:', error);
                this.uploadedFiles.update(files =>
                    files.map((f, idx) => idx === i ? { ...f, status: 'error' as const } : f)
                );
            }
        }

        this.isAnalyzing.set(false);

        // Auto-trigger mapping if schema is selected
        if (this.selectedSchema() && this.hasAnalyzedFiles()) {
            await this.performMapping();
        }
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
}
