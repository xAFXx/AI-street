import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';

/**
 * Schema definition model
 */
export interface Schema {
    id: string;
    name: string;
    description?: string;
    version: string;
    properties: SchemaProperty[];
    createdAt: Date;
    updatedAt: Date;
}

export interface SchemaProperty {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    description?: string;
    required?: boolean;
    format?: string;
    enum?: string[];
    items?: SchemaProperty; // For array types
    properties?: SchemaProperty[]; // For object types
}

/**
 * Mapped data result
 */
export interface MappedData {
    schemaId: string;
    sourceFile: string;
    mappings: PropertyMapping[];
    parsedDocument?: any; // Complete JSON document from AI for proper preview
    confidence: number;
    timestamp: Date;
}

export interface PropertyMapping {
    propertyName: string;
    extractedValue: any;
    confidence: number;
    source?: string; // Where in the document this came from
}

const SCHEMAS_KEY = 'document_schemas';

/**
 * Schema Service
 * Manages JSON schemas for document analysis and mapping.
 * Uses signals for reactive state management.
 */
@Injectable({
    providedIn: 'root'
})
export class SchemaService {
    private storageService = new StorageService();

    // State signals
    private schemasSignal = signal<Schema[]>([]);
    private selectedSchemaSignal = signal<Schema | null>(null);
    private loadingSignal = signal<boolean>(false);

    // Public computed signals
    readonly schemas = this.schemasSignal.asReadonly();
    readonly selectedSchema = this.selectedSchemaSignal.asReadonly();
    readonly isLoading = this.loadingSignal.asReadonly();

