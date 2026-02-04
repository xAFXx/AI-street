export enum RemoteControlActions {
    "HTTP",
    "SQL",
    "FILE",
    "START_PIPELINES",
    "GET_PIPELINES",
    "STOP_PIPELINES",
    "CREATE_PIPELINE",
    "SELFUPDATE"
}

export interface RcHttpActionPayload {
    url: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    contentType: string;
    headers: Record<string, any> | null;
    body: Record<string, any> | null;
}
