import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ReportTemplateConfig, TemplateChapter } from '../template-editor/models/template-config.model';
import { AiProviderService } from '../template-editor/ai-providers/ai-provider.service';
import { Report, Chapter, ContentBlock, ReferenceDoc } from '../reports/models/report.model';

/**
 * Wizard step definitions
 */
export type WizardStep = 'template-selection' | 'requirements' | 'review';

/**
 * Uploaded document for report
 */
export interface ReportDocument {
    id: string;
    file: File;
    name: string;
    type: 'image' | 'pdf' | 'video' | 'audio' | 'document';
    size: string;
    uploadedAt: Date;
    previewUrl?: string;
    linkedRequirements: string[]; // IDs of requirements this fulfills
    analyzing: boolean; // Currently being analyzed
    analyzed: boolean; // Analysis complete
    analysisResult?: {
        extractedText?: string;
        contentType?: string;
        matchedRequirements: string[];
        confidence: number;
    };
}

/**
 * Requirement status in the wizard
 */
export interface RequirementStatus {
    id: string;
    label: string;
    description?: string;
    required: boolean;
    fulfilled: boolean;
    linkedDocuments: string[]; // IDs of documents linked to this
    aiValidated: boolean;
}

/**
 * Pending AI change that user can accept or reject
 */
export interface PendingChange {
    id: string;
    documentId: string;
    documentName: string;
    type: 'requirement_match' | 'content_update' | 'suggestion';
    description: string;
    requirementId?: string;
    requirementLabel?: string;
    status: 'pending' | 'accepted' | 'rejected';
    timestamp: Date;
}

/**
 * Wizard state
 */
export interface WizardState {
    currentStep: WizardStep;
    selectedTemplate: ReportTemplateConfig | null;
    recentTemplates: ReportTemplateConfig[];
    requirements: RequirementStatus[];
    documents: ReportDocument[];
    aiMessages: AiMessage[];
    chatMessages: ChatMessage[]; // AI chat conversation
    pendingChanges: PendingChange[]; // Changes waiting for user review
    isAiTyping: boolean; // AI is generating response
    progress: {
        total: number;
        fulfilled: number;
        percentage: number;
    };
}

/**
 * AI Assistant message (system messages)
 */
export interface AiMessage {
    id: string;
    type: 'info' | 'request' | 'success' | 'warning';
    text: string;
    timestamp: Date;
    requirementId?: string;
}

/**
 * Chat message for AI conversation
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    chapterId?: string; // If editing a specific chapter
}

/**
 * Service to manage report creation wizard state
 */
@Injectable({
    providedIn: 'root'
})
export class ReportWizardService {
    private aiService = inject(AiProviderService);

    private state: WizardState = {
        currentStep: 'template-selection',
        selectedTemplate: null,
        recentTemplates: [],
        requirements: [],
        documents: [],
        aiMessages: [],
        chatMessages: [],
        pendingChanges: [],
        isAiTyping: false,
        progress: { total: 0, fulfilled: 0, percentage: 0 }
    };

    private state$ = new BehaviorSubject<WizardState>(this.state);

    constructor() {
        this.loadRecentTemplates();
    }

    // ========================
    // State Management
    // ========================

    getState(): Observable<WizardState> {
        return this.state$.asObservable();
    }

    getCurrentState(): WizardState {
        return this.state;
    }

    private updateState(updates: Partial<WizardState>): void {
        this.state = { ...this.state, ...updates };
        this.state$.next(this.state);
    }

    // ========================
    // Step Navigation
    // ========================

    setStep(step: WizardStep): void {
        this.updateState({ currentStep: step });
    }

    nextStep(): void {
        const steps: WizardStep[] = ['template-selection', 'requirements', 'review'];
        const currentIndex = steps.indexOf(this.state.currentStep);
        if (currentIndex < steps.length - 1) {
            this.setStep(steps[currentIndex + 1]);
        }
    }

    previousStep(): void {
        const steps: WizardStep[] = ['template-selection', 'requirements', 'review'];
        const currentIndex = steps.indexOf(this.state.currentStep);
        if (currentIndex > 0) {
            this.setStep(steps[currentIndex - 1]);
        }
    }

    /**
     * Reset wizard to initial state for creating a new report
     */
    resetWizard(): void {
        this.state = {
            currentStep: 'template-selection',
            selectedTemplate: null,
            recentTemplates: this.state.recentTemplates, // Keep recent templates
            requirements: [],
            documents: [],
            aiMessages: [],
            chatMessages: [],
            pendingChanges: [],
            isAiTyping: false,
            progress: { total: 0, fulfilled: 0, percentage: 0 }
        };
        this.state$.next(this.state);
    }

