export type AnalysisStatus = 'Active' | 'Pending' | 'Completed' | 'Failed';

export interface Analysis {
    id: string;
    datasetName: string;
    models: string[]; // Names of models
    status: AnalysisStatus;
    startTime: string;
    refreshRate: string; // e.g., 'Hourly', 'Daily'
}
