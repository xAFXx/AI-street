export interface Report {
    id: string;
    title: string;
    template: string;
    status: 'Draft' | 'Final' | 'Approved';
    lastModified: Date;
    progress: number;
    chapters: Chapter[];
    referenceDocs: ReferenceDoc[];
}

export interface Chapter {
    key: string;
    label: string;
    expanded?: boolean;
    children?: Chapter[];
    blocks?: ContentBlock[];
}

export interface ContentBlock {
    id: string;
    text?: string;
    images?: ContentImage[];
}

export interface ContentImage {
    id: string;
    url: string;
    caption?: string;
}

export interface ReferenceDoc {
    id: string;
    title: string;
    type: 'pdf' | 'image' | 'csv' | 'doc';
    description?: string;
}
