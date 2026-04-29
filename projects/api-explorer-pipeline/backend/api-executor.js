/**
 * API Executor - Real HTTP Request Execution
 * GSoC-Level: Actually executes APIs with proper error handling
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class APIExecutor {
    constructor() {
        this.timeout = 30000; // 30 seconds
        this.maxRedirects = 5;
        this.userAgent = 'API-Explorer-MCP/1.0';
    }

    /**
     * Execute an API request
     */
    async execute(config) {
        const {
            method,
            url,
            headers = {},
            body = null,
            timeout = this.timeout,
            validateSSL = true
        } = config;

        console.log(`🚀 Executing: ${method} ${url}`);

        try {
            const startTime = Date.now();
            const response = await this.makeRequest({
                method,
                url,
                headers: {
                    'User-Agent': this.userAgent,
                    ...headers
                },
                body,
                timeout,
                validateSSL
            });

            const duration = Date.now() - startTime;

            console.log(`✅ Response: ${response.statusCode} (${duration}ms)`);

            return {
                success: true,
                statusCode: response.statusCode,
                statusText: response.statusMessage,
                headers: response.headers,
                body: response.body,
                duration,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Execution failed: ${error.message}`);

            return {
                success: false,
                error: error.message,
                errorType: error.code || 'UNKNOWN_ERROR',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Make HTTP/HTTPS request
     */
    makeRequest(config) {
        return new Promise((resolve, reject) => {
            const { method, url, headers, body, timeout, validateSSL } = config;

            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch (error) {
                return reject(new Error(`Invalid URL: ${url}`));
            }

            const isHTTPS = parsedUrl.protocol === 'https:';
            const client = isHTTPS ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHTTPS ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: method.toUpperCase(),
                headers,
                timeout,
                rejectUnauthorized: validateSSL
            };

            const req = client.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    // Try to parse JSON
                    let parsedBody;
                    try {
                        parsedBody = JSON.parse(data);
                    } catch (e) {
                        parsedBody = data;
                    }

                    resolve({
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        body: parsedBody
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout after ${timeout}ms`));
            });

            // Send body if present
            if (body) {
                const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
                req.write(bodyString);
            }

            req.end();
        });
    }

    /**
     * Build full URL with path and query parameters
     */
    buildURL(baseUrl, path, pathParams = {}, queryParams = {}) {
        // Replace path parameters
        let finalPath = path;
        for (const [key, value] of Object.entries(pathParams)) {
            finalPath = finalPath.replace(`{${key}}`, encodeURIComponent(value));
        }

        // Build full URL
        let fullUrl = `${baseUrl}${finalPath}`;

        // Add query parameters
        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        if (queryString) {
            fullUrl += `?${queryString}`;
        }

        return fullUrl;
    }

    /**
     * Build headers with authentication
     */
    buildHeaders(authType, authDetails, additionalHeaders = {}) {
        const headers = { ...additionalHeaders };

        if (authType === 'bearer' && authDetails?.token) {
            headers['Authorization'] = `Bearer ${authDetails.token}`;
        } else if (authType === 'apiKey' && authDetails?.key) {
            if (authDetails.in === 'header') {
                const keyName = authDetails.name || 'X-API-Key';
                headers[keyName] = authDetails.key;
            }
        }

        return headers;
    }

    /**
     * Execute API from matched endpoint
     */
    async executeFromMatch(match, userParams = {}) {
        const { api, endpoint } = match;

        // Extract parameters
        const pathParams = {};
        const queryParams = {};
        const bodyParams = {};

        // Categorize user parameters
        for (const [key, value] of Object.entries(userParams)) {
            if (endpoint.path.includes(`{${key}}`)) {
                pathParams[key] = value;
            } else if (endpoint.method === 'GET') {
                queryParams[key] = value;
            } else {
                bodyParams[key] = value;
            }
        }

        // Build URL
        const url = this.buildURL(api.baseUrl, endpoint.path, pathParams, queryParams);

        // Build headers
        const headers = this.buildHeaders(api.authType, api.authDetails, {
            'Content-Type': 'application/json'
        });

        // Build body
        const body = Object.keys(bodyParams).length > 0 ? bodyParams : null;

        // Execute
        return await this.execute({
            method: endpoint.method,
            url,
            headers,
            body
        });
    }

    /**
     * Validate parameters before execution
     */
    validateParameters(endpoint, params) {
        const errors = [];
        const warnings = [];

        // Check required path parameters
        const pathParamMatches = endpoint.path.match(/\{([^}]+)\}/g);
        if (pathParamMatches) {
            pathParamMatches.forEach(match => {
                const paramName = match.slice(1, -1);
                if (!params[paramName]) {
                    errors.push(`Missing required path parameter: ${paramName}`);
                }
            });
        }

        // Check required query/body parameters
        if (endpoint.parameters) {
            endpoint.parameters.forEach(param => {
                if (param.required && !params[param.name]) {
                    errors.push(`Missing required parameter: ${param.name}`);
                }
            });
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Generate sample parameters for testing
     */
    generateSampleParams(endpoint) {
        const params = {};

        // Path parameters
        const pathParamMatches = endpoint.path.match(/\{([^}]+)\}/g);
        if (pathParamMatches) {
            pathParamMatches.forEach(match => {
                const paramName = match.slice(1, -1);
                params[paramName] = this.getSampleValue(paramName);
            });
        }

        // Query/Body parameters
        if (endpoint.parameters) {
            endpoint.parameters.forEach(param => {
                if (param.required) {
                    params[param.name] = this.getSampleValue(param.name, param.schema);
                }
            });
        }

        return params;
    }

    /**
     * Get sample value for parameter
     */
    getSampleValue(paramName, schema = {}) {
        const nameLower = paramName.toLowerCase();

        // Common patterns
        if (nameLower.includes('id')) return '123';
        if (nameLower.includes('name')) return 'example';
        if (nameLower.includes('email')) return 'user@example.com';
        if (nameLower.includes('user')) return 'testuser';
        if (nameLower.includes('owner')) return 'octocat';
        if (nameLower.includes('repo')) return 'hello-world';
        if (nameLower.includes('city') || nameLower === 'q') return 'London';

        // Schema-based
        if (schema.type === 'integer' || schema.type === 'number') return 1;
        if (schema.type === 'boolean') return true;
        if (schema.type === 'array') return [];

        return 'value';
    }

    /**
     * Retry execution with exponential backoff
     */
    async executeWithRetry(config, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.execute(config);
                
                if (result.success) {
                    return result;
                }

                // Don't retry client errors (4xx)
                if (result.statusCode >= 400 && result.statusCode < 500) {
                    return result;
                }

                lastError = result;
            } catch (error) {
                lastError = error;
            }

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Retry ${attempt}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return {
            success: false,
            error: 'Max retries exceeded',
            lastError
        };
    }
}

module.exports = APIExecutor;