    /**
     * Navigate to a specific step (only if going backward or to current)
     */
    goToStep(step: WizardStep): void {
        const steps: WizardStep[] = ['template-selection', 'requirements', 'review'];
        const targetIndex = steps.indexOf(step);
        const currentIndex = steps.indexOf(this.state.currentStep);

        // Only allow going backward or staying on current step
        if (targetIndex <= currentIndex) {
            this.setStep(step);
        }
    }

    // ========================
    // Template Selection
    // ========================

    selectTemplate(template: ReportTemplateConfig): void {
        this.updateState({ selectedTemplate: template });
        this.initializeRequirements(template);
        this.addAiMessage('info', `Template "${template.name}" selected. I'll guide you through the ${this.state.requirements.length} requirements.`);
    }

    private initializeRequirements(template: ReportTemplateConfig): void {
        const requirements: RequirementStatus[] = [];

        // Extract requirements from AI summary fields
        template.aiSummary?.forEach(field => {
            requirements.push({
                id: field.id,
                label: field.label,
                description: field.placeholder,
                required: true,
                fulfilled: false,
                linkedDocuments: [],
                aiValidated: false
            });
        });

        // Extract mandatory blocks from chapters
        const extractMandatoryBlocks = (chapters: any[]) => {
            chapters.forEach(chapter => {
                chapter.blocks?.forEach((block: any) => {
                    if (block.mandatory) {
                        requirements.push({
                            id: block.id,
                            label: `${chapter.label}: ${block.type} content`,
                            description: block.constraints?.map((c: any) => c.text).join(', '),
                            required: true,
                            fulfilled: false,
                            linkedDocuments: [],
                            aiValidated: false
                        });
                    }
                });
                if (chapter.children) {
                    extractMandatoryBlocks(chapter.children);
                }
            });
        };

        extractMandatoryBlocks(template.chapters || []);

        this.updateState({
            requirements,
            progress: {
                total: requirements.length,
                fulfilled: 0,
                percentage: 0
            }
        });
    }

    confirmTemplateSelection(): void {
        if (this.state.selectedTemplate) {
            this.saveToRecentTemplates(this.state.selectedTemplate);
            this.nextStep();
            this.promptNextRequirement();
        }
    }

    private loadRecentTemplates(): void {
        try {
            const saved = localStorage.getItem('recent-report-templates');
            if (saved) {
                this.updateState({ recentTemplates: JSON.parse(saved) });
            }
        } catch (e) {
            console.warn('Failed to load recent templates', e);
        }
    }

    private saveToRecentTemplates(template: ReportTemplateConfig): void {
        let recent = [...this.state.recentTemplates];
        // Remove if already exists
        recent = recent.filter(t => t.id !== template.id);
        // Add to front
        recent.unshift(template);
        // Keep only last 5
        recent = recent.slice(0, 5);

        this.updateState({ recentTemplates: recent });
        localStorage.setItem('recent-report-templates', JSON.stringify(recent));
    }

    // ========================
    // Document Upload
    // ========================

    addDocument(file: File): ReportDocument {
        const doc: ReportDocument = {
            id: this.generateId(),
            file,
            name: file.name,
            type: this.getDocumentType(file),
            size: this.formatFileSize(file.size),
            uploadedAt: new Date(),
            linkedRequirements: [],
            analyzing: true, // Start in analyzing state
            analyzed: false
        };

        // Create preview URL for images/videos
        if (doc.type === 'image' || doc.type === 'video') {
            doc.previewUrl = URL.createObjectURL(file);
        }

        this.updateState({ documents: [...this.state.documents, doc] });
        this.addAiMessage('info', `Document "${file.name}" uploaded. Analyzing content...`);

        // Trigger AI analysis
        this.analyzeDocument(doc.id, file);

        return doc;
    }

