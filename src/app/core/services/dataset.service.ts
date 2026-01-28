import { Injectable, signal } from '@angular/core';
import { Dataset, DatasetType } from '../models/dataset.model';

@Injectable({
    providedIn: 'root'
})
export class DatasetService {
    private _datasets = signal<Dataset[]>([
        { id: '1', name: 'street-traffic-v1.json', size: '25MB', type: 'text', contentType: 'structured', tags: ['traffic', 'legacy'], status: 'Ready', createdAt: '2024-01-15', updatedAt: '2024-01-15', recordsTotal: 1250, recordsValidated: 1200, recordsUnvalidated: 50, suggestedModel: 'TrafficFlow-GPT', active: true },
        { id: '2', name: 'pedestrian-behavior.csv', size: '150MB', type: 'text', contentType: 'structured', tags: ['pedestrian', 'analysis'], status: 'Processing', createdAt: '2024-01-14', updatedAt: '2024-01-14', recordsTotal: 5400, recordsValidated: 3000, recordsUnvalidated: 2400, suggestedModel: 'CrowdAnalyzer-v2', active: false },
        { id: '3', name: 'urban-noise-sample.wav', size: '500MB', type: 'audio', contentType: 'unstructured', tags: ['audio', 'noise'], status: 'Ready', createdAt: '2024-01-12', updatedAt: '2024-01-12', recordsTotal: 850, recordsValidated: 800, recordsUnvalidated: 50, suggestedModel: 'AudioSniffer', active: true },
        { id: '4', name: 'camera-feed-04.mp4', size: '1.2GB', type: 'video', contentType: 'unstructured', tags: ['feed', 'surveillance'], status: 'Failed', createdAt: '2024-01-10', updatedAt: '2024-01-10', recordsTotal: 12500, recordsValidated: 0, recordsUnvalidated: 12500, suggestedModel: 'VisionGuard-XL', active: false },
        { id: '5', name: 'intersection-snapshot.jpg', size: '4.5MB', type: 'image', contentType: 'unstructured', tags: ['damage', 'facility', 'invoice', 'products'], status: 'Ready', createdAt: '2024-01-16', updatedAt: '2024-01-16', recordsTotal: 1, recordsValidated: 1, recordsUnvalidated: 0, suggestedModel: 'StreetEye-Pro', active: true }
    ]);

    readonly datasets = this._datasets.asReadonly();

    addFile(file: any) {
        const type = this.getFileType(file.name);
        const now = new Date().toISOString().split('T')[0];
        const total = Math.floor(Math.random() * 1000) + 100;
        const newDataset: Dataset = {
            id: crypto.randomUUID(),
            name: file.name,
            size: this.formatSize(file.size),
            type: type,
            contentType: this.getContentType(type),
            tags: [],
            status: 'Ready',
            createdAt: now,
            updatedAt: now,
            recordsTotal: total,
            recordsValidated: 0,
            recordsUnvalidated: total,
            suggestedModel: this.getSuggestedModel(type),
            active: true
        };

        this._datasets.update(current => [newDataset, ...current]);
    }

    deleteFile(id: string) {
        this._datasets.update(current => current.filter(d => d.id !== id));
    }

    toggleActive(id: string) {
        const now = new Date().toISOString().split('T')[0];
        this._datasets.update(current =>
            current.map(d => d.id === id ? { ...d, active: !d.active, updatedAt: now } : d)
        );
    }

    private formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private getFileType(filename: string): DatasetType {
        const ext = filename.split('.').pop()?.toLowerCase();

        if (['json', 'csv', 'txt', 'md'].includes(ext || '')) return 'text';
        if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
        if (['mp4', 'avi', 'mov'].includes(ext || '')) return 'video';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';

        return 'text'; // Default
    }

    private getContentType(type: DatasetType): 'structured' | 'unstructured' {
        if (type === 'audio' || type === 'video' || type === 'image') return 'unstructured';
        return 'structured';
    }

    private getSuggestedModel(type: DatasetType): string {
        switch (type) {
            case 'text': return 'TextParser-AI';
            case 'audio': return 'AudioSignal-Pro';
            case 'video': return 'MotionDetect-Ultra';
            case 'image': return 'ObjectFilter-v3';
            default: return 'GeneralModel';
        }
    }
}
