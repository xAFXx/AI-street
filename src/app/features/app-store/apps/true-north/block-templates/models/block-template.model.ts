// Supported field types for block templates
export type FieldType = 'text' | 'textarea' | 'number' | 'dropdown' | 'boolean' | 'date' | 'image';

// Field definition for a template
export interface BlockFieldDefinition {
    id: string;
    title: string;           // Label shown to user
    type: FieldType;
    required?: boolean;
    placeholder?: string;
    defaultValue?: any;
    options?: string[];      // For dropdown type
}

// Block template structure
export interface BlockTemplate {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    fields: BlockFieldDefinition[];
}

// Field type options for the UI
export const FIELD_TYPE_OPTIONS: { label: string; value: FieldType; icon: string }[] = [
    { label: 'Text', value: 'text', icon: 'pi pi-pencil' },
    { label: 'Text Area', value: 'textarea', icon: 'pi pi-align-left' },
    { label: 'Number', value: 'number', icon: 'pi pi-hashtag' },
    { label: 'Dropdown', value: 'dropdown', icon: 'pi pi-chevron-down' },
    { label: 'Boolean', value: 'boolean', icon: 'pi pi-check-square' },
    { label: 'Date', value: 'date', icon: 'pi pi-calendar' },
    { label: 'Image', value: 'image', icon: 'pi pi-image' }
];