    /**
     * Analyze a document using AI and match to requirements
     */
    analyzeDocument(docId: string, file: File): void {
        if (!this.aiService.isReady()) {
            this.addAiMessage('warning', 'AI service not configured. Please configure an AI provider in settings to enable automatic document analysis.');
            this.markDocumentAnalyzed(docId, null);
            return;
        }

        // Create document info for analysis
        const uploadedDoc = {
            id: docId,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
            analyzed: false
        };

        // Build context from requirements
        const requirementContext = this.state.requirements
            .map(r => `- ${r.label}${r.description ? ': ' + r.description : ''}`)
            .join('\n');

        const instructions = `Analyze this document and determine which requirements it can fulfill.
Available requirements:
${requirementContext}

Provide analysis in JSON format with:
- extractedText: Brief summary of the document content
- contentType: Type of content (e.g., "image", "text", "data")
- matchedRequirements: Array of requirement labels that this document fulfills
- confidence: 0-100 score`;

        this.aiService.analyzeDocuments({
            documents: [uploadedDoc as any],
            files: [file],
            instructions,
            outputFormat: 'summary'
        }).subscribe({
            next: (result) => {
                console.log('Document analysis result:', result);

                // Extract matched requirements from the AI response
                const matchedReqIds = this.findMatchingRequirementIds(
                    result.suggestedDescription || ''
                );

                const analysisResult = {
                    extractedText: result.suggestedDescription || 'Document analyzed',
                    contentType: file.type,
                    matchedRequirements: matchedReqIds,
                    confidence: result.confidence || 70
                };

                this.markDocumentAnalyzed(docId, analysisResult);

                // Auto-link to matched requirements
                if (matchedReqIds.length > 0) {
                    matchedReqIds.forEach(reqId => {
                        this.linkDocumentToRequirement(docId, reqId);
                    });
                    this.addAiMessage('success',
                        `Document analyzed! Matched ${matchedReqIds.length} requirement(s).`
                    );
                } else {
                    this.addAiMessage('info',
                        `Document analyzed. Confidence: ${analysisResult.confidence}%. You can manually link it to requirements.`
                    );
                }
            },
            error: (error) => {
                console.error('Document analysis error:', error);
                this.addAiMessage('warning', `Could not analyze document: ${error.message || 'Unknown error'}`);
                this.markDocumentAnalyzed(docId, null);
            }
        });
    }

    /**
     * Find requirement IDs that match the AI analysis description
     */
    private findMatchingRequirementIds(description: string): string[] {
        const descLower = description.toLowerCase();
        return this.state.requirements
            .filter(r => {
                const labelLower = r.label.toLowerCase();
                // Check if the description mentions this requirement
                return descLower.includes(labelLower) ||
                    labelLower.split(' ').some(word =>
                        word.length > 3 && descLower.includes(word)
                    );
            })
            .map(r => r.id);
    }

    /**
     * Mark a document as analyzed with optional results
     */
    private markDocumentAnalyzed(docId: string, result: ReportDocument['analysisResult'] | null): void {
        const doc = this.state.documents.find(d => d.id === docId);

        const documents = this.state.documents.map(d => {
            if (d.id === docId) {
                return {
                    ...d,
                    analyzing: false, // No longer analyzing
                    analyzed: true,
                    analysisResult: result || undefined
                };
            }
            return d;
        });
        this.updateState({ documents });

        // If on review step and document was just analyzed, create pending change for user to review
        if (this.state.currentStep === 'review' && doc && result) {
            this.createPendingChangeForDocument(doc.name, docId, result);
        }
    }

    /**
     * Create a pending change notification for a newly analyzed document
     */
    private createPendingChangeForDocument(
        docName: string,
        docId: string,
        result: ReportDocument['analysisResult']
    ): void {
        if (!result) return;

        const matchedReqs = result.matchedRequirements || [];

        if (matchedReqs.length > 0) {
            // Create pending change for requirement matches
            const pendingChange: PendingChange = {
                id: this.generateId(),
                documentId: docId,
                documentName: docName,
                type: 'requirement_match',
                description: `AI found ${matchedReqs.length} matching requirement(s) for "${docName}"`,
                status: 'pending',
                timestamp: new Date()
            };

            this.updateState({
                pendingChanges: [...this.state.pendingChanges, pendingChange]
            });
        }
    }

    removeDocument(docId: string): void {
        const doc = this.state.documents.find(d => d.id === docId);
        if (doc?.previewUrl) {
            URL.revokeObjectURL(doc.previewUrl);
        }

        this.updateState({
            documents: this.state.documents.filter(d => d.id !== docId)
        });

        // Unlink from requirements
        this.unlinkDocumentFromRequirements(docId);
    }

    private getDocumentType(file: File): ReportDocument['type'] {
        const mime = file.type.toLowerCase();
        const name = file.name.toLowerCase();
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        if (mime.startsWith('audio/')) return 'audio';
        if (mime === 'application/pdf') return 'pdf';
        if (mime === 'text/plain' || name.endsWith('.txt')) return 'document';
        if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'document';
        return 'document';
    }

