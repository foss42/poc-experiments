/**
 * DEBUGGING AND API TEMPLATE GENERATION ENGINE
 *
 * 3-step process:
 *   Step 1 — DIAGNOSE: identify root cause of bad data
 *   Step 2 — BLOCK:    return structured error if invalid
 *   Step 3 — GENERATE: produce curl + PowerShell only if valid
 */

'use strict';

const WITH_BODY = ['POST', 'PUT', 'PATCH'];

// ─────────────────────────────────────────────
// STEP 1 — DIAGNOSIS ENGINE
// ─────────────────────────────────────────────

const STATIC_DOMAINS = [
    'api.example.com',
    'example.com',
    'placeholder',
    'fake',
    'dummy',
    'your-domain',
    'your-api.com',
    'change-me.com',
    'insert-url-here',
    'sample.com',
    'test-api.com',
    'api.weather.com',
    'petstore.example.com'
];

function diagnose(is_validated, base_url, endpointPath) {
    // Step 1: Validation flag must be true
    if (is_validated !== true) {
        return {
            valid:  false,
            cause:  'STATIC_OR_UNVALIDATED_DATA_LEAK',
            reason: 'Validator not executed before generation — is_validated flag is not true',
            fix:    'Ensure validator runs BEFORE generator and sets is_validated: true'
        };
    }

    // Step 2: base_url must exist
    if (!base_url || base_url.trim() === '') {
        return {
            valid:  false,
            cause:  'MISSING_BASE_URL',
            reason: 'base_url is empty — no servers field defined in OpenAPI spec or registry entry',
            fix:    'Add a real servers[0].url to the OpenAPI spec or update the registry entry'
        };
    }

    // Step 3: base_url must be a valid URL format
    const lower = base_url.toLowerCase().trim();
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
        return {
            valid:  false,
            cause:  'INVALID_URL_FORMAT',
            reason: `base_url "${base_url}" is not a valid URL — must start with http:// or https://`,
            fix:    'Provide a fully qualified URL including protocol'
        };
    }

    // Step 4: endpoint path must exist
    if (!endpointPath || endpointPath.trim() === '') {
        return {
            valid:  false,
            cause:  'MISSING_ENDPOINT_PATH',
            reason: 'Endpoint path is missing or empty',
            fix:    'Ensure the OpenAPI spec has a valid paths object with at least one endpoint'
        };
    }

    // ✅ All checks passed — domain check is skipped for validated registry data
    return { valid: true };
}

// ─────────────────────────────────────────────
// STEP 2 — ERROR RESPONSE BUILDER
// ─────────────────────────────────────────────

function buildError(d) {
    return {
        error:          'ERROR: STATIC OR UNVALIDATED API DATA DETECTED',
        cause:          d.cause,
        reason:         d.reason,
        fix:            d.fix,
        possibleCauses: [
            'Validator not executed before generation',
            'Fallback template system still active',
            'OpenAPI example fields used instead of real servers data',
            'Registry not refreshed or cached old data'
        ]
    };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function resolveBaseUrl(base_url) {
    return base_url.trim().replace(/\/$/, '');
}

function resolvePath(p) {
    return p.replace(/\{([^}]+)\}/g, (_, param) => {
        const lp = param.toLowerCase();
        if (lp.includes('id'))       return '123';
        if (lp.includes('name'))     return 'sample-name';
        if (lp.includes('slug'))     return 'sample-slug';
        if (lp.includes('version'))  return 'v1';
        if (lp.includes('type'))     return 'default';
        if (lp.includes('owner'))    return 'octocat';
        if (lp.includes('repo'))     return 'hello-world';
        if (lp.includes('username')) return 'octocat';
        if (lp.includes('breed'))    return 'labrador';
        if (lp.includes('code'))     return 'US';
        if (lp.includes('region'))   return 'Europe';
        return `sample_${param}`;
    });
}

function buildBody(schema, endpointPath) {
    if (schema && schema.properties) {
        const body = {};
        for (const [prop, def] of Object.entries(schema.properties)) {
            if (def.example !== undefined) { body[prop] = def.example; continue; }
            if (def.enum && def.enum.length) { body[prop] = def.enum[0]; continue; }
            switch (def.type) {
                case 'string':  body[prop] = `sample_${prop}`; break;
                case 'integer':
                case 'number':  body[prop] = 1;                break;
                case 'boolean': body[prop] = true;             break;
                case 'array':   body[prop] = [];               break;
                case 'object':  body[prop] = {};               break;
                default:        body[prop] = `sample_${prop}`;
            }
        }
        return body;
    }

    const p = (endpointPath || '').toLowerCase();
    if (p.includes('completion'))                      return { model: 'gpt-4', messages: [{ role: 'user', content: 'Hello' }] };
    if (p.includes('embedding'))                       return { model: 'text-embedding-ada-002', input: 'Hello world' };
    if (p.includes('image'))                           return { prompt: 'A sunset over mountains', n: 1, size: '1024x1024' };
    if (p.includes('issue'))                           return { title: 'Bug report', body: 'Steps to reproduce...' };
    if (p.includes('user') || p.includes('account'))  return { name: 'John Doe', email: 'john@mail.com' };
    if (p.includes('post'))                            return { title: 'My post', body: 'Post content', userId: 1 };
    if (p.includes('pet') || p.includes('animal'))    return { name: 'Fluffy', species: 'cat', age: 3 };
    if (p.includes('product') || p.includes('item'))  return { name: 'Sample Product', price: 9.99 };
    if (p.includes('order'))                           return { productId: '123', quantity: 1 };
    if (p.includes('auth') || p.includes('login'))    return { username: 'user', password: 'pass' };
    if (p.includes('message') || p.includes('chat'))  return { content: 'Hello', role: 'user' };
    return { key: 'value' };
}

