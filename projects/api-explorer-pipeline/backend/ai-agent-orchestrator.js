/**
 * AI Agent Orchestrator - GSoC-Level Complete System
 * Combines semantic search, execution, and code generation
 */

const SemanticMatcher = require('./semantic-matcher');
const APIExecutor = require('./api-executor');
const CodeGenerator = require('./code-generator');
const fs = require('fs');
const path = require('path');

class AIAgentOrchestrator {
    constructor(registryPath) {
        this.registryPath = registryPath;
        this.semanticMatcher = new SemanticMatcher();
        this.executor = new APIExecutor();
        this.codeGenerator = new CodeGenerator();
        this.apis = [];
        this.initialized = false;
    }

    /**
     * Initialize the orchestrator
     */
    async initialize() {
        if (this.initialized) return;

        console.log('🚀 Initializing AI Agent Orchestrator...');

        // Load APIs from registry
        await this.loadAPIs();

        // Try to load cached embeddings
        const embeddingsPath = path.join(path.dirname(this.registryPath), 'embeddings.json');
        const loaded = await this.semanticMatcher.loadEmbeddings(embeddingsPath);

        // If no cache, index all APIs
        if (!loaded) {
            await this.semanticMatcher.indexAllAPIs(this.apis);
            await this.semanticMatcher.saveEmbeddings(embeddingsPath);
        }

        this.initialized = true;
        console.log('✅ AI Agent Orchestrator ready');
    }

    /**
     * Load APIs from registry
     */
    async loadAPIs() {
        if (!fs.existsSync(this.registryPath)) {
            console.warn('⚠️  Registry not found');
            this.apis = [];
            return;
        }

        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        this.apis = registry.apis || [];
        console.log(`📚 Loaded ${this.apis.length} APIs from registry`);
    }