    // ========================
    // Requirement Management
    // ========================

    linkDocumentToRequirement(docId: string, requirementId: string): void {
        const documents = this.state.documents.map(d => {
            if (d.id === docId) {
                return { ...d, linkedRequirements: [...d.linkedRequirements, requirementId] };
            }
            return d;
        });

        const requirements = this.state.requirements.map(r => {
            if (r.id === requirementId) {
                return {
                    ...r,
                    linkedDocuments: [...r.linkedDocuments, docId],
                    fulfilled: true
                };
            }
            return r;
        });

        this.updateState({ documents, requirements });
        this.recalculateProgress();
    }

    private unlinkDocumentFromRequirements(docId: string): void {
        const requirements = this.state.requirements.map(r => {
            const linkedDocs = r.linkedDocuments.filter(id => id !== docId);
            return {
                ...r,
                linkedDocuments: linkedDocs,
                fulfilled: linkedDocs.length > 0
            };
        });

        this.updateState({ requirements });
        this.recalculateProgress();
    }

    fulfillRequirement(requirementId: string, fulfilled: boolean = true): void {
        const requirements = this.state.requirements.map(r => {
            if (r.id === requirementId) {
                return { ...r, fulfilled };
            }
            return r;
        });

        this.updateState({ requirements });
        this.recalculateProgress();

        if (fulfilled) {
            this.promptNextRequirement();
        }
    }

    private recalculateProgress(): void {
        const total = this.state.requirements.length;
        const fulfilled = this.state.requirements.filter(r => r.fulfilled).length;
        const percentage = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

        this.updateState({
            progress: { total, fulfilled, percentage }
        });
    }

    private promptNextRequirement(): void {
        const unfulfilled = this.state.requirements.find(r => !r.fulfilled);
        if (unfulfilled) {
            this.addAiMessage('request',
                `I need "${unfulfilled.label}". ${unfulfilled.description || 'Please provide this information by uploading relevant documents.'}`
                , unfulfilled.id);
        } else {
            this.addAiMessage('success', 'All requirements are fulfilled! You can proceed to generate the report.');
        }
    }

    // ========================
    // AI Messages
    // ========================

    addAiMessage(type: AiMessage['type'], text: string, requirementId?: string): void {
        const message: AiMessage = {
            id: this.generateId(),
            type,
            text,
            timestamp: new Date(),
            requirementId
        };

        this.updateState({
            aiMessages: [...this.state.aiMessages, message]
        });
    }

    clearMessages(): void {
        this.updateState({ aiMessages: [] });
    }

    // ========================
    // AI Chat
    // ========================

    /**
     * Send a chat message to AI and get response
     */
    sendChatMessage(userMessage: string, chapterId?: string): void {
        if (!this.aiService.isReady()) {
            this.addChatMessage('assistant', 'AI provider is not configured. Please set up an AI provider in settings.');
            return;
        }

        // Add user message
        this.addChatMessage('user', userMessage, chapterId);

        // Set typing indicator
        this.updateState({ isAiTyping: true });

        // Build context from documents
        const documentContext = this.buildDocumentContext();
        const templateContext = this.buildTemplateContext();

        // Build prompt with context
        const prompt = this.buildChatPrompt(userMessage, documentContext, templateContext, chapterId);

        // Call AI provider
        this.aiService.analyzeDocuments({
            documents: [],
            files: [],
            instructions: prompt,
            outputFormat: 'summary'
        }).subscribe({
            next: (result) => {
                this.updateState({ isAiTyping: false });

                // Extract response text from result - use suggestedDescription or build from fields
                const responseText = result.suggestedDescription ||
                    result.aiSummaryFields?.map(f => `${f.label}: ${f.value}`).join('\n') ||
                    'I analyzed the documents but could not generate a response.';

                this.addChatMessage('assistant', responseText, chapterId);
            },
            error: (error) => {
                this.updateState({ isAiTyping: false });
                console.error('AI Chat error:', error);
                this.addChatMessage('assistant', 'Sorry, I encountered an error processing your request. Please try again.');
            }
        });
    }

    /**
     * Add a chat message to history
     */
    addChatMessage(role: ChatMessage['role'], content: string, chapterId?: string): void {
        const message: ChatMessage = {
            id: this.generateId(),
            role,
            content,
            timestamp: new Date(),
            chapterId
        };

        this.updateState({
            chatMessages: [...this.state.chatMessages, message]
        });
    }

