import { Observable, from, map, catchError, of } from 'rxjs';
import {
    AiDocumentAnalyzer,
    AiProviderConfig,
    DocumentAnalysisRequest
} from './ai-provider.interface';
import {
    AiAnalysisResult,
    AiSummaryField,
    TemplateChapter,
    generateId
} from '../models/template-config.model';

/**
 * OpenAI GPT Provider
 * Real implementation using OpenAI API for document analysis
 * 
 * IMPORTANT: In production, API calls should go through a backend service
 * to protect API keys. This implementation is for demonstration purposes.
 */
export class OpenAiProvider extends AiDocumentAnalyzer {
    readonly providerName = 'OpenAI GPT';
    readonly version = '1.0.0';

    private config: AiProviderConfig | null = null;
    private apiEndpoint = 'https://api.openai.com/v1/chat/completions';

    initialize(config: AiProviderConfig): void {
        this.config = config;
        if (config.endpoint) {
            this.apiEndpoint = config.endpoint;
        }
    }

    isReady(): boolean {
        return !!(this.config?.apiKey);
    }

    analyzeDocuments(request: DocumentAnalysisRequest): Observable<AiAnalysisResult> {
        if (!this.isReady()) {
            return of(this.getEmptyResult('OpenAI API key not configured'));
        }

        const prompt = this.buildAnalysisPrompt(request);

        return from(this.callOpenAI(prompt)).pipe(
            map(response => this.parseAnalysisResponse(response, request)),
            catchError(error => {
                console.error('OpenAI API error:', error);
                return of(this.getEmptyResult(`API Error: ${error.message}`));
            })
        );
    }

    validateSummaryField(fieldLabel: string, fieldValue: string): Observable<{
        valid: boolean;
        suggestions?: string[];
        confidence: number;
    }> {
        if (!this.isReady()) {
            return of({ valid: false, suggestions: ['API not configured'], confidence: 0 });
        }

        const prompt = `Validate the following field for a report template:
        Field: ${fieldLabel}
        Value: ${fieldValue}
        
        Respond with JSON: { "valid": boolean, "suggestions": string[], "confidence": number (0-100) }`;

        return from(this.callOpenAI(prompt)).pipe(
            map(response => {
                try {
                    return JSON.parse(response);
                } catch {
                    return { valid: true, confidence: 70 };
                }
            }),
            catchError(() => of({ valid: true, confidence: 50 }))
        );
    }

    generateConstraints(blockType: string, context: string): Observable<string[]> {
        if (!this.isReady()) {
            return of([]);
        }

        const prompt = `Generate 3-5 validation constraints for a "${blockType}" content block in a report.
        Context: ${context}
        
        Respond with JSON array of constraint strings only.`;

        return from(this.callOpenAI(prompt)).pipe(
            map(response => {
                try {
                    return JSON.parse(response);
                } catch {
                    return [];
                }
            }),
            catchError(() => of([]))
        );
    }

