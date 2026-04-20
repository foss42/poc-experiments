// Code Generator - Python requests
// Ported from: lib/codegen/python/requests.dart
// Templates use Nunjucks (same {{ }} syntax as API Dash's Jinja templates)

import * as nunjucks from 'nunjucks';
import { RequestModel } from '../models/request_model';

nunjucks.configure({ autoescape: false });

const kTemplateStart = `import requests

url = '{{url}}'
`;

const kTemplateParams = `
params = {{params}}
`;

const kTemplateHeaders = `
headers = {{headers}}
`;

const kTemplateBody = `
payload = r'''{{body}}'''
`;

const kTemplateJson = `
payload = {{body}}
`;

const kTemplateRequest = `
response = requests.{{method}}(url`;

const kStringRequestParams = `, params=params`;
const kStringRequestBody = `, data=payload`;
const kStringRequestJson = `, json=payload`;
const kStringRequestHeaders = `, headers=headers`;

const kStringRequestEnd = `)

print('Status Code:', response.status_code)
print('Response Body:', response.text)
`;

export function generatePythonRequests(request: RequestModel): string {
    let result = '';
    let hasHeaders = false;
    let hasBody = false;

    // Start with URL
    result += nunjucks.renderString(kTemplateStart, { url: request.url });

    // Add params
    const enabledParams = request.params.filter(p => p.enabled && p.name.trim());
    if (enabledParams.length > 0) {
        const paramsObj: Record<string, string> = {};
        for (const p of enabledParams) {
            paramsObj[p.name] = p.value;
        }
        result += nunjucks.renderString(kTemplateParams, {
            params: JSON.stringify(paramsObj, null, 2),
        });
    }

    // Add headers
    const enabledHeaders = request.headers.filter(h => h.enabled && h.name.trim());
    if (enabledHeaders.length > 0) {
        hasHeaders = true;
        const headersObj: Record<string, string> = {};
        for (const h of enabledHeaders) {
            headersObj[h.name] = h.value;
        }
        result += nunjucks.renderString(kTemplateHeaders, {
            headers: JSON.stringify(headersObj, null, 2),
        });
    }

    // Add body
    if (request.body && request.bodyContentType !== 'none') {
        hasBody = true;
        if (request.bodyContentType === 'json') {
            try {
                const parsed = JSON.parse(request.body);
                result += nunjucks.renderString(kTemplateJson, {
                    body: JSON.stringify(parsed, null, 2),
                });
            } catch {
                result += nunjucks.renderString(kTemplateBody, { body: request.body });
            }
        } else {
            result += nunjucks.renderString(kTemplateBody, { body: request.body });
        }
    }

    // Build request line
    result += nunjucks.renderString(kTemplateRequest, {
        method: request.method.toLowerCase(),
    });

    if (enabledParams.length > 0) {
        result += kStringRequestParams;
    }
    if (hasBody) {
        result += request.bodyContentType === 'json' ? kStringRequestJson : kStringRequestBody;
    }
    if (hasHeaders) {
        result += kStringRequestHeaders;
    }

    result += kStringRequestEnd;

    return result;
}