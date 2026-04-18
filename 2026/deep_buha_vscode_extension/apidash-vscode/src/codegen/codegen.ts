// Code Generation Manager - Routes to the correct language generator

import { RequestModel } from '../models/request_model';
import { generatePythonRequests } from './python_requests';
import { generateJsFetch } from './js_fetch';
import { generateCurl } from './curl';

export type CodegenLanguage = 'python' | 'javascript' | 'curl';

export interface CodegenOption {
    id: CodegenLanguage;
    label: string;
    description: string;
}

export const CODEGEN_OPTIONS: CodegenOption[] = [
    { id: 'python', label: 'Python (requests)', description: 'Python requests library' },
    { id: 'javascript', label: 'JavaScript (fetch)', description: 'Browser fetch API' },
    { id: 'curl', label: 'cURL', description: 'Command line cURL' },
];

// Sanitize URL before code generation (adds https:// if user forgets protocol)
function sanitizeUrl(url: string): string {
    if (!url) { return url; }
    if (!url.includes('://') && url.length > 0) {
        return 'https://' + url;
    }
    return url;
}

export function generateCode(request: RequestModel, language: CodegenLanguage): string {
    // Fix the URL before passing to generators (mirrors Dart's defaultUriScheme logic)
    const sanitizedRequest = { ...request, url: sanitizeUrl(request.url) };

    switch (language) {
        case 'python':
            return generatePythonRequests(sanitizedRequest);
        case 'javascript':
            return generateJsFetch(sanitizedRequest);
        case 'curl':
            return generateCurl(sanitizedRequest);
        default:
            return `// Code generation for "${language}" not implemented yet`;
    }
}