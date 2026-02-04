import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AiModelService } from '../../core/services/ai-model.service';
import { DatasetService } from '../../core/services/dataset.service';
import { AnalysisService } from '../../core/services/analysis.service';
import { AiModel } from '../../core/models/ai-model.model';
import { Dataset } from '../../core/models/dataset.model';

@Component({
  selector: 'app-model-arena',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, RatingModule, TagModule, ProgressBarModule, SelectModule, FormsModule],
  templateUrl: './model-arena.html',
  styleUrl: './model-arena.less'
})
export class ModelArena {
  public aiModelService = inject(AiModelService);
  public datasetService = inject(DatasetService);
  private analysisService = inject(AnalysisService);
  private router = inject(Router);

  selectedDataset = signal<Dataset | null>(null);
  isRunning = false;

  // Track selection locally as it's UI state
  selectedModelIds = signal<Set<string>>(new Set());

  constructor() {
    // Clear incompatible selections when dataset changes
    effect(() => {
      const dataset = this.selectedDataset();
      if (dataset) {
        this.selectedModelIds.update(ids => {
          const next = new Set(ids);
          let changed = false;
          for (const id of next) {
            const model = this.aiModelService.models().find(m => m.id === id);
            if (model && !model.supportedTypes.includes(dataset.type)) {
              next.delete(id);
              changed = true;
            }
          }
          return changed ? next : ids;
        });
      }
    });
  }

  filteredModels = computed(() => {
    const allModels = this.aiModelService.models();
    const dataset = this.selectedDataset();

    if (!dataset) return allModels;

    // Sort to show compatible models first
    return [...allModels].sort((a, b) => {
      const aComp = a.supportedTypes.includes(dataset.type);
      const bComp = b.supportedTypes.includes(dataset.type);
      if (aComp === bComp) {
        // Tie-breaker: suggested model first
        const aSug = a.name === dataset.suggestedModel;
        const bSug = b.name === dataset.suggestedModel;
        return aSug === bSug ? 0 : (aSug ? -1 : 1);
      }
      return aComp ? -1 : 1;
    });
  });

  isModelCompatible(model: AiModel): boolean {
    const dataset = this.selectedDataset();
    return !dataset || model.supportedTypes.includes(dataset.type);
  }

  isModelSuggested(model: AiModel): boolean {
    const dataset = this.selectedDataset();
    return !!dataset && model.name === dataset.suggestedModel;
  }

  isModelSelected(modelId: string): boolean {
    return this.selectedModelIds().has(modelId);
  }

  toggleSelection(model: AiModel) {
    if (!this.isModelCompatible(model)) return;

    this.selectedModelIds.update(ids => {
      const next = new Set(ids);
      if (next.has(model.id)) {
        next.delete(model.id);
      } else {
        next.add(model.id);
      }
      return next;
    });
  }

  get hasSelectedModels(): boolean {
    return this.selectedModelIds().size > 0;
  }

  runAnalysis() {
    const dataset = this.selectedDataset();
    if (!this.hasSelectedModels || !dataset) return;

    const selectedModelNames = this.aiModelService.models()
      .filter(m => this.isModelSelected(m.id))
      .map(m => m.name);

    this.analysisService.launchAnalysis(dataset.name, selectedModelNames);
    this.router.navigate(['/dashboard']);
  }
}
