import { Injectable, signal } from '@angular/core';
import { Analysis } from '../models/analysis.model';

@Injectable({
    providedIn: 'root'
})
export class AnalysisService {
    private _analyses = signal<Analysis[]>([
        {
            id: '1',
            datasetName: 'Invoices - creditor recognition based on logo',
            models: ['Gemini Ultra'],
            status: 'Active',
            startTime: new Date().toISOString(),
            refreshRate: 'Hourly'
        },
        {
            id: '2',
            datasetName: 'Photos - car damage scale recognition',
            models: ['GPT-4 Turbo'],
            status: 'Active',
            startTime: new Date().toISOString(),
            refreshRate: 'Every 1000 uses'
        },
        {
            id: '3',
            datasetName: 'Photos - customer recognition',
            models: ['Claude 3 Opus'],
            status: 'Pending',
            startTime: new Date().toISOString(),
            refreshRate: 'In 22 minutes'
        },
        {
            id: '4',
            datasetName: 'Video - Traffic analysis and flow detection',
            models: ['Llama 3 70B', 'YOLOv8'],
            status: 'Completed',
            startTime: new Date().toISOString(),
            refreshRate: 'Daily'
        }
    ]);

    analyses = this._analyses.asReadonly();

    launchAnalysis(datasetName: string, modelNames: string[]) {
        const newAnalysis: Analysis = {
            id: crypto.randomUUID(),
            datasetName,
            models: modelNames,
            status: 'Active',
            startTime: new Date().toISOString(),
            refreshRate: 'Daily'
        };

        this._analyses.update(items => [newAnalysis, ...items]);
    }

    updateAnalysis(updated: Analysis) {
        this._analyses.update(items => items.map(a => a.id === updated.id ? updated : a));
    }

    deleteAnalysis(id: string) {
        this._analyses.update(items => items.filter(a => a.id !== id));
    }
}
