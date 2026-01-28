import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AnalysisService } from '../../core/services/analysis.service';
import { AiModelService } from '../../core/services/ai-model.service';
import { AiModel } from '../../core/models/ai-model.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChartModule, CardModule, TagModule, SelectModule, TableModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.less'
})
export class Dashboard {
  public analysisService = inject(AnalysisService);
  public aiModelService = inject(AiModelService);

  selectedModel = signal<AiModel | null>(null);

  getStatusSeverity(status: string) {
    switch (status) {
      case 'Active': return 'info';
      case 'Completed': return 'success';
      case 'Pending': return 'warn';
      default: return 'secondary';
    }
  }

  // Stats computed from service
  stats = computed(() => {
    const all = this.analysisService.analyses();
    return {
      total: all.length,
      active: all.filter(a => a.status === 'Active').length,
      pending: all.filter(a => a.status === 'Pending').length
    };
  });

  activityData: any;
  activityOptions: any;

  constructor() {
    this.initCharts();
  }

  private initCharts() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.activityData = {
      labels: ['APR', 'MAY', 'JUN', 'JUL', 'AUG'],
      datasets: [
        {
          label: 'Process Activity',
          data: [65, 59, 80, 81, 56],
          fill: true,
          borderColor: '#42A5F5',
          tension: 0.4,
          backgroundColor: 'rgba(66, 165, 245, 0.1)'
        }
      ]
    };

    this.activityOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        },
        y: {
          display: false
        }
      }
    };
  }
}
