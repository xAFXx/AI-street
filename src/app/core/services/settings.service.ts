import { Injectable, signal, effect } from '@angular/core';

/**
 * Document Processing Settings - persisted to localStorage
 * Will be replaced by API in production
 */
export interface DocumentProcessingSettings {
    lastSchemaId: string | null;
    lastSchemaContent: string | null;  // Custom schema content (JSON string)
    lastAiModel: string;
    viewMode: 'overlay' | 'side-by-side' | 'auto';
    autoSaveResults: boolean;
}

/**
 * Cached document for persistence
 */
export interface CachedDocument {
    id: string;
    name: string;
    type: string;
    size: number;
    content?: string;
    base64Data?: string;  // For binary files
    path?: string;        // For folder structure
    status: string;
    analysisResult?: string;
    addedAt: Date;
}

/**
 * Cached result for persistence
 */
export interface CachedResult {
    id: string;
    documentName: string;
    schemaId: string;
    mappedData: any;
    processedAt: Date;
}

const STORAGE_KEYS = {
    SETTINGS: 'doc_processing_settings',
    DOCUMENTS: 'doc_processing_documents',
    RESULTS: 'doc_processing_results',
    SCHEMA_CONTENT: 'doc_processing_schema_content'
};

const DEFAULT_SETTINGS: DocumentProcessingSettings = {
    lastSchemaId: null,
    lastSchemaContent: null,
    lastAiModel: 'gpt-4o',
    viewMode: 'auto',
    autoSaveResults: true
};

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    // Reactive settings signal
    private _settings = signal<DocumentProcessingSettings>(this.loadSettings());

    // Public readonly access
    readonly settings = this._settings.asReadonly();

    constructor() {
        // Auto-save settings when they change
        effect(() => {
            const current = this._settings();
            this.saveToStorage(STORAGE_KEYS.SETTINGS, current);
        });
    }

    // ==================== Settings ====================

    /**
     * Get current settings
     */
    getSettings(): DocumentProcessingSettings {
        return this._settings();
    }

    /**
     * Update settings partially
     */
    updateSettings(partial: Partial<DocumentProcessingSettings>): void {
        this._settings.update(current => ({
            ...current,
            ...partial
        }));
    }

    /**
     * Set last used schema
     */
    setLastSchema(schemaId: string | null): void {
        this.updateSettings({ lastSchemaId: schemaId });
    }

    /**
     * Set last used schema content (for custom edits)
     */
    setSchemaContent(content: string | null): void {
        // Save large content separately to avoid settings bloat
        if (content) {
            this.saveToStorage(STORAGE_KEYS.SCHEMA_CONTENT, content);
        } else {
            localStorage.removeItem(STORAGE_KEYS.SCHEMA_CONTENT);
        }
    }

    /**
     * Get saved schema content
     */
    getSchemaContent(): string | null {
        return this.loadFromStorage<string>(STORAGE_KEYS.SCHEMA_CONTENT);
    }

    /**
     * Set last used AI model
     */
    setLastAiModel(modelId: string): void {
        this.updateSettings({ lastAiModel: modelId });
    }

    /**
     * Set view mode for original document
     */
    setViewMode(mode: 'overlay' | 'side-by-side' | 'auto'): void {
        this.updateSettings({ viewMode: mode });
    }

    /**
     * Determine optimal view mode based on screen size
     */
    getOptimalViewMode(): 'overlay' | 'side-by-side' {
        const mode = this._settings().viewMode;
        if (mode !== 'auto') return mode;

        // Auto-detect based on screen width
        // 4K = 3840px, typical desktop = 1920px, mobile < 768px
        const screenWidth = window.innerWidth;
        return screenWidth >= 1600 ? 'side-by-side' : 'overlay';
    }

    // ==================== Documents Cache ====================

    /**
     * Save documents to localStorage
     */
    saveDocuments(documents: CachedDocument[]): void {
        this.saveToStorage(STORAGE_KEYS.DOCUMENTS, documents);
    }

    /**
     * Load cached documents
     */
    loadDocuments(): CachedDocument[] {
        return this.loadFromStorage<CachedDocument[]>(STORAGE_KEYS.DOCUMENTS) || [];
    }

    /**
     * Add a document to cache
     */
    addDocument(doc: CachedDocument): void {
        const existing = this.loadDocuments();
        // Replace if same name exists
        const filtered = existing.filter(d => d.name !== doc.name);
        filtered.push(doc);
        this.saveDocuments(filtered);
    }

    /**
     * Remove a document from cache
     */
    removeDocument(docId: string): void {
        const existing = this.loadDocuments();
        this.saveDocuments(existing.filter(d => d.id !== docId));
    }

    /**
     * Clear all cached documents
     */
    clearDocuments(): void {
        localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    }

    // ==================== Results Cache ====================

    /**
     * Save results to localStorage
     */
    saveResults(results: CachedResult[]): void {
        this.saveToStorage(STORAGE_KEYS.RESULTS, results);
    }

    /**
     * Load cached results
     */
    loadResults(): CachedResult[] {
        return this.loadFromStorage<CachedResult[]>(STORAGE_KEYS.RESULTS) || [];
    }

    /**
     * Add a result to cache
     */
    addResult(result: CachedResult): void {
        const existing = this.loadResults();
        // Replace if same document exists
        const filtered = existing.filter(r => r.documentName !== result.documentName);
        filtered.push(result);
        this.saveResults(filtered);
    }

    /**
     * Clear all cached results
     */
    clearResults(): void {
        localStorage.removeItem(STORAGE_KEYS.RESULTS);
    }

    /**
     * Clear all cached data
     */
    clearAllCache(): void {
        this.clearDocuments();
        this.clearResults();
    }

    // ==================== Storage Helpers ====================

    private loadSettings(): DocumentProcessingSettings {
        const stored = this.loadFromStorage<DocumentProcessingSettings>(STORAGE_KEYS.SETTINGS);
        return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
    }

    private saveToStorage<T>(key: string, data: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn(`[SettingsService] Failed to save to localStorage:`, e);
        }
    }

    private loadFromStorage<T>(key: string): T | null {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.warn(`[SettingsService] Failed to load from localStorage:`, e);
            return null;
        }
    }
}
