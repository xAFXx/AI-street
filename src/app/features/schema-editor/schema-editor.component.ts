import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { SchemaService, Schema, SchemaProperty } from '../../core/services/schema.service';

@Component({
    selector: 'app-schema-editor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        CardModule,
        TooltipModule,
        DividerModule,
        MessageModule,
        ConfirmDialogModule
    ],
    providers: [ConfirmationService],
    templateUrl: './schema-editor.component.html',
    styleUrls: ['./schema-editor.component.less']
})
export class SchemaEditorComponent implements OnInit {
    private schemaService = inject(SchemaService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private confirmationService = inject(ConfirmationService);

    // State
    schemas = this.schemaService.schemas;
    selectedSchemaId = signal<string | null>(null);
    selectedSchemaIndex = signal<number>(-1);
    editorContent = signal<string>('');
    schemaName = signal<string>('');
    isNewSchema = signal<boolean>(false);
    hasChanges = signal<boolean>(false);
    validationError = signal<string | null>(null);

    // Computed
    selectedSchema = computed(() => {
        const id = this.selectedSchemaId();
        return id ? this.schemas().find(s => s.id === id) : null;
    });

    ngOnInit(): void {
        // Check if editing specific schema from route
        const schemaId = this.route.snapshot.paramMap.get('id');
        if (schemaId) {
            this.selectSchema(schemaId);
        } else if (this.schemas().length > 0) {
            // Select first schema by default
            this.selectSchema(this.schemas()[0].id);
            this.selectedSchemaIndex.set(0);
        }
    }

    /**
     * Keyboard navigation for schema list
     */
    @HostListener('document:keydown', ['$event'])
    handleKeydown(event: KeyboardEvent): void {
        const schemas = this.schemas();
        if (schemas.length === 0) return;

        const currentIndex = this.selectedSchemaIndex();

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const newIndex = Math.min(currentIndex + 1, schemas.length - 1);
            this.selectedSchemaIndex.set(newIndex);
            this.selectSchema(schemas[newIndex].id);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const newIndex = Math.max(currentIndex - 1, 0);
            this.selectedSchemaIndex.set(newIndex);
            this.selectSchema(schemas[newIndex].id);
        } else if (event.key === 'Escape') {
            this.goBack();
        }
    }

    /**
     * Select a schema to edit
     */
    selectSchema(id: string): void {
        const schema = this.schemas().find(s => s.id === id);
        if (!schema) return;

        this.selectedSchemaId.set(id);
        this.isNewSchema.set(false);
        this.schemaName.set(schema.name);
        this.selectedSchemaIndex.set(this.schemas().findIndex(s => s.id === id));

        // Convert to JSON Schema format for editor
        const jsonSchema = this.schemaToJsonSchema(schema);
        this.editorContent.set(JSON.stringify(jsonSchema, null, 2));
        this.hasChanges.set(false);
        this.validationError.set(null);
    }

    /**
     * Start creating a new schema
     */
    newSchema(): void {
        this.selectedSchemaId.set(null);
        this.isNewSchema.set(true);
        this.schemaName.set('');
        this.editorContent.set(JSON.stringify({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "New Schema",
            "type": "object",
            "properties": {},
            "required": []
        }, null, 2));
        this.hasChanges.set(false);
        this.validationError.set(null);
    }

    /**
     * Save current schema
     */
    saveSchema(): void {
        const content = this.editorContent();
        const name = this.schemaName().trim();

        if (!name) {
            this.validationError.set('Schema name is required');
            return;
        }

        try {
            const parsed = JSON.parse(content);
            const properties = this.extractPropertiesFromJsonSchema(parsed);

            if (this.isNewSchema()) {
                // Create new
                const newSchema = this.schemaService.createSchema(
                    name,
                    properties,
                    parsed.description || ''
                );
                this.selectSchema(newSchema.id);
            } else {
                // Update existing
                const id = this.selectedSchemaId();
                if (id) {
                    this.schemaService.updateSchema(id, {
                        name,
                        description: parsed.description || '',
                        properties
                    });
                }
            }

            this.hasChanges.set(false);
            this.validationError.set(null);
        } catch (error: any) {
            this.validationError.set(`Invalid JSON: ${error.message}`);
        }
    }