    private buildAnalysisPrompt(request: DocumentAnalysisRequest): string {
        const documentList = request.documents.map(d => `- ${d.name} (${d.type})`).join('\n');

        return `You are an expert document analyst specializing in extracting comprehensive document structures for report template creation.

TASK: Analyze the following uploaded documents and extract a COMPLETE, DETAILED chapter structure that captures ALL sections, subsections, and content requirements from these documents.

Documents to analyze:
${documentList}

${request.instructions || 'Extract the complete logical structure including all sections, subsections, requirements, and content blocks.'}

CRITICAL REQUIREMENTS:
1. Extract ALL chapters and sections from the document, not just a summary
2. Include EVERY subsection as children of their parent chapters  
3. For audit/compliance documents, include ALL numbered sections (e.g., 1.1, 1.2, 2.1, 2.2, etc.)
4. Preserve the document's hierarchical structure with proper nesting
5. Include specific content requirements and constraints mentioned in the source documents
6. If the document has numbered sections, maintain that numbering in the labels
7. Generate 10-25 main chapters for comprehensive documents, more if the source document is detailed

For each chapter, identify:
- All content blocks needed (text descriptions, tables, images, data fields)
- Which blocks are mandatory vs optional
- Specific validation constraints mentioned in the document

Respond with a JSON object in this exact format:
{
    "suggestedName": "Template name based on document title/purpose",
    "suggestedDescription": "Comprehensive description of what this template covers",
    "aiSummaryFields": [
        {"label": "Document Purpose", "value": "...", "placeholder": "..."},
        {"label": "Target Audience", "value": "...", "placeholder": "..."},
        {"label": "Regulatory Framework", "value": "...", "placeholder": "..."},
        {"label": "Key Requirements", "value": "...", "placeholder": "..."},
        {"label": "Scope", "value": "...", "placeholder": "..."}
    ],
    "chapters": [
        {
            "label": "1. Chapter Title (use exact section numbers if present)",
            "blocks": [
                {"type": "text", "content": "Detailed description of what goes here", "mandatory": true, "constraints": ["specific requirement 1", "specific requirement 2"]}
            ],
            "children": [
                {
                    "label": "1.1 Subsection Title",
                    "blocks": [...],
                    "children": [...]
                }
            ]
        }
    ],
    "confidence": 85
}

IMPORTANT: Do NOT summarize or simplify. Extract the FULL structure with ALL sections and subsections. Generate as many chapters as exist in the source document.`;
    }

    private async callOpenAI(prompt: string): Promise<string> {
        const model = this.config?.model || 'gpt-4';

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config?.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: 'You are a document structure analysis expert. Your task is to extract COMPLETE and COMPREHENSIVE document structures with ALL chapters, sections, and subsections. Never summarize or reduce the structure. Always respond with valid JSON containing the full hierarchy.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3, // Lower temperature for more consistent structure extraction
                max_tokens: 4096, // Model completion limit (gpt-3.5-turbo max)
                response_format: { type: 'json_object' } // Request JSON mode for more reliable parsing
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    private parseAnalysisResponse(response: string, request: DocumentAnalysisRequest): AiAnalysisResult {
        try {
            console.log('Raw OpenAI response:', response);

            // Check for empty response
            if (!response || response.trim() === '') {
                console.error('Empty response from OpenAI');
                return this.getEmptyResult('OpenAI returned an empty response. Please check your API key and try again.');
            }

            // Check for common API error patterns in the response
            if (response.includes('error') && response.includes('message')) {
                try {
                    const errorObj = JSON.parse(response);
                    if (errorObj.error?.message) {
                        console.error('OpenAI API error in response:', errorObj.error);
                        return this.getEmptyResult(`OpenAI API Error: ${errorObj.error.message}`);
                    }
                } catch {
                    // Not an error JSON, continue with normal parsing
                }
            }

            // Clean up the response - remove markdown code blocks if present
            let cleanedResponse = response;

            // Remove ```json ... ``` wrapper if present
            const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonBlockMatch) {
                cleanedResponse = jsonBlockMatch[1].trim();
            }

            // Try to find the outermost JSON object
            const startIndex = cleanedResponse.indexOf('{');
            let endIndex = cleanedResponse.lastIndexOf('}');

            if (startIndex === -1) {
                console.error('Could not find opening brace in response');
                return this.getEmptyResult('Invalid response format: No JSON object found. The AI may have returned text instead of JSON.');
            }

            // If no closing brace found, try to recover truncated JSON
            if (endIndex === -1 || endIndex <= startIndex) {
                console.warn('JSON appears to be truncated, attempting recovery...');
                cleanedResponse = this.attemptTruncatedJsonRecovery(cleanedResponse.substring(startIndex));
                endIndex = cleanedResponse.length - 1;
            } else {
                cleanedResponse = cleanedResponse.substring(startIndex, endIndex + 1);
            }

            console.log('Extracted JSON (first 500 chars):', cleanedResponse.substring(0, 500) + '...');

            let parsed: any;
            try {
                parsed = JSON.parse(cleanedResponse);
            } catch (parseError: any) {
                console.error('JSON parse error:', parseError.message);
                console.error('Attempting to fix common JSON issues...');

                // Try to fix common issues
                const fixedJson = this.attemptJsonFix(cleanedResponse);
                parsed = JSON.parse(fixedJson);
            }

            return {
                suggestedName: parsed.suggestedName || 'AI Generated Template',
                suggestedDescription: parsed.suggestedDescription || '',
                aiSummaryFields: this.parseAiSummaryFields(parsed.aiSummaryFields || []),
                chapters: this.parseChapters(parsed.chapters || []),
                confidence: parsed.confidence || 80
            };
        } catch (error: any) {
            console.error('Failed to parse OpenAI response:', error);
            console.error('Response was:', response?.substring(0, 1000));

            const errorMessage = error.message || 'Unknown error';
            return this.getEmptyResult(`Failed to parse AI response: ${errorMessage}. Check browser console for details.`);
        }
    }