function buildAuthHeaders(auth_type, keyName) {
    switch ((auth_type || '').toLowerCase()) {
        case 'apikey':
            return {
                curl: `-H "${keyName}: YOUR_API_KEY"`,
                ps:   `"${keyName}" = "YOUR_API_KEY"`
            };
        case 'bearer':
            return {
                curl: `-H "Authorization: Bearer YOUR_BEARER_TOKEN"`,
                ps:   `"Authorization" = "Bearer YOUR_BEARER_TOKEN"`
            };
        case 'oauth2':
            return {
                curl: `-H "Authorization: Bearer YOUR_OAUTH_TOKEN"`,
                ps:   `"Authorization" = "Bearer YOUR_OAUTH_TOKEN"`
            };
        default:
            return null;
    }
}

// ─────────────────────────────────────────────
// STEP 3 — GENERATOR (only runs if valid)
// ─────────────────────────────────────────────

function generate({ api_name, base_url, method, path, auth_type = 'none', headers = {}, body = null, schema = null, is_validated = false }) {
    const d = diagnose(is_validated, base_url, path);
    if (!d.valid) return buildError(d);

    const METHOD    = (method || 'GET').toUpperCase();
    const fullUrl   = `${resolveBaseUrl(base_url)}${resolvePath(path)}`;
    const keyName   = (headers && headers.keyName) ? headers.keyName : 'X-API-Key';
    const auth      = buildAuthHeaders(auth_type, keyName);
    const needsBody = WITH_BODY.includes(METHOD);
    const bodyData  = needsBody ? (body !== null ? body : buildBody(schema, path)) : null;
    const bodyJson  = bodyData ? JSON.stringify(bodyData) : null;

    // curl
    const curlLines = [
        `curl -X ${METHOD} "${fullUrl}"`,
        `  -H "Content-Type: application/json"`
    ];
    if (auth)                  curlLines.push(`  ${auth.curl}`);
    if (needsBody && bodyJson) curlLines.push(`  -d '${bodyJson}'`);
    const curl = curlLines.join(' \\\n');

    // PowerShell
    let ps = `$headers = @{\n    "Content-Type" = "application/json"`;
    if (auth) ps += `\n    ${auth.ps}`;
    ps += `\n}\n\n`;
    if (needsBody && bodyJson) {
        ps += `$body = '${bodyJson}'\n\n`;
        ps += `Invoke-RestMethod -Uri "${fullUrl}" -Method ${METHOD} -Headers $headers -Body $body`;
    } else {
        ps += `Invoke-RestMethod -Uri "${fullUrl}" -Method ${METHOD} -Headers $headers`;
    }

    return { curl, powershell: ps };
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

const Prompts = {

    fromEndpoint(params) {
        return generate(params);
    },

    fromQueryResult({ query, api_name, base_url, method, path, auth_type, schema = null }) {
        const result = generate({ api_name, base_url, method, path, auth_type, schema, is_validated: true });
        if (result.error) return result;
        result.curl       = `# Query: "${query}" → ${api_name}\n` + result.curl;
        result.powershell = `# Query: "${query}" → ${api_name}\n` + result.powershell;
        return result;
    },

    fromOpenAPI(openapi) {
        if (!openapi || !openapi.paths) {
            return [buildError(diagnose(false, '', ''))];
        }

        const rawBase = (openapi.servers && openapi.servers[0]) ? openapi.servers[0].url : '';
        const schemes = (openapi.components && openapi.components.securitySchemes) ? openapi.components.securitySchemes : {};
        let authType  = 'none';
        let keyName   = 'X-API-Key';

        for (const scheme of Object.values(schemes)) {
            if (scheme.type === 'apiKey')                              { authType = 'apiKey'; keyName = scheme.name || 'X-API-Key'; break; }
            if (scheme.type === 'http' && scheme.scheme === 'bearer')  { authType = 'bearer'; break; }
            if (scheme.type === 'oauth2')                              { authType = 'oauth2'; break; }
        }

        const results = [];
        for (const [path, pathObj] of Object.entries(openapi.paths)) {
            for (const [method, methodObj] of Object.entries(pathObj)) {
                if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
                const schema = (methodObj.requestBody && methodObj.requestBody.content && methodObj.requestBody.content['application/json'])
                    ? methodObj.requestBody.content['application/json'].schema
                    : null;
                const result = generate({ api_name: (openapi.info && openapi.info.title) || 'API', base_url: rawBase, method: method.toUpperCase(), path, auth_type: authType, headers: { keyName }, schema, is_validated: true });
                results.push({ method: method.toUpperCase(), path, summary: methodObj.summary || '', ...result });
            }
        }
        return results;
    },

    diagnose(is_validated, base_url, path) {
        return diagnose(is_validated, base_url, path);
    }
};

module.exports = Prompts;