    /**
     * Build document context for AI
     */
    private buildDocumentContext(): string {
        const analyzedDocs = this.state.documents.filter(d => d.analyzed && d.analysisResult);

        if (analyzedDocs.length === 0) {
            return 'No documents have been analyzed yet.';
        }

        return analyzedDocs.map(doc => {
            const result = doc.analysisResult!;
            return `Document: ${doc.name}\nContent: ${result.extractedText || 'No text extracted'}\nConfidence: ${result.confidence}%`;
        }).join('\n\n');
    }

    /**
     * Build template context for AI
     */
    private buildTemplateContext(): string {
        if (!this.state.selectedTemplate) {
            return 'No template selected.';
        }

        const template = this.state.selectedTemplate;
        const requirements = this.state.requirements.map(r =>
            `- ${r.label}: ${r.fulfilled ? 'Fulfilled' : 'Not fulfilled'}`
        ).join('\n');

        return `Template: ${template.name}\nDescription: ${template.description}\n\nRequirements:\n${requirements}`;
    }

    /**
     * Build the chat prompt with context
     */
    private buildChatPrompt(
        userMessage: string,
        documentContext: string,
        templateContext: string,
        chapterId?: string
    ): string {
        let prompt = `You are an AI assistant helping with report creation.

TEMPLATE CONTEXT:
${templateContext}

DOCUMENT CONTEXT:
${documentContext}

`;

        if (chapterId) {
            const chapter = this.state.selectedTemplate?.chapters?.find(c => c.id === chapterId);
            if (chapter) {
                prompt += `CURRENT CHAPTER: ${chapter.label}\n\n`;
            }
        }

        prompt += `USER REQUEST: ${userMessage}

Please provide a helpful response. If the user asks about document content, reference the analyzed documents above. If they ask to edit or improve content, provide specific suggestions.

Respond in JSON format with this structure:
{
    "summary": "Your response text here",
    "suggestions": ["optional array of specific suggestions"],
    "relevantDocuments": ["names of relevant documents if any"]
}`;

        return prompt;
    }

    /**
     * Clear chat history
     */
    clearChat(): void {
        this.updateState({ chatMessages: [], isAiTyping: false });
    }

    // ========================
    // Pending Changes Management
    // ========================

    /**
     * Accept a pending change - apply the AI suggestion
     */
    acceptPendingChange(changeId: string): void {
        const change = this.state.pendingChanges.find(c => c.id === changeId);
        if (!change) return;

        // Apply the change based on type
        if (change.type === 'requirement_match') {
            // Auto-link was already done, just mark as accepted
            this.addAiMessage('success', `Accepted: ${change.description}`);
        }

        // Update change status
        this.updatePendingChangeStatus(changeId, 'accepted');
    }

    /**
     * Reject a pending change - undo the AI suggestion
     */
    rejectPendingChange(changeId: string): void {
        const change = this.state.pendingChanges.find(c => c.id === changeId);
        if (!change) return;

        // Undo the change based on type
        if (change.type === 'requirement_match') {
            // Unlink the document from requirements
            this.unlinkDocumentFromRequirements(change.documentId);
            this.addAiMessage('info', `Rejected: ${change.description}`);
        }

        // Update change status
        this.updatePendingChangeStatus(changeId, 'rejected');
    }

    /**
     * Dismiss a pending change without accepting or rejecting
     */
    dismissPendingChange(changeId: string): void {
        const pendingChanges = this.state.pendingChanges.filter(c => c.id !== changeId);
        this.updateState({ pendingChanges });
    }

    /**
     * Clear all pending changes
     */
    clearPendingChanges(): void {
        this.updateState({ pendingChanges: [] });
    }

    /**
     * Get pending changes for a specific document
     */
    getPendingChangesForDocument(docId: string): PendingChange[] {
        return this.state.pendingChanges.filter(c => c.documentId === docId && c.status === 'pending');
    }

    private updatePendingChangeStatus(changeId: string, status: PendingChange['status']): void {
        const pendingChanges = this.state.pendingChanges.map(c => {
            if (c.id === changeId) {
                return { ...c, status };
            }
            return c;
        });
        this.updateState({ pendingChanges });
    }
    // ========================
    // Report Generation
    // ========================