    /**
     * Process user query - Main entry point
     */
    async processQuery(query, options = {}) {
        await this.initialize();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🤖 Processing query: "${query}"`);
        console.log('='.repeat(60));

        const startTime = Date.now();

        try {
            // Step 1: Semantic matching
            const matches = await this.semanticMatcher.hybridSearch(query, options.topK || 5);

            if (matches.length === 0) {
                return {
                    success: false,
                    error: 'No matching API found',
                    suggestions: this.generateSuggestions()
                };
            }

            const bestMatch = matches[0];
            console.log(`✅ Best match: ${bestMatch.api.name} - ${bestMatch.endpoint.method} ${bestMatch.endpoint.path} (${bestMatch.confidence}%)`);

            // Step 2: Extract intent and parameters
            const intent = this.extractIntent(query);
            const params = options.params || this.extractParameters(query, bestMatch);

            // Step 3: Generate code snippets
            const url = this.executor.buildURL(
                bestMatch.api.baseUrl,
                bestMatch.endpoint.path,
                params.path,
                params.query
            );

            const headers = this.executor.buildHeaders(
                bestMatch.api.authType,
                bestMatch.api.authDetails
            );

            const codeConfig = {
                method: bestMatch.endpoint.method,
                url,
                headers,
                body: params.body
            };

            const code = {
                curl: this.codeGenerator.generate('curl', codeConfig),
                python: this.codeGenerator.generate('python', codeConfig),
                javascript: this.codeGenerator.generate('javascript', codeConfig),
                node: this.codeGenerator.generate('node', codeConfig)
            };

            // Step 4: Execute if requested
            let execution = null;
            if (options.execute) {
                console.log('🚀 Executing API request...');
                execution = await this.executor.executeFromMatch(bestMatch, {
                    ...params.path,
                    ...params.query,
                    ...params.body
                });
            }

            const duration = Date.now() - startTime;

            // Step 5: Build response
            const response = {
                success: true,
                query,
                intent,
                match: {
                    api: bestMatch.api.name,
                    apiId: bestMatch.api.id,
                    endpoint: bestMatch.endpoint.path,
                    method: bestMatch.endpoint.method,
                    summary: bestMatch.endpoint.summary,
                    confidence: bestMatch.confidence
                },
                parameters: params,
                code,
                execution,
                alternatives: matches.slice(1, 4).map(m => ({
                    api: m.api.name,
                    endpoint: `${m.endpoint.method} ${m.endpoint.path}`,
                    confidence: m.confidence
                })),
                metadata: {
                    duration,
                    timestamp: new Date().toISOString(),
                    totalMatches: matches.length
                }
            };

            console.log(`✅ Query processed in ${duration}ms`);
            return response;

        } catch (error) {
            console.error('❌ Query processing failed:', error);
            return {
                success: false,
                error: error.message,
                query
            };
        }
    }

    /**
     * Extract intent from query
     */
    extractIntent(query) {
        const queryLower = query.toLowerCase();
        const words = queryLower.split(/\s+/);

        // Detect HTTP method
        const methodMap = {
            'get': ['get', 'fetch', 'retrieve', 'list', 'show', 'find', 'search', 'view'],
            'post': ['create', 'add', 'new', 'insert', 'post', 'submit', 'register'],
            'put': ['update', 'edit', 'modify', 'change', 'put', 'replace'],
            'delete': ['delete', 'remove', 'destroy', 'drop', 'clear'],
            'patch': ['patch', 'partial']
        };

        let method = 'GET';
        for (const [httpMethod, keywords] of Object.entries(methodMap)) {
            if (keywords.some(kw => words.includes(kw))) {
                method = httpMethod.toUpperCase();
                break;
            }
        }

        // Extract resource
        const commonResources = [
            'user', 'users', 'pet', 'pets', 'product', 'products',
            'order', 'orders', 'repo', 'repos', 'repository',
            'weather', 'forecast', 'image', 'images'
        ];

        let resource = null;
        for (const word of words) {
            if (commonResources.includes(word)) {
                resource = word;
                break;
            }
        }

        return {
            method,
            resource,
            action: method.toLowerCase(),
            query: queryLower
        };
    }

    /**
     * Extract parameters from query
     */
    extractParameters(query, match) {
        const params = {
            path: {},
            query: {},
            body: {}
        };

        // Generate sample parameters
        const sampleParams = this.executor.generateSampleParams(match.endpoint);

        // Categorize parameters
        for (const [key, value] of Object.entries(sampleParams)) {
            if (match.endpoint.path.includes(`{${key}}`)) {
                params.path[key] = value;
            } else if (match.endpoint.method === 'GET') {
                params.query[key] = value;
            } else {
                params.body[key] = value;
            }
        }

        // Try to extract specific values from query
        const queryWords = query.split(/\s+/);
        
        // Extract location/city
        const locationIndicators = ['in', 'at', 'for', 'near'];
        for (let i = 0; i < queryWords.length; i++) {
            if (locationIndicators.includes(queryWords[i].toLowerCase()) && i + 1 < queryWords.length) {
                const location = queryWords[i + 1];
                if (params.query.q !== undefined) params.query.q = location;
                if (params.query.city !== undefined) params.query.city = location;
            }
        }

        return params;
    }

    /**
     * Generate suggestions for failed queries
     */
    generateSuggestions() {
        const suggestions = [
            'get users',
            'create pet',
            'get weather in London',
            'list repositories',
            'get random dog image'
        ];

        return suggestions;
    }

    /**
     * Execute API directly (without query matching)
     */
    async executeAPI(apiId, endpointPath, method, params = {}) {
        await this.initialize();

        const api = this.apis.find(a => a.id === apiId);
        if (!api) {
            throw new Error(`API not found: ${apiId}`);
        }

        const endpoints = this.semanticMatcher.loadEndpoints(apiId);
        const endpoint = endpoints.find(e => 
            e.path === endpointPath && e.method === method.toUpperCase()
        );

        if (!endpoint) {
            throw new Error(`Endpoint not found: ${method} ${endpointPath}`);
        }

        const match = { api, endpoint };
        return await this.executor.executeFromMatch(match, params);
    }

    /**
     * Get API statistics
     */
    async getStats() {
        await this.initialize();

        const totalEndpoints = this.apis.reduce((sum, api) => sum + (api.endpointCount || 0), 0);

        const categories = {};
        this.apis.forEach(api => {
            const cat = api.category || 'General';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        return {
            totalAPIs: this.apis.length,
            totalEndpoints,
            categories,
            indexed: this.semanticMatcher.embeddings.size,
            cacheSize: this.semanticMatcher.embeddingCache.size
        };
    }

    /**
     * Reindex all APIs (useful after adding new APIs)
     */
    async reindex() {
        console.log('🔄 Reindexing all APIs...');
        
        await this.loadAPIs();
        
        // Clear existing embeddings
        this.semanticMatcher.embeddings.clear();
        this.semanticMatcher.endpointIndex.clear();
        
        // Reindex
        await this.semanticMatcher.indexAllAPIs(this.apis);
        
        // Save
        const embeddingsPath = path.join(path.dirname(this.registryPath), 'embeddings.json');
        await this.semanticMatcher.saveEmbeddings(embeddingsPath);
        
        console.log('✅ Reindexing complete');
    }

    /**
     * Search APIs (without execution)
     */
    async search(query, topK = 5) {
        await this.initialize();
        return await this.semanticMatcher.hybridSearch(query, topK);
    }
}

module.exports = AIAgentOrchestrator;
