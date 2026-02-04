import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BlockTemplate, BlockFieldDefinition } from '../models/block-template.model';

@Injectable({
    providedIn: 'root'
})
export class BlockTemplateService {
    private templates: BlockTemplate[] = [
        {
            id: '1',
            name: 'Damage Assessment',
            description: 'Standard damage assessment block with property details and cost estimation',
            createdAt: new Date('2026-01-20'),
            updatedAt: new Date('2026-01-25'),
            fields: [
                { id: 'f1', title: 'Property Address', type: 'text', required: true, placeholder: 'Enter address' },
                { id: 'f2', title: 'Description', type: 'textarea', placeholder: 'Describe the damage...' },
                { id: 'f3', title: 'Estimated Cost', type: 'number', placeholder: '0.00' },
                { id: 'f4', title: 'Severity', type: 'dropdown', options: ['Low', 'Medium', 'High', 'Critical'] },
                { id: 'f5', title: 'Photos Required', type: 'boolean', defaultValue: true }
            ]
        },
        {
            id: '2',
            name: 'Property Inspection',
            description: 'Property inspection checklist with condition ratings',
            createdAt: new Date('2026-01-18'),
            updatedAt: new Date('2026-01-22'),
            fields: [
                { id: 'f1', title: 'Inspector Name', type: 'text', required: true },
                { id: 'f2', title: 'Inspection Date', type: 'date', required: true },
                { id: 'f3', title: 'Overall Condition', type: 'dropdown', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
                { id: 'f4', title: 'Notes', type: 'textarea', placeholder: 'Additional observations...' },
                { id: 'f5', title: 'Site Photo', type: 'image' }
            ]
        },
        {
            id: '3',
            name: 'Cost Breakdown',
            description: 'Itemized cost breakdown for repairs and services',
            createdAt: new Date('2026-01-15'),
            updatedAt: new Date('2026-01-20'),
            fields: [
                { id: 'f1', title: 'Item Description', type: 'text', required: true },
                { id: 'f2', title: 'Quantity', type: 'number', defaultValue: 1 },
                { id: 'f3', title: 'Unit Price', type: 'number', placeholder: '0.00' },
                { id: 'f4', title: 'Category', type: 'dropdown', options: ['Labor', 'Materials', 'Equipment', 'Other'] },
                { id: 'f5', title: 'Tax Included', type: 'boolean', defaultValue: false }
            ]
        }
    ];

    constructor() { }

    getAllTemplates(): Observable<BlockTemplate[]> {
        return of([...this.templates]);
    }

    getTemplateById(id: string): Observable<BlockTemplate | undefined> {
        const template = this.templates.find(t => t.id === id);
        return of(template ? { ...template } : undefined);
    }

    createTemplate(template: Omit<BlockTemplate, 'id' | 'createdAt' | 'updatedAt'>): Observable<BlockTemplate> {
        const newTemplate: BlockTemplate = {
            ...template,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.templates.push(newTemplate);
        return of({ ...newTemplate });
    }

    updateTemplate(id: string, updates: Partial<BlockTemplate>): Observable<BlockTemplate | undefined> {
        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            this.templates[index] = {
                ...this.templates[index],
                ...updates,
                updatedAt: new Date()
            };
            return of({ ...this.templates[index] });
        }
        return of(undefined);
    }

    deleteTemplate(id: string): Observable<boolean> {
        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            this.templates.splice(index, 1);
            return of(true);
        }
        return of(false);
    }

    private generateId(): string {
        return Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
    }
}
