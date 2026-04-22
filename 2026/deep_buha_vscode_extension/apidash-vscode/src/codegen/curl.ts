// Code Generator - cURL
// Ported from: lib/codegen/others/curl.dart

import { RequestModel } from '../models/request_model';

export function generateCurl(request: RequestModel): string {
    const parts: string[] = ['curl'];

    // Method (skip for GET since it's default)
    if (request.method !== 'GET') {
        parts.push(`-X ${request.method}`);
    }

    // URL
    let url = request.url;
    const enabledParams = request.params.filter(p => p.enabled && p.name.trim());
    if (enabledParams.length > 0) {
        const queryString = enabledParams
            .map(p => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`)
            .join('&');
        url += (url.includes('?') ? '&' : '?') + queryString;
    }
    parts.push(`'${url}'`);

    // Headers
    const enabledHeaders = request.headers.filter(h => h.enabled && h.name.trim());
    for (const h of enabledHeaders) {
        parts.push(`-H '${h.name}: ${h.value}'`);
    }

    // Body
    if (request.body && request.bodyContentType !== 'none') {
        if (request.bodyContentType === 'json') {
            parts.push(`-H 'Content-Type: application/json'`);
        }
        parts.push(`-d '${request.body.replace(/'/g, "\\'")}'`);
    }

    return parts.join(' \\\n  ');
}
