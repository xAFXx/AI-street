export type DatasetType = 'text' | 'audio' | 'video' | 'image';

export interface Dataset {
    id: string;
    name: string;
    size: string;
    type: DatasetType;
    contentType: 'structured' | 'unstructured';
    tags: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
    recordsTotal: number;
    recordsValidated: number;
    recordsUnvalidated: number;
    suggestedModel?: string;
    active: boolean;
}
