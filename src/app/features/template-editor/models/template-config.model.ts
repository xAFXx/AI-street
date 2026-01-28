/**
 * Template Configuration Models
 * Defines the structure for report templates with chapters, blocks, constraints, and AI features
 */

// Template status
export type TemplateStatus = 'draft' | 'published';

// AI Summary field - individual required information field
export interface AiSummaryField {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    aiGenerated: boolean;
    validated: boolean;
    validatedAt?: Date;
}

// Block constraint - rules for content validation
export interface BlockConstraint {
    id: string;
    text: string;
    aiGenerated: boolean;
    requiresValidation: boolean;
    validated: boolean;
    validatedAt?: Date;
}

// Template block - content unit within a chapter
export interface TemplateBlock {
    id: string;
    type: 'text' | 'image' | 'table' | 'mixed';
    content: string;
    mandatory: boolean;
    constraints: BlockConstraint[];
    order: number;
}

// Template chapter - section in the template
export interface TemplateChapter {
    id: string;
    key: string;
    label: string;
    order: number;
    indent: number; // 0 = root, 1 = first level sub, etc.
    expanded?: boolean;
    blocks: TemplateBlock[];
    children?: TemplateChapter[];
}

// Version history entry
export interface TemplateVersion {
    version: string;
    status: TemplateStatus;
    createdAt: Date;
    publishedAt?: Date;
    createdBy: string;
    changelog?: string;
}

// Main template configuration
export interface ReportTemplateConfig {
    id: string;
    name: string;
    description: string;
    version: string;
    status: TemplateStatus;
    createdAt: Date;
    lastModified: Date;
    publishedAt?: Date;
    createdBy: string;
    lastModifiedBy: string;

    // AI Summary - required information fields
    aiSummary: AiSummaryField[];

    // Chapter structure
    chapters: TemplateChapter[];

    // Version history
    versionHistory: TemplateVersion[];

    // Uploaded documents for analysis (creation mode)
    uploadedDocuments?: UploadedDocument[];
}

// Uploaded document for AI analysis
export interface UploadedDocument {
    id: string;
    name: string;
    type: 'pdf' | 'docx';
    size: string;
    uploadedAt: Date;
    analyzed: boolean;
}

// AI Analysis result
export interface AiAnalysisResult {
    suggestedName: string;
    suggestedDescription: string;
    aiSummaryFields: AiSummaryField[];
    chapters: TemplateChapter[];
    confidence: number; // 0-100
}

// Helper functions
export function generateId(): string {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

export function incrementVersion(version: string): string {
    const parts = version.split('.');
    const minor = parseInt(parts[1] || '0', 10) + 1;
    return `${parts[0]}.${minor}`;
}

export function createEmptyTemplate(): ReportTemplateConfig {
    return {
        id: generateId(),
        name: '',
        description: '',
        version: '1.0',
        status: 'draft',
        createdAt: new Date(),
        lastModified: new Date(),
        createdBy: 'current-user',
        lastModifiedBy: 'current-user',
        aiSummary: [],
        chapters: [],
        versionHistory: [{
            version: '1.0',
            status: 'draft',
            createdAt: new Date(),
            createdBy: 'current-user'
        }]
    };
}

export function createDefaultAiSummaryFields(): AiSummaryField[] {
    return [
        {
            id: generateId(),
            label: 'Required Documents',
            value: '',
            placeholder: 'e.g., Photos, Insurance documents, Owner information',
            aiGenerated: false,
            validated: false
        },
        {
            id: generateId(),
            label: 'Target Audience',
            value: '',
            placeholder: 'e.g., Insurance adjusters, Legal teams',
            aiGenerated: false,
            validated: false
        },
        {
            id: generateId(),
            label: 'Report Purpose',
            value: '',
            placeholder: 'e.g., Damage assessment, Compliance audit',
            aiGenerated: false,
            validated: false
        }
    ];
}

export function createEmptyChapter(order: number, indent: number = 0): TemplateChapter {
    return {
        id: generateId(),
        key: `chapter-${order}`,
        label: `New Chapter ${order}`,
        order,
        indent,
        expanded: true,
        blocks: [],
        children: []
    };
}

export function createEmptyBlock(order: number): TemplateBlock {
    return {
        id: generateId(),
        type: 'text',
        content: '',
        mandatory: false,
        constraints: [],
        order
    };
}

export function createEmptyConstraint(): BlockConstraint {
    return {
        id: generateId(),
        text: '',
        aiGenerated: false,
        requiresValidation: false,
        validated: false
    };
}
