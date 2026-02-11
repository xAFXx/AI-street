import { Observable, of, delay } from 'rxjs';
import {
    AiDocumentAnalyzer,
    AiProviderConfig,
    DocumentAnalysisRequest
} from './ai-provider.interface';
import {
    AiAnalysisResult,
    AiSummaryField,
    TemplateChapter,
    TemplateBlock,
    BlockConstraint,
    generateId
} from '../models/template-config.model';

/**
 * Mock AI Provider
 * Simulates AI document analysis for testing and demonstration
 */
export class MockAiProvider extends AiDocumentAnalyzer {
    readonly providerName = 'Mock AI (Demo)';
    readonly version = '1.0.0';

    private config: AiProviderConfig | null = null;
    private simulationDelayMs = 2000;

    initialize(config: AiProviderConfig): void {
        this.config = config;
        if (config.options?.['simulationDelay']) {
            this.simulationDelayMs = config.options['simulationDelay'];
        }
    }

    isReady(): boolean {
        return true; // Mock provider is always ready
    }

    analyzeDocuments(request: DocumentAnalysisRequest): Observable<AiAnalysisResult> {
        const documentNames = request.documents.map(d => d.name);
        const isPdfHeavy = request.documents.filter(d => d.type === 'pdf').length > request.documents.length / 2;

        // Generate dynamic structure based on uploaded documents
        const result: AiAnalysisResult = {
            suggestedName: this.generateTemplateName(documentNames),
            suggestedDescription: this.generateDescription(documentNames),
            aiSummaryFields: this.generateAiSummaryFields(documentNames),
            chapters: this.generateChapterStructure(documentNames, isPdfHeavy),
            confidence: 75 + Math.floor(Math.random() * 20)
        };

        return of(result).pipe(delay(this.simulationDelayMs));
    }

    validateSummaryField(fieldLabel: string, fieldValue: string): Observable<{
        valid: boolean;
        suggestions?: string[];
        confidence: number;
    }> {
        const valid = fieldValue.length >= 10;
        return of({
            valid,
            suggestions: valid ? undefined : ['Provide more detail for this field'],
            confidence: valid ? 90 : 40
        }).pipe(delay(1000));
    }

    generateConstraints(blockType: string, context: string): Observable<string[]> {
        const constraintsByType: Record<string, string[]> = {
            'text': [
                'Content must be clear and professional',
                'Include relevant data points and references',
                'Spell check and grammar validation required'
            ],
            'image': [
                'Image must be high resolution (min 1200x800)',
                'Proper alt text must be provided',
                'Image must be relevant to surrounding content'
            ],
            'table': [
                'All columns must have headers',
                'Data must be properly formatted',
                'Include source reference if applicable'
            ],
            'mixed': [
                'Content sections must flow logically',
                'Visual elements must complement text',
                'Maintain consistent formatting throughout'
            ]
        };

        return of(constraintsByType[blockType] || constraintsByType['text']).pipe(delay(800));
    }

    // Helper methods for generating mock content
    private generateTemplateName(documentNames: string[]): string {
        if (documentNames.length === 0) return 'New Report Framework';

        // Extract meaningful words from document names
        const name = documentNames[0]
            .replace(/\.(pdf|docx?|doc)$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\d+/g, '')
            .trim();

        return `${name} Framework Template`;
    }

    private generateDescription(documentNames: string[]): string {
        const count = documentNames.length;
        return `Generated report framework based on analysis of ${count} document${count !== 1 ? 's' : ''}. ` +
            `This template includes AI-extracted chapters, content blocks, and validation constraints.`;
    }

