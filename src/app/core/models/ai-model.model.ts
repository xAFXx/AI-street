import { DatasetType } from './dataset.model';

export interface AiModel {
    id: string;
    name: string;
    provider: string;
    description: string;
    capabilities: string[];
    tokens: string; // e.g., '1M', '128k'
    processedCount: number;
    testCount: number;
    speed: number; // 0-100
    supportedTypes: DatasetType[];
    icon: string;
    selected?: boolean;
}
