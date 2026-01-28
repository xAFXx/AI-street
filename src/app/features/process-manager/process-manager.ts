import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AnalysisService } from '../../core/services/analysis.service';
import { Analysis } from '../../core/models/analysis.model';

@Component({
    selector: 'app-process-manager',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, FormsModule],
    templateUrl: './process-manager.html',
    styleUrl: './process-manager.less'
})
export class ProcessManager {
    public analysisService = inject(AnalysisService);

    visible = signal(false);
    editingProcess = signal<Analysis | null>(null);
    editName = signal('');
    editRefresh = signal('');

    getStatusSeverity(status: string) {
        switch (status) {
            case 'Active': return 'info';
            case 'Completed': return 'success';
            case 'Pending': return 'warn';
            default: return 'secondary';
        }
    }

    editProcess(analysis: Analysis) {
        this.editingProcess.set({ ...analysis });
        this.editName.set(analysis.datasetName);
        this.editRefresh.set(analysis.refreshRate);
        this.visible.set(true);
    }

    saveProcess() {
        const current = this.editingProcess();
        if (current) {
            this.analysisService.updateAnalysis({
                ...current,
                datasetName: this.editName(),
                refreshRate: this.editRefresh()
            });
            this.visible.set(false);
            this.editingProcess.set(null);
        }
    }

    deleteProcess(analysis: Analysis) {
        if (confirm(`Are you sure you want to delete the process: ${analysis.datasetName}?`)) {
            this.analysisService.deleteAnalysis(analysis.id);
        }
    }
}