    private generateAiSummaryFields(documentNames: string[]): AiSummaryField[] {
        return [
            {
                id: generateId(),
                label: 'Document Types Required',
                value: documentNames.map(n => n.split('.').pop()?.toUpperCase()).join(', '),
                placeholder: 'Types of documents needed',
                aiGenerated: true,
                validated: false
            },
            {
                id: generateId(),
                label: 'Target Audience',
                value: 'Auditors, Compliance Officers, Management',
                placeholder: 'Who will use this report',
                aiGenerated: true,
                validated: false
            },
            {
                id: generateId(),
                label: 'Report Purpose',
                value: 'Document analysis and structured reporting for compliance verification',
                placeholder: 'Main purpose of the report',
                aiGenerated: true,
                validated: false
            },
            {
                id: generateId(),
                label: 'Required Data Sources',
                value: 'Primary documents, Supporting evidence, Reference materials',
                placeholder: 'Data sources needed',
                aiGenerated: true,
                validated: false
            }
        ];
    }

    private generateChapterStructure(documentNames: string[], isPdfHeavy: boolean): TemplateChapter[] {
        const chapters: TemplateChapter[] = [
            this.createChapter('Executive Summary', 1, 0, [
                this.createBlock('text', 'Executive overview of the report findings and recommendations.', true, [
                    'Must summarize key findings',
                    'Include actionable recommendations',
                    'Keep to 1-2 pages maximum'
                ])
            ]),
            this.createChapter('Introduction', 2, 0, [
                this.createBlock('text', 'Background and context for the report.', true, [
                    'State the purpose clearly',
                    'Provide necessary background'
                ])
            ], [
                this.createChapter('Scope', 1, 1, [
                    this.createBlock('text', 'Define the scope and boundaries of the report.', false, [])
                ]),
                this.createChapter('Methodology', 2, 1, [
                    this.createBlock('text', 'Describe the methodology used for analysis.', false, [])
                ])
            ]),
            this.createChapter('Findings', 3, 0, [
                this.createBlock('text', 'Detailed findings from the document analysis.', true, [
                    'Present findings objectively',
                    'Include supporting evidence',
                    'Cross-reference source documents'
                ])
            ], [
                this.createChapter('Key Observations', 1, 1, [
                    this.createBlock('text', 'Main observations from the analysis.', false, [])
                ]),
                this.createChapter('Supporting Data', 2, 1, [
                    this.createBlock('table', 'Data tables supporting the findings.', false, [
                        'Include column headers',
                        'Cite data sources'
                    ]),
                    isPdfHeavy ? this.createBlock('image', 'Visual evidence from analyzed documents.', false, [
                        'Minimum resolution 1200x800',
                        'Include captions'
                    ]) : null
                ].filter(Boolean) as TemplateBlock[])
            ]),
            this.createChapter('Recommendations', 4, 0, [
                this.createBlock('text', 'Actionable recommendations based on findings.', true, [
                    'Recommendations must be specific and actionable',
                    'Include priority and timeline',
                    'Assign responsible parties where applicable'
                ])
            ]),
            this.createChapter('Appendix', 5, 0, [
                this.createBlock('mixed', 'Supporting documents and references.', false, [])
            ], [
                this.createChapter('Document References', 1, 1, [
                    this.createBlock('text', `References to source documents: ${documentNames.slice(0, 3).join(', ')}`, false, [])
                ])
            ])
        ];

        return chapters;
    }

    private createChapter(
        label: string,
        order: number,
        indent: number,
        blocks: TemplateBlock[],
        children: TemplateChapter[] = []
    ): TemplateChapter {
        return {
            id: generateId(),
            key: label.toLowerCase().replace(/\s+/g, '-'),
            label,
            order,
            indent,
            expanded: true,
            blocks,
            children
        };
    }

    private createBlock(
        type: 'text' | 'image' | 'table' | 'mixed',
        content: string,
        mandatory: boolean,
        constraintTexts: string[]
    ): TemplateBlock {
        return {
            id: generateId(),
            type,
            content: `<p>${content}</p>`,
            mandatory,
            constraints: constraintTexts.map(text => ({
                id: generateId(),
                text,
                aiGenerated: true,
                requiresValidation: true,
                validated: false
            })),
            order: 1
        };
    }
}