    /**
     * Generate a Report object from the current wizard state
     * Transforms template structure, documents, and AI analysis into a Report
     */
    generateReportFromState(): Report {
        const template = this.state.selectedTemplate;
        if (!template) {
            throw new Error('No template selected');
        }

        // Generate report ID and title
        const reportId = this.generateId();
        const dateStr = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const title = `${template.name} - ${dateStr}`;

        // Convert template chapters to report chapters with content blocks
        const chapters = this.convertTemplateChaptersToReportChapters(template.chapters);

        // Convert uploaded documents to reference docs
        const referenceDocs = this.convertDocumentsToReferenceDocs();

        // Create the report object
        const report: Report = {
            id: reportId,
            title,
            template: template.name,
            status: 'Draft',
            lastModified: new Date(),
            progress: this.state.progress.percentage,
            chapters,
            referenceDocs
        };

        return report;
    }

    /**
     * Convert template chapters to report chapters, populating content from AI analysis
     */
    private convertTemplateChaptersToReportChapters(templateChapters: TemplateChapter[]): Chapter[] {
        return templateChapters.map(tc => {
            const chapter: Chapter = {
                key: tc.key,
                label: tc.label,
                expanded: tc.expanded,
                children: tc.children ? this.convertTemplateChaptersToReportChapters(tc.children) : undefined,
                blocks: this.generateBlocksForChapter(tc)
            };
            return chapter;
        });
    }

    /**
     * Generate content blocks for a chapter based on template and analyzed documents
     */
    private generateBlocksForChapter(chapter: TemplateChapter): ContentBlock[] {
        const blocks: ContentBlock[] = [];

        // Get analyzed documents that might be relevant to this chapter
        const relevantDocs = this.state.documents.filter(doc => {
            if (!doc.analyzed || !doc.analysisResult) return false;

            // Check if any matched requirements relate to this chapter
            const chapterLabelLower = chapter.label.toLowerCase();
            const matchedReqs = doc.analysisResult.matchedRequirements || [];

            return matchedReqs.some(reqId => {
                const req = this.state.requirements.find(r => r.id === reqId);
                return req && req.label.toLowerCase().includes(chapterLabelLower.split(':')[0].trim());
            });
        });

        // Add AI-extracted text as content blocks
        relevantDocs.forEach(doc => {
            if (doc.analysisResult?.extractedText) {
                blocks.push({
                    id: this.generateId(),
                    text: doc.analysisResult.extractedText
                });
            }

            // Add images if document is an image
            if (doc.type === 'image' && doc.previewUrl) {
                blocks.push({
                    id: this.generateId(),
                    images: [{
                        id: this.generateId(),
                        url: doc.previewUrl,
                        caption: doc.name
                    }]
                });
            }
        });

        // If no blocks generated, add placeholder from template blocks
        if (blocks.length === 0 && chapter.blocks?.length > 0) {
            chapter.blocks.forEach(templateBlock => {
                if (templateBlock.content) {
                    blocks.push({
                        id: this.generateId(),
                        text: templateBlock.content
                    });
                }
            });
        }

        return blocks;
    }

    /**
     * Convert uploaded documents to reference docs for the report
     */
    private convertDocumentsToReferenceDocs(): ReferenceDoc[] {
        return this.state.documents.map(doc => {
            // Map document type to reference doc type
            let refType: ReferenceDoc['type'] = 'doc';
            switch (doc.type) {
                case 'pdf':
                    refType = 'pdf';
                    break;
                case 'image':
                    refType = 'image';
                    break;
                case 'document':
                    refType = 'doc';
                    break;
                default:
                    refType = 'doc';
            }

            return {
                id: doc.id,
                title: doc.name,
                type: refType,
                description: doc.analysisResult?.extractedText?.substring(0, 100) || `Uploaded on ${doc.uploadedAt.toLocaleDateString()}`
            };
        });
    }

    // ========================
    // Wizard Reset
    // ========================

    reset(): void {
        // Cleanup preview URLs
        this.state.documents.forEach(d => {
            if (d.previewUrl) URL.revokeObjectURL(d.previewUrl);
        });

        this.state = {
            currentStep: 'template-selection',
            selectedTemplate: null,
            recentTemplates: this.state.recentTemplates, // Keep recent
            requirements: [],
            documents: [],
            aiMessages: [],
            chatMessages: [],
            pendingChanges: [],
            isAiTyping: false,
            progress: { total: 0, fulfilled: 0, percentage: 0 }
        };
        this.state$.next(this.state);
    }

    // ========================
    // Helpers
    // ========================

    private generateId(): string {
        return Math.random().toString(36).substring(2, 11);
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}
