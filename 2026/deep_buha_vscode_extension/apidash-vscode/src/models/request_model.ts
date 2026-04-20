// Data models - TypeScript versions of API Dash's core types
// Mirrors: packages/apidash_core/lib/models/

export type HTTPVerb = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface NameValueModel {
    name: string;
    value: string;
    enabled: boolean;
}

export interface RequestModel {
    id: string;
    name: string;
    url: string;
    method: HTTPVerb;
    headers: NameValueModel[];
    params: NameValueModel[];
    body: string;
    bodyContentType: 'json' | 'text' | 'none';
}

export interface ResponseModel {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
    time: number;       // milliseconds
    size: number;       // bytes
    contentType: string;
}

export function createEmptyRequest(): RequestModel {
    return {
        id: generateId(),
        name: 'Untitled Request',
        url: '',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyContentType: 'none',
    };
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

