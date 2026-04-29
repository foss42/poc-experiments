/**
 * Semantic Matcher - AI-Powered Intent Matching
 * Uses embeddings to match user queries to API endpoints
 * GSoC-Level: Replaces keyword matching with semantic understanding
 */

const fs = require('fs');
const path = require('path');

class SemanticMatcher {
    constructor() {
        this.embeddings = new Map(); // endpoint_id -> embedding vector
        this.endpointIndex = new Map(); // endpoint_id -> endpoint metadata
        this.embeddingCache = new Map(); // query -> embedding
        this.useOpenAI = process.env.OPENAI_API_KEY ? true : false;
        this.useFallback = !this.useOpenAI;
        
        console.log(`🧠 Semantic Matcher initialized (${this.useOpenAI ? 'OpenAI' : 'Fallback'} mode)`);
    }

    /**
     * Generate embedding for text using OpenAI or fallback
     */
    async generateEmbedding(text) {
        // Check cache first
        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }

        let embedding;

        if (this.useOpenAI) {
            embedding = await this.generateOpenAIEmbedding(text);
        } else {
            embedding = this.generateFallbackEmbedding(text);
        }

        // Cache the result
        this.embeddingCache.set(text, embedding);
        return embedding;
    }

    /**
     * Generate embedding using OpenAI API
     */
    async generateOpenAIEmbedding(text) {
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small', // Cheaper and faster
                    input: text
                })
            });

            const data = await response.json();
            return data.data[0].embedding;
        } catch (error) {
            console.warn('⚠️  OpenAI embedding failed, using fallback:', error.message);
            return this.generateFallbackEmbedding(text);
        }
    }

    /**
     * Fallback embedding using TF-IDF-like approach
     * Good enough for demo without external dependencies
     */
    generateFallbackEmbedding(text) {
        const normalized = text.toLowerCase().trim();
        const words = normalized.split(/\s+/);
        
        // Create a simple 128-dimensional embedding
        const embedding = new Array(128).fill(0);
        
        // Hash each word to multiple dimensions
        words.forEach(word => {
            const hash1 = this.simpleHash(word, 0) % 128;
            const hash2 = this.simpleHash(word, 1) % 128;
            const hash3 = this.simpleHash(word, 2) % 128;
            
            embedding[hash1] += 1.0;
            embedding[hash2] += 0.5;
            embedding[hash3] += 0.25;
        });
        
        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
    }

    /**
     * Simple hash function for fallback embeddings
     */
    simpleHash(str, seed = 0) {
        let hash = seed;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('Vectors must have same length');
        }

        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            mag1 += vec1[i] * vec1[i];
            mag2 += vec2[i] * vec2[i];
        }

        mag1 = Math.sqrt(mag1);
        mag2 = Math.sqrt(mag2);

        if (mag1 === 0 || mag2 === 0) return 0;
        return dotProduct / (mag1 * mag2);
    }

    /**
     * Index an endpoint for semantic search
     */
    async indexEndpoint(endpointId, endpoint, api) {
        // Create searchable text from endpoint metadata
        const searchText = this.createSearchableText(endpoint, api);
        
        // Generate embedding
        const embedding = await this.generateEmbedding(searchText);
        
        // Store in index
        this.embeddings.set(endpointId, embedding);
        this.endpointIndex.set(endpointId, {
            id: endpointId,
            api,
            endpoint,
            searchText
        });
    }

    /**
     * Create searchable text from endpoint metadata
     */
    createSearchableText(endpoint, api) {
        const parts = [
            endpoint.method,
            endpoint.path,
            endpoint.summary || '',
            endpoint.description || '',
            api.name,
            api.category || '',
            ...(endpoint.tags || [])
        ];
        
        return parts.filter(p => p).join(' ').toLowerCase();
    }

    /**
     * Semantic search for best matching endpoints
     */
    async search(query, topK = 5) {
        console.log(`🔍 Semantic search: "${query}"`);
        
        // Generate query embedding
        const queryEmbedding = await this.generateEmbedding(query);
        
        // Calculate similarity with all indexed endpoints
        const results = [];
        
        for (const [endpointId, endpointEmbedding] of this.embeddings.entries()) {
            const similarity = this.cosineSimilarity(queryEmbedding, endpointEmbedding);
            const metadata = this.endpointIndex.get(endpointId);
            
            results.push({
                endpointId,
                similarity,
                confidence: Math.round(similarity * 100),
                ...metadata
            });
        }
        
        // Sort by similarity (highest first)
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Return top K results
        const topResults = results.slice(0, topK);
        
        console.log(`✅ Found ${topResults.length} matches (best: ${topResults[0]?.confidence}%)`);
        
        return topResults;
    }

    /**
     * Hybrid search: Semantic + Keyword boosting
     */
    async hybridSearch(query, topK = 5) {
        // Get semantic results
        const semanticResults = await this.search(query, topK * 2);
        
        // Apply keyword boosting
        const queryWords = query.toLowerCase().split(/\s+/);
        
        semanticResults.forEach(result => {
            let keywordBoost = 0;
            
            // Boost if query words appear in searchable text
            queryWords.forEach(word => {
                if (result.searchText.includes(word)) {
                    keywordBoost += 0.1;
                }
            });
            
            // Boost for exact method match
            if (queryWords.includes(result.endpoint.method.toLowerCase())) {
                keywordBoost += 0.15;
            }
            
            // Apply boost
            result.similarity = Math.min(1.0, result.similarity + keywordBoost);
            result.confidence = Math.round(result.similarity * 100);
        });
        
        // Re-sort and return top K
        semanticResults.sort((a, b) => b.similarity - a.similarity);
        return semanticResults.slice(0, topK);
    }

    /**
     * Load and index all APIs from registry
     */
    async indexAllAPIs(apis) {
        console.log(`📚 Indexing ${apis.length} APIs for semantic search...`);
        
        let totalEndpoints = 0;
        
        for (const api of apis) {
            const endpoints = this.loadEndpoints(api.id);
            
            for (const endpoint of endpoints) {
                const endpointId = `${api.id}:${endpoint.method}:${endpoint.path}`;
                await this.indexEndpoint(endpointId, endpoint, api);
                totalEndpoints++;
            }
        }
        
        console.log(`✅ Indexed ${totalEndpoints} endpoints across ${apis.length} APIs`);
    }

    /**
     * Load endpoints from OpenAPI spec
     */
    loadEndpoints(apiId) {
        try {
            const openapiPath = path.join(__dirname, '..', 'apis', apiId, 'openapi.json');
            if (!fs.existsSync(openapiPath)) return [];
            
            const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
            const endpoints = [];
            
            if (!openapi.paths) return [];
            
            for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                for (const [method, methodObj] of Object.entries(pathObj)) {
                    if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
                    
                    endpoints.push({
                        path: pathStr,
                        method: method.toUpperCase(),
                        summary: methodObj.summary || '',
                        description: methodObj.description || '',
                        parameters: methodObj.parameters || [],
                        requestBody: methodObj.requestBody,
                        tags: methodObj.tags || []
                    });
                }
            }
            
            return endpoints;
        } catch (error) {
            console.error(`Failed to load endpoints for ${apiId}:`, error.message);
            return [];
        }
    }

    /**
     * Save embeddings to disk for persistence
     */
    async saveEmbeddings(filepath) {
        const data = {
            embeddings: Array.from(this.embeddings.entries()),
            index: Array.from(this.endpointIndex.entries()),
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        console.log(`💾 Saved embeddings to ${filepath}`);
    }

    /**
     * Load embeddings from disk
     */
    async loadEmbeddings(filepath) {
        if (!fs.existsSync(filepath)) {
            console.log('⚠️  No saved embeddings found');
            return false;
        }
        
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        this.embeddings = new Map(data.embeddings);
        this.endpointIndex = new Map(data.index);
        
        console.log(`✅ Loaded ${this.embeddings.size} embeddings from disk`);
        return true;
    }
}

module.exports = SemanticMatcher;
