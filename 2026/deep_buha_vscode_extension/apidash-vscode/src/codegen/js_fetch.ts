// Code Generator - JavaScript fetch
// Ported from: lib/codegen/js/fetch.dart

import * as nunjucks from 'nunjucks';
import { RequestModel } from '../models/request_model';

nunjucks.configure({ autoescape: false });

const kTemplateStart = `const url = '{{url}}';
`;

const kTemplateOptions = `
const options = {
  method: '{{method}}'{{comma}}
`;

const kTemplateHeaders = `  headers: {{headers}}{{comma}}
`;

const kTemplateBody = `  body: {{body}}
`;

const kTemplateEnd = `};

fetch(url, options)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
`;

const kTemplateSimple = `fetch('{{url}}')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
`;

export function generateJsFetch(request: RequestModel): string {
    // Simple GET with no headers/params/body
    const enabledHeaders = request.headers.filter(h => h.enabled && h.name.trim());
    const hasBody = request.body && request.bodyContentType !== 'none';

    if (request.method === 'GET' && enabledHeaders.length === 0 && !hasBody) {
        return nunjucks.renderString(kTemplateSimple, { url: request.url });
    }

    let result = nunjucks.renderString(kTemplateStart, { url: request.url });

    const hasHeaders = enabledHeaders.length > 0;

    result += nunjucks.renderString(kTemplateOptions, {
        method: request.method,
        comma: hasHeaders || hasBody ? ',' : '',
    });

    if (hasHeaders) {
        const headersObj: Record<string, string> = {};
        for (const h of enabledHeaders) {
            headersObj[h.name] = h.value;
        }
        result += nunjucks.renderString(kTemplateHeaders, {
            headers: JSON.stringify(headersObj, null, 2).split('\n').join('\n  '),
            comma: hasBody ? ',' : '',
        });
    }

    if (hasBody) {
        if (request.bodyContentType === 'json') {
            result += nunjucks.renderString(kTemplateBody, {
                body: `JSON.stringify(${request.body})`,
            });
        } else {
            result += nunjucks.renderString(kTemplateBody, {
                body: `\`${request.body}\``,
            });
        }
    }

    result += kTemplateEnd;

    return result;
}
