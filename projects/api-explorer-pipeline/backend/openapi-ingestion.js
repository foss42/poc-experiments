/**
 * OpenAPI Ingestion Layer
 * GSoC-Level: Dynamic parsing and validation of OpenAPI 3.0 specs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

class OpenAPIIngestion {
    constructor(apisDir, registryPath) {
        this.apisDir = apisDir;
        this.registryPath = registryPath;
    }

    /**
     * Ingest OpenAPI spec from file or URL
     */
    async ingest(source, options = {}) {
        console.log(`📥 Ingesting OpenAPI spec from: ${source}`);

        let spec;

        // Load spec
        if (source.startsWith('http://') || source.startsWith('https://')) {
            spec = await this.loadFromURL(source);
        } else {
            spec = await this.loadFromFile(source);
        }

        // Validate spec
        const validation = this.validateSpec(spec);
        if (!validation.valid) {
            throw new Error(`Invalid OpenAPI spec: ${validation.errors.join(', ')}`);
        }

        // Parse and normalize
        const parsed = this.parseSpec(spec);

        // Generate unique ID
        const apiId = options.id || this.generateAPIId(parsed.info.title);

        // Save to registry
        await this.saveToRegistry(apiId, parsed, spec);

        console.log(`✅ Ingested API: ${parsed.info.title} (${apiId})`);

        return {
            id: apiId,
            name: parsed.info.title,
            version: parsed.info.version,
            endpoints: parsed.endpoints.length
        };
    }

    /**
     * Load spec from URL
     */
    async loadFromURL(url) {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('yaml') || url.endsWith('.yaml') || url.endsWith('.yml')) {
            const text = await response.text();
            return yaml.load(text);
        } else {
            return await response.json();
        }
    }

    /**
     * Load spec from file
     */
    async loadFromFile(filepath) {
        const content = fs.readFileSync(filepath, 'utf8');

        if (filepath.endsWith('.yaml') || filepath.endsWith('.yml')) {
            return yaml.load(content);
        } else {
            return JSON.parse(content);
        }
    }

    /**
     * Validate OpenAPI spec
     */
    validateSpec(spec) {
        const errors = [];

        // Check OpenAPI version
        if (!spec.openapi || !spec.openapi.startsWith('3.')) {
            errors.push('Only OpenAPI 3.x is supported');
        }

        // Check required fields
        if (!spec.info) errors.push('Missing info object');
        if (!spec.info?.title) errors.push('Missing info.title');
        if (!spec.paths) errors.push('Missing paths object');

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Parse OpenAPI spec into internal format
     */
    parseSpec(spec) {
        const info = {
            title: spec.info.title,
            description: spec.info.description || '',
            version: spec.info.version || '1.0.0',
            contact: spec.info.contact || null
        };

        // Extract base URL from servers
        const baseUrl = spec.servers?.[0]?.url || '';

        // Parse authentication
        const auth = this.parseAuth(spec);

        // Parse endpoints
        const endpoints = this.parseEndpoints(spec.paths);

        // Extract tags/categories
        const tags = spec.tags?.map(t => t.name) || [];
        const category = this.inferCategory(info.title, tags);

        return {
            info,
            baseUrl,
            auth,
            endpoints,
            tags,
            category
        };
    }

    /**
     * Parse authentication from security schemes
     */
    parseAuth(spec) {
        if (!spec.components?.securitySchemes) {
            return { type: 'none' };
        }

        const schemes = spec.components.securitySchemes;
        const firstScheme = Object.values(schemes)[0];

        if (!firstScheme) {
            return { type: 'none' };
        }

        if (firstScheme.type === 'http' && firstScheme.scheme === 'bearer') {
            return {
                type: 'bearer',
                description: firstScheme.description || 'Bearer token authentication'
            };
        }

        if (firstScheme.type === 'apiKey') {
            return {
                type: 'apiKey',
                in: firstScheme.in,
                name: firstScheme.name,
                description: firstScheme.description || 'API key authentication'
            };
        }

        if (firstScheme.type === 'oauth2') {
            return {
                type: 'oauth2',
                flows: firstScheme.flows,
                description: firstScheme.description || 'OAuth2 authentication'
            };
        }

        return { type: 'none' };
    }

    /**
     * Parse all endpoints from paths
     */
    parseEndpoints(paths) {
        const endpoints = [];

        for (const [pathStr, pathObj] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(pathObj)) {
                if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
                    continue;
                }

                endpoints.push({
                    method: method.toUpperCase(),
                    path: pathStr,
                    operationId: operation.operationId || null,
                    summary: operation.summary || '',
                    description: operation.description || '',
                    tags: operation.tags || [],
                    parameters: this.parseParameters(operation.parameters || []),
                    requestBody: this.parseRequestBody(operation.requestBody),
                    responses: this.parseResponses(operation.responses || {}),
                    deprecated: operation.deprecated || false
                });
            }
        }

        return endpoints;
    }

    /**
     * Parse parameters
     */
    parseParameters(parameters) {
        return parameters.map(param => ({
            name: param.name,
            in: param.in,
            required: param.required || false,
            description: param.description || '',
            schema: param.schema || {},
            example: param.example || null
        }));
    }

    /**
     * Parse request body
     */
    parseRequestBody(requestBody) {
        if (!requestBody) return null;

        const content = requestBody.content?.['application/json'];
        if (!content) return null;

        return {
            required: requestBody.required || false,
            description: requestBody.description || '',
            schema: content.schema || {},
            example: content.example || null
        };
    }

    /**
     * Parse responses
     */
    parseResponses(responses) {
        const parsed = {};

        for (const [statusCode, response] of Object.entries(responses)) {
            const content = response.content?.['application/json'];
            
            parsed[statusCode] = {
                description: response.description || '',
                schema: content?.schema || null,
                example: content?.example || null
            };
        }

        return parsed;
    }

    /**
     * Infer category from title and tags
     */
    inferCategory(title, tags) {
        const titleLower = title.toLowerCase();
        const allTags = tags.join(' ').toLowerCase();

        if (titleLower.includes('ai') || titleLower.includes('gpt') || titleLower.includes('openai')) {
            return 'AI';
        }
        if (titleLower.includes('weather') || titleLower.includes('forecast')) {
            return 'Weather';
        }
        if (titleLower.includes('finance') || titleLower.includes('payment') || titleLower.includes('bank')) {
            return 'Finance';
        }
        if (titleLower.includes('social') || titleLower.includes('twitter') || titleLower.includes('facebook')) {
            return 'Social';
        }
        if (titleLower.includes('github') || titleLower.includes('gitlab')) {
            return 'Developer Tools';
        }

        return 'General';
    }

    /**
     * Generate unique API ID
     */
    generateAPIId(title) {
        const hash = crypto.createHash('md5')
            .update(title + Date.now())
            .digest('hex')
            .substring(0, 12);
        return hash;
    }

    /**
     * Save to registry
     */
    async saveToRegistry(apiId, parsed, originalSpec) {
        // Create API directory
        const apiDir = path.join(this.apisDir, apiId);
        if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
        }

        // Save original OpenAPI spec
        fs.writeFileSync(
            path.join(apiDir, 'openapi.json'),
            JSON.stringify(originalSpec, null, 2)
        );

        // Save metadata
        const metadata = {
            id: apiId,
            name: parsed.info.title,
            description: parsed.info.description,
            version: parsed.info.version,
            baseUrl: parsed.baseUrl,
            authType: parsed.auth.type,
            authDetails: parsed.auth,
            category: parsed.category,
            tags: parsed.tags,
            endpointCount: parsed.endpoints.length,
            ingested: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(apiDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        // Update global registry
        await this.updateGlobalRegistry(metadata);

        console.log(`💾 Saved to registry: ${apiDir}`);
    }

    /**
     * Update global registry index
     */
    async updateGlobalRegistry(metadata) {
        let registry = { apis: [] };

        if (fs.existsSync(this.registryPath)) {
            registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        }

        // Remove existing entry if present
        registry.apis = registry.apis.filter(api => api.id !== metadata.id);

        // Add new entry
        registry.apis.push(metadata);

        // Save
        fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
    }

    /**
     * Batch ingest multiple specs
     */
    async batchIngest(sources) {
        console.log(`📦 Batch ingesting ${sources.length} APIs...`);

        const results = [];

        for (const source of sources) {
            try {
                const result = await this.ingest(source);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({
                    success: false,
                    source,
                    error: error.message
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        console.log(`✅ Batch complete: ${successful}/${sources.length} successful`);

        return results;
    }

    /**
     * Remove API from registry
     */
    async remove(apiId) {
        const apiDir = path.join(this.apisDir, apiId);

        if (fs.existsSync(apiDir)) {
            fs.rmSync(apiDir, { recursive: true });
        }

        // Update global registry
        if (fs.existsSync(this.registryPath)) {
            const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
            registry.apis = registry.apis.filter(api => api.id !== apiId);
            fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
        }

        console.log(`🗑️  Removed API: ${apiId}`);
    }
}

module.exports = OpenAPIIngestion;
