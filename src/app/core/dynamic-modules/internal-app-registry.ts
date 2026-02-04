import { AppManifest } from './app-manifest.model';

/**
 * Internal App Registry
 * 
 * Pre-defined apps that are built into the main bundle.
 * These can be "installed" via App Nexus and will be dynamically loaded.
 */
export const INTERNAL_APPS: AppManifest[] = [
    {
        id: 'doc-analyzer',
        name: 'Document Analyzer Pro',
        description: 'AI-powered document analysis with OCR, entity extraction, and smart categorization.',
        version: '2.1.0',
        icon: 'pi pi-file-edit',
        type: 'internal',
        componentName: 'DocumentManagementComponent',
        loader: () => import('../../features/document-management/document-management.component'),
        route: 'doc-analyzer',
        title: 'Document Analyzer'
    },
    {
        id: 'report-generator',
        name: 'Report Generator',
        description: 'Generate beautiful PDF reports from templates with dynamic data binding.',
        version: '1.0.0',
        icon: 'pi pi-file-pdf',
        type: 'internal',
        componentName: 'ReportWizardComponent',
        loader: () => import('../../features/report-wizard/report-wizard.component'),
        route: 'report-generator',
        title: 'Report Generator'
    },
    {
        id: 'schema-editor',
        name: 'Schema Editor',
        description: 'Create and edit extraction schemas with live preview.',
        version: '1.0.0',
        icon: 'pi pi-code',
        type: 'internal',
        componentName: 'SchemaEditorComponent',
        loader: () => import('../../features/schema-editor/schema-editor.component'),
        route: 'schema-editor',
        title: 'Schema Editor'
    },
    {
        id: 'ai-search',
        name: 'AI Search',
        description: 'Search and query your documents with AI assistance.',
        version: '1.0.0',
        icon: 'pi pi-search',
        type: 'internal',
        componentName: 'SearchActionComponent',
        loader: () => import('../../features/search-action/search-action.component'),
        route: 'ai-search',
        title: 'AI Search'
    },
    {
        id: 'model-arena',
        name: 'AI Model Arena',
        description: 'Compare and evaluate AI models on your datasets.',
        version: '1.0.0',
        icon: 'pi pi-bolt',
        type: 'internal',
        componentName: 'ModelArena',
        loader: () => import('../../features/model-arena/model-arena'),
        route: 'model-arena',
        title: 'Model Arena'
    },
    {
        id: 'vdb-manager',
        name: 'Virtual Database Manager',
        description: 'Create and manage virtual databases with key-value storage and TTL support.',
        version: '1.0.0',
        icon: 'pi pi-database',
        type: 'internal',
        componentName: 'VdbAppComponent',
        loader: () => import('../../features/vdb-app/vdb-app.component'),
        route: 'vdb-manager',
        title: 'VDB Manager'
    }
];

/**
 * Get an internal app manifest by ID
 */
export function getInternalAppManifest(appId: string): AppManifest | undefined {
    return INTERNAL_APPS.find(app => app.id === appId);
}

/**
 * Check if an app ID is an internal app
 */
export function isInternalApp(appId: string): boolean {
    return INTERNAL_APPS.some(app => app.id === appId);
}
