import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { BlockTemplate, BlockFieldDefinition, FieldType, FIELD_TYPE_OPTIONS } from './models/block-template.model';
import { BlockTemplateService } from './services/block-template.service';
import { TemplateConfigService } from '../template-editor/services/template-config.service';
import { ReportTemplateConfig } from '../template-editor/models/template-config.model';

@Component({
    selector: 'app-block-templates-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToolbarModule,
        DialogModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        CheckboxModule,
        TagModule,
        TooltipModule,
        DividerModule,
        CardModule,
        ConfirmDialogModule,
        DragDropModule
    ],
    providers: [ConfirmationService],
    templateUrl: './block-templates-page.component.html',
    styleUrls: ['./block-templates-page.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockTemplatesPageComponent implements OnInit {
    templates: BlockTemplate[] = [];
    showTemplateModal = false;
    editingTemplateId: string | null = null;

    fieldTypeOptions = FIELD_TYPE_OPTIONS;

    templateForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        private templateService: BlockTemplateService,
        private confirmationService: ConfirmationService
    ) {
        this.templateForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: [''],
            fields: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.loadTemplates();
    }

    private loadTemplates(): void {
        this.templateService.getAllTemplates().subscribe(templates => {
            this.templates = templates;
            this.cdr.markForCheck();
        });
    }

    get fieldsArray(): FormArray {
        return this.templateForm.get('fields') as FormArray;
    }

    createFieldGroup(field?: BlockFieldDefinition): FormGroup {
        return this.fb.group({
            id: [field?.id || this.generateId()],
            title: [field?.title || '', Validators.required],
            type: [field?.type || 'text', Validators.required],
            required: [field?.required || false],
            placeholder: [field?.placeholder || ''],
            defaultValue: [field?.defaultValue || ''],
            options: [field?.options?.join(', ') || ''] // Store as comma-separated string for easy editing
        });
    }

    addField(): void {
        this.fieldsArray.push(this.createFieldGroup());
        this.cdr.markForCheck();
    }

    removeField(index: number): void {
        this.fieldsArray.removeAt(index);
        this.cdr.markForCheck();
    }

    onFieldDrop(event: CdkDragDrop<any[]>): void {
        const fieldsArray = this.fieldsArray;
        const fieldValues = [...fieldsArray.controls];
        moveItemInArray(fieldValues, event.previousIndex, event.currentIndex);

        // Rebuild the form array with the new order
        while (fieldsArray.length > 0) {
            fieldsArray.removeAt(0);
        }
        fieldValues.forEach(control => fieldsArray.push(control));
        this.cdr.markForCheck();
    }

    openCreateModal(): void {
        this.editingTemplateId = null;
        this.templateForm.reset({ name: '', description: '' });
        this.fieldsArray.clear();
        this.addField(); // Start with one empty field
        this.showTemplateModal = true;
        this.cdr.markForCheck();
    }

    openEditModal(template: BlockTemplate): void {
        this.editingTemplateId = template.id;
        this.templateForm.patchValue({
            name: template.name,
            description: template.description || ''
        });

        this.fieldsArray.clear();
        template.fields.forEach(field => {
            this.fieldsArray.push(this.createFieldGroup(field));
        });

        this.showTemplateModal = true;
        this.cdr.markForCheck();
    }

    saveTemplate(): void {
        if (this.templateForm.invalid) {
            this.templateForm.markAllAsTouched();
            return;
        }

        const formValue = this.templateForm.getRawValue();

        // Convert fields from form format to model format
        const fields: BlockFieldDefinition[] = formValue.fields.map((f: any) => ({
            id: f.id,
            title: f.title,
            type: f.type as FieldType,
            required: f.required,
            placeholder: f.placeholder || undefined,
            defaultValue: f.defaultValue || undefined,
            options: f.type === 'dropdown' && f.options
                ? f.options.split(',').map((o: string) => o.trim()).filter((o: string) => o)
                : undefined
        }));

        if (this.editingTemplateId) {
            this.templateService.updateTemplate(this.editingTemplateId, {
                name: formValue.name,
                description: formValue.description,
                fields
            }).subscribe(() => {
                this.showTemplateModal = false;
                this.loadTemplates();
            });
        } else {
            this.templateService.createTemplate({
                name: formValue.name,
                description: formValue.description,
                fields
            }).subscribe(() => {
                this.showTemplateModal = false;
                this.loadTemplates();
            });
        }
    }

    confirmDelete(template: BlockTemplate): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${template.name}"?`,
            header: 'Delete Template',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.templateService.deleteTemplate(template.id).subscribe(() => {
                    this.loadTemplates();
                });
            }
        });
    }

    getFieldTypeLabel(type: FieldType): string {
        const option = this.fieldTypeOptions.find(o => o.value === type);
        return option?.label || type;
    }

    getFieldTypeIcon(type: FieldType): string {
        const option = this.fieldTypeOptions.find(o => o.value === type);
        return option?.icon || 'pi pi-question';
    }

    onGlobalFilter(dt: any, event: Event): void {
        dt.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    private generateId(): string {
        return Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
    }
}