    readonly schemaCount = computed(() => this.schemasSignal().length);

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Load schemas from storage
     */
    private loadFromStorage(): void {
        const stored = this.storageService.load<Schema[]>(SCHEMAS_KEY);
        if (stored && Array.isArray(stored)) {
            // Convert date strings back to Date objects
            const schemas = stored.map(s => ({
                ...s,
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt)
            }));
            this.schemasSignal.set(schemas);
        } else {
            // Initialize with a sample schema
            this.initializeSampleSchemas();
        }
    }

    /**
     * Save current schemas to storage
     */
    private saveToStorage(): void {
        console.log('[SchemaService] saveToStorage called, saving', this.schemasSignal().length, 'schemas');
        this.storageService.save(SCHEMAS_KEY, this.schemasSignal());
        console.log('[SchemaService] saveToStorage complete');
    }

    /**
     * Initialize with sample schemas for demo purposes
     */
    private initializeSampleSchemas(): void {
        const sampleSchemas: Schema[] = [
            {
                id: this.generateId(),
                name: 'Invoice Document (Full)',
                description: 'Comprehensive invoice schema with creditor, debtor, delivery, and line items',
                version: '1.0.0',
                properties: [
                    { name: 'ID', type: 'string', required: true, description: 'Invoice Number' },
                    { name: 'Country', type: 'string', required: false, description: 'Country' },
                    { name: 'IssueDate', type: 'date', required: true, description: 'Issue Date' },
                    { name: 'DueDate', type: 'date', required: false, description: 'Due Date' },
                    { name: 'Note', type: 'string', required: false, description: 'Note' },
                    { name: 'PaymentTerms', type: 'string', required: false, description: 'Payment Terms' },
                    { name: 'TaxExclusiveAmount', type: 'number', required: false, description: 'Total Amount Excl. Tax' },
                    { name: 'TaxInclusiveAmount', type: 'number', required: false, description: 'Total Amount Incl. Tax' },
                    { name: 'TaxAmount', type: 'number', required: false, description: 'Tax Amount' },
                    { name: 'CreditorName', type: 'string', required: false, description: 'Creditor/Supplier Name' },
                    { name: 'CreditorStreet', type: 'string', required: false, description: 'Creditor Street Address' },
                    { name: 'CreditorCity', type: 'string', required: false, description: 'Creditor City' },
                    { name: 'CreditorPostalCode', type: 'string', required: false, description: 'Creditor Postal Code' },
                    { name: 'CreditorCountry', type: 'string', required: false, description: 'Creditor Country' },
                    { name: 'CreditorTaxID', type: 'string', required: false, description: 'Creditor Tax ID' },
                    { name: 'CreditorKVK', type: 'string', required: false, description: 'Creditor KVK Number' },
                    { name: 'DebtorName', type: 'string', required: false, description: 'Debtor/Customer Name' },
                    { name: 'DebtorStreet', type: 'string', required: false, description: 'Debtor Street Address' },
                    { name: 'DebtorCity', type: 'string', required: false, description: 'Debtor City' },
                    { name: 'DebtorPostalCode', type: 'string', required: false, description: 'Debtor Postal Code' },
                    { name: 'DebtorCountry', type: 'string', required: false, description: 'Debtor Country' },
                    { name: 'DebtorTaxID', type: 'string', required: false, description: 'Debtor Tax ID' },
                    { name: 'DebtorAccountID', type: 'string', required: false, description: 'Debtor Account ID' },
                    { name: 'PaymentIBAN', type: 'string', required: false, description: 'Payment IBAN' },
                    { name: 'DeliveryName', type: 'string', required: false, description: 'Delivery Party Name' },
                    { name: 'DeliveryAddress', type: 'string', required: false, description: 'Delivery Address' },
                    { name: 'InvoiceLines', type: 'array', required: false, description: 'Line items with Position, Name, Quantity, Amount, TaxPercentage' }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: this.generateId(),
                name: 'Invoice Schema (Simple)',
                description: 'Simplified schema for basic invoice data extraction',
                version: '1.0.0',
                properties: [
                    { name: 'invoiceNumber', type: 'string', required: true, description: 'Unique invoice identifier' },
                    { name: 'invoiceDate', type: 'date', required: true, description: 'Date of invoice' },
                    { name: 'vendorName', type: 'string', required: true, description: 'Name of vendor/supplier' },
                    { name: 'totalAmount', type: 'number', required: true, description: 'Total invoice amount' },
                    { name: 'currency', type: 'string', required: false, description: 'Currency code (e.g., USD, EUR)' },
                    { name: 'lineItems', type: 'array', required: false, description: 'List of line items' }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: this.generateId(),
                name: 'Contract Schema',
                description: 'Schema for extracting contract information',
                version: '1.0.0',
                properties: [
                    { name: 'contractId', type: 'string', required: true, description: 'Contract reference number' },
                    { name: 'partyA', type: 'string', required: true, description: 'First party name' },
                    { name: 'partyB', type: 'string', required: true, description: 'Second party name' },
                    { name: 'effectiveDate', type: 'date', required: true, description: 'Contract start date' },
                    { name: 'expirationDate', type: 'date', required: false, description: 'Contract end date' },
                    { name: 'value', type: 'number', required: false, description: 'Contract value' },
                    { name: 'terms', type: 'string', required: false, description: 'Key contract terms' }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: this.generateId(),
                name: 'Purchase Order',
                description: 'Schema for purchase order extraction',
                version: '1.0.0',
                properties: [
                    { name: 'poNumber', type: 'string', required: true, description: 'Purchase order number' },
                    { name: 'orderDate', type: 'date', required: true, description: 'Order date' },
                    { name: 'vendorName', type: 'string', required: true, description: 'Vendor name' },
                    { name: 'vendorAddress', type: 'string', required: false, description: 'Vendor address' },
                    { name: 'buyerName', type: 'string', required: false, description: 'Buyer name' },
                    { name: 'deliveryAddress', type: 'string', required: false, description: 'Delivery address' },
                    { name: 'subtotal', type: 'number', required: false, description: 'Subtotal amount' },
                    { name: 'tax', type: 'number', required: false, description: 'Tax amount' },
                    { name: 'total', type: 'number', required: true, description: 'Total amount' },
                    { name: 'paymentTerms', type: 'string', required: false, description: 'Payment terms' },
                    { name: 'deliveryDate', type: 'date', required: false, description: 'Expected delivery date' },
                    { name: 'items', type: 'array', required: false, description: 'Line items with description, quantity, unitPrice' }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        this.schemasSignal.set(sampleSchemas);
        this.saveToStorage();
    }

    /**
     * Get all schemas
     */
    getSchemas(): Schema[] {
        return this.schemasSignal();
    }

    /**
     * Get a schema by ID
     */
    getSchemaById(id: string): Schema | undefined {
        return this.schemasSignal().find(s => s.id === id);
    }

    /**
     * Select a schema for editing/use
     */
    selectSchema(schemaId: string): void {
        const schema = this.getSchemaById(schemaId);
        this.selectedSchemaSignal.set(schema || null);
    }

    /**
     * Clear schema selection
     */
    clearSelection(): void {
        this.selectedSchemaSignal.set(null);
    }

    /**
     * Create a new schema
     */
    createSchema(name: string, properties: SchemaProperty[] = [], description?: string): Schema {
        const now = new Date();
        const newSchema: Schema = {
            id: this.generateId(),
            name,
            description,
            version: '1.0.0',
            properties,
            createdAt: now,
            updatedAt: now
        };

        this.schemasSignal.update(schemas => [...schemas, newSchema]);
        this.saveToStorage();
        return newSchema;
    }

    /**
     * Update an existing schema
     */
    updateSchema(id: string, updates: Partial<Omit<Schema, 'id' | 'createdAt'>>): Schema | null {
        let updatedSchema: Schema | null = null;

        this.schemasSignal.update(schemas => {
            return schemas.map(s => {
                if (s.id === id) {
                    updatedSchema = {
                        ...s,
                        ...updates,
                        updatedAt: new Date()
                    };
                    return updatedSchema;
                }
                return s;
            });
        });

        if (updatedSchema) {
            this.saveToStorage();
            // Update selected schema if it's the one being updated
            if (this.selectedSchemaSignal()?.id === id) {
                this.selectedSchemaSignal.set(updatedSchema);
            }
        }

        return updatedSchema;
    }

    /**
     * Delete a schema
     */
    deleteSchema(id: string): boolean {
        const exists = this.schemasSignal().some(s => s.id === id);
        if (!exists) return false;

        this.schemasSignal.update(schemas => schemas.filter(s => s.id !== id));
        this.saveToStorage();

        // Clear selection if deleted schema was selected
        if (this.selectedSchemaSignal()?.id === id) {
            this.selectedSchemaSignal.set(null);
        }

        return true;
    }

    /**
     * Import schema from JSON string
     */
    importSchemaFromJson(jsonString: string): Schema | null {
        try {
            const parsed = JSON.parse(jsonString);

            // Validate basic structure
            if (!parsed.name || !Array.isArray(parsed.properties)) {
                throw new Error('Invalid schema format');
            }

            const schema = this.createSchema(
                parsed.name,
                parsed.properties,
                parsed.description
            );

            return schema;
        } catch (error) {
            console.error('[SchemaService] Failed to import schema:', error);
            return null;
        }
    }

    /**
     * Export schema to JSON string
     */
    exportSchemaToJson(schemaId: string): string | null {
        const schema = this.getSchemaById(schemaId);
        if (!schema) return null;

        return JSON.stringify(schema, null, 2);
    }

    /**
     * Convert schema to JSON Schema format (for validation)
     */
    toJsonSchema(schema: Schema): object {
        const jsonSchema: any = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: schema.name,
            description: schema.description,
            type: 'object',
            properties: {},
            required: []
        };

        for (const prop of schema.properties) {
            jsonSchema.properties[prop.name] = this.propertyToJsonSchema(prop);
            if (prop.required) {
                jsonSchema.required.push(prop.name);
            }
        }

        return jsonSchema;
    }

    private propertyToJsonSchema(prop: SchemaProperty): object {
        const result: any = {
            type: prop.type === 'date' ? 'string' : prop.type,
            description: prop.description
        };

        if (prop.type === 'date') {
            result.format = 'date-time';
        }

        if (prop.format) {
            result.format = prop.format;
        }

        if (prop.enum) {
            result.enum = prop.enum;
        }

        if (prop.type === 'array' && prop.items) {
            result.items = this.propertyToJsonSchema(prop.items);
        }

        if (prop.type === 'object' && prop.properties) {
            result.properties = {};
            for (const subProp of prop.properties) {
                result.properties[subProp.name] = this.propertyToJsonSchema(subProp);
            }
        }

        return result;
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return 'schema_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
}