    /**
     * Delete current schema
     */
    deleteSchema(): void {
        const id = this.selectedSchemaId();
        if (!id) return;

        this.confirmationService.confirm({
            message: 'Are you sure you want to delete this schema?',
            header: 'Delete Schema',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.schemaService.deleteSchema(id);
                // Select first remaining schema
                const remaining = this.schemas();
                if (remaining.length > 0) {
                    this.selectSchema(remaining[0].id);
                } else {
                    this.newSchema();
                }
            }
        });
    }

    /**
     * Handle editor content change
     */
    onEditorChange(content: string): void {
        this.editorContent.set(content);
        this.hasChanges.set(true);

        // Validate JSON
        try {
            JSON.parse(content);
            this.validationError.set(null);
        } catch (error: any) {
            this.validationError.set(`Invalid JSON: ${error.message}`);
        }
    }

    /**
     * Go back to document management
     */
    goBack(): void {
        this.router.navigate(['/document-management']);
    }

    /**
     * Convert Schema to JSON Schema format (recursive)
     */
    private schemaToJsonSchema(schema: Schema): any {
        const properties: Record<string, any> = {};
        const required: string[] = [];

        for (const prop of schema.properties) {
            properties[prop.name] = this.propertyToJsonSchema(prop);
            if (prop.required) required.push(prop.name);
        }

        return {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": schema.name,
            "description": schema.description,
            "type": "object",
            "properties": properties,
            "required": required
        };
    }

    /**
     * Convert a single property to JSON Schema format (recursive)
     */
    private propertyToJsonSchema(prop: SchemaProperty): any {
        const result: any = {
            type: prop.type,
            description: prop.description
        };

        if (prop.format) result.format = prop.format;
        if (prop.enum) result.enum = prop.enum;

        // Recursive: Handle nested objects
        if (prop.type === 'object' && prop.properties && prop.properties.length > 0) {
            result.properties = {};
            const nestedRequired: string[] = [];
            for (const nestedProp of prop.properties) {
                result.properties[nestedProp.name] = this.propertyToJsonSchema(nestedProp);
                if (nestedProp.required) nestedRequired.push(nestedProp.name);
            }
            if (nestedRequired.length > 0) result.required = nestedRequired;
        }

        // Recursive: Handle arrays with item definitions
        if (prop.type === 'array' && prop.items) {
            result.items = this.propertyToJsonSchema(prop.items);
        }

        return result;
    }

    /**
     * Extract properties from JSON Schema (recursive)
     */
    private extractPropertiesFromJsonSchema(jsonSchema: any): SchemaProperty[] {
        if (!jsonSchema.properties) return [];

        const required = jsonSchema.required || [];
        return Object.entries<any>(jsonSchema.properties).map(([name, prop]) =>
            this.extractSingleProperty(name, prop, required.includes(name))
        );
    }

    /**
     * Extract a single property from JSON Schema (recursive)
     */
    private extractSingleProperty(name: string, prop: any, isRequired: boolean): SchemaProperty {
        const property: SchemaProperty = {
            name,
            type: this.mapJsonSchemaType(prop.type),
            description: prop.description,
            required: isRequired,
            format: prop.format,
            enum: prop.enum
        };

        // Recursive: Handle nested objects
        if (prop.type === 'object' && prop.properties) {
            const nestedRequired = prop.required || [];
            property.properties = Object.entries<any>(prop.properties).map(([nestedName, nestedProp]) =>
                this.extractSingleProperty(nestedName, nestedProp, nestedRequired.includes(nestedName))
            );
        }

        // Recursive: Handle arrays with item definitions
        if (prop.type === 'array' && prop.items) {
            if (prop.items.type === 'object' && prop.items.properties) {
                // Array of objects - extract the item schema
                const itemRequired = prop.items.required || [];
                property.items = {
                    name: 'item',
                    type: 'object',
                    properties: Object.entries<any>(prop.items.properties).map(([itemName, itemProp]) =>
                        this.extractSingleProperty(itemName, itemProp, itemRequired.includes(itemName))
                    )
                };
            } else {
                // Array of primitives
                property.items = {
                    name: 'item',
                    type: this.mapJsonSchemaType(prop.items.type || 'string'),
                    description: prop.items.description
                };
            }
        }

        return property;
    }

    private mapJsonSchemaType(type: string): SchemaProperty['type'] {
        const typeMap: Record<string, SchemaProperty['type']> = {
            'string': 'string',
            'number': 'number',
            'integer': 'number',
            'boolean': 'boolean',
            'object': 'object',
            'array': 'array'
        };
        return typeMap[type] || 'string';
    }
}
