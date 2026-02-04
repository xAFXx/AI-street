import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { DatasetService } from '../../core/services/dataset.service';
import { Dataset } from '../../core/models/dataset.model';

@Component({
  selector: 'app-input-manager',
  standalone: true,
  imports: [CommonModule, FileUploadModule, TableModule, ButtonModule, CardModule, TagModule, ToggleSwitchModule, FormsModule],
  templateUrl: './input-manager.html',
  styleUrl: './input-manager.less'
})
export class InputManager {
  private datasetService = inject(DatasetService);
  files = this.datasetService.datasets;

  selectedFiles: Dataset[] = [];

  getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
    switch (status) {
      case 'Ready': return 'success';
      case 'Processing': return 'warn';
      case 'Failed': return 'danger';
      default: return 'info';
    }
  }

  onUpload(event: any) {
    for (let file of event.files) {
      this.datasetService.addFile(file);
    }
  }

  deleteFile(file: Dataset) {
    this.datasetService.deleteFile(file.id);
  }

  toggleActive(file: Dataset) {
    this.datasetService.toggleActive(file.id); // Although binding handles it visually, this ensures logic if needed
  }
}