    /**
     * Attempt to recover truncated JSON by closing open brackets/braces
     */
    private attemptTruncatedJsonRecovery(truncatedJson: string): string {
        let result = truncatedJson;
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escapeNext = false;

        for (const char of result) {
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') { // Corrected from '\\\\' to '\'
                escapeNext = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{') openBraces++;
                if (char === '}') openBraces--;
                if (char === '[') openBrackets++;
                if (char === ']') openBrackets--;
            }
        }

        // Close any unclosed strings (find last quote position)
        if (inString) {
            result += '"';
        }

        // Close brackets and braces
        while (openBrackets > 0) {
            result += ']';
            openBrackets--;
        }
        while (openBraces > 0) {
            result += '}';
            openBraces--;
        }

        console.log('Recovered JSON (attempted to close', openBraces, 'braces and', openBrackets, 'brackets)');
        return result;
    }

    /**
     * Attempt to fix common JSON syntax issues
     */
    private attemptJsonFix(json: string): string {
        let fixed = json;

        // Remove trailing commas before ] or }
        fixed = fixed.replace(/,\s*([\]}])/g, '$1');

        // Fix unescaped newlines in strings (common issue)
        fixed = fixed.replace(/([^\\])\\n/g, '$1\\\\n');

        return fixed;
    }


    private parseAiSummaryFields(fields: any[]): AiSummaryField[] {
        return fields.map(f => ({
            id: generateId(),
            label: f.label || 'Unnamed Field',
            value: f.value || '',
            placeholder: f.placeholder || '',
            aiGenerated: true,
            validated: false
        }));
    }

    private parseChapters(chapters: any[], indent = 0): TemplateChapter[] {
        return chapters.map((ch, index) => ({
            id: generateId(),
            key: (ch.label || `chapter-${index}`).toLowerCase().replace(/\s+/g, '-'),
            label: ch.label || `Chapter ${index + 1}`,
            order: index + 1,
            indent,
            expanded: true,
            blocks: (ch.blocks || []).map((b: any, bi: number) => ({
                id: generateId(),
                type: b.type || 'text',
                content: `<p>${b.content || ''}</p>`,
                mandatory: b.mandatory || false,
                constraints: (b.constraints || []).map((c: string) => ({
                    id: generateId(),
                    text: c,
                    aiGenerated: true,
                    requiresValidation: true,
                    validated: false
                })),
                order: bi + 1
            })),
            children: ch.children ? this.parseChapters(ch.children, indent + 1) : []
        }));
    }

    private getEmptyResult(message: string): AiAnalysisResult {
        return {
            suggestedName: 'New Template',
            suggestedDescription: message,
            aiSummaryFields: [],
            chapters: [],
            confidence: 0
        };
    }
}
