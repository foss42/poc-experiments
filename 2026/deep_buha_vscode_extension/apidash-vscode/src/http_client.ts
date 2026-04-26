// HTTP Client - Sends requests using axios

import axios, { AxiosError, Method } from 'axios';
import { RequestModel, ResponseModel } from './models/request_model';

// Sanitize URL - adds https:// if user forgets the protocol prefix
function sanitizeUrl(url: string): string {
    if (!url) { return url; }

    if (!url.includes('://')) {
        return 'https://' + url;
    }

    return url;
}

export async function sendHttpRequest(request: RequestModel): Promise<ResponseModel> {
    const startTime = Date.now();

    // Sanitize URL before sending
    const url = sanitizeUrl(request.url);

    // Build headers object from NameValueModel array
    const headers: Record<string, string> = {};
    for (const h of request.headers) {
        if (h.enabled && h.name.trim()) {
            headers[h.name] = h.value;
        }
    }

    // Build query params
    const params: Record<string, string> = {};
    for (const p of request.params) {
        if (p.enabled && p.name.trim()) {
            params[p.name] = p.value;
        }
    }

    try {
        const response = await axios({
            url: url,
            method: request.method.toLowerCase() as Method,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            params: Object.keys(params).length > 0 ? params : undefined,
            data: request.body && request.bodyContentType !== 'none' ? request.body : undefined,
            validateStatus: () => true,
            timeout: 30000,
            transformResponse: [(data) => data],
        });

        const elapsed = Date.now() - startTime;
        const bodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
        const contentType = response.headers['content-type'] || '';

        // Try to pretty-print JSON
        let formattedBody = bodyStr;
        if (contentType.includes('json')) {
            try {
                formattedBody = JSON.stringify(JSON.parse(bodyStr), null, 2);
            } catch {
                // Not valid JSON, keep as-is
            }
        }

        return {
            statusCode: response.status,
            body: formattedBody,
            headers: response.headers as Record<string, string>,
            time: elapsed,
            size: Buffer.byteLength(bodyStr, 'utf8'),
            contentType,
        };
    } catch (error) {
        const elapsed = Date.now() - startTime;
        if (error instanceof AxiosError) {
            return {
                statusCode: 0,
                body: `Error: ${error.message}\n\n${error.code || ''}`,
                headers: {},
                time: elapsed,
                size: 0,
                contentType: 'text/plain',
            };
        }
        return {
            statusCode: 0,
            body: `Error: ${String(error)}`,
            headers: {},
            time: elapsed,
            size: 0,
            contentType: 'text/plain',
        };
    }
}