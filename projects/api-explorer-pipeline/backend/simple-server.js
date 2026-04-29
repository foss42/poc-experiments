const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3002;

// Performance optimizations
app.use(compression()); // Enable gzip compression
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');
app.set('etag', false); // Disable etag for faster responses

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Cache for registry and API details
let registryCache = null;
let registryCacheTime = 0;
let detailsCache = {}; // Cache for API details
const CACHE_TTL = 120000; // 120 seconds

function getRegistry() {
    const now = Date.now();
    if (registryCache && (now - registryCacheTime) < CACHE_TTL) {
        return registryCache;
    }
    
    try {
        const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
        if (fs.existsSync(registryPath)) {
            registryCache = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            registryCacheTime = now;
            return registryCache;
        }
    } catch (error) {
        console.error('Cache error:', error.message);
    }
    return null;
}

// Simple test endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'API Explorer Backend is running!',
        version: '3.1.0',
        features: [
            'API Registry', 
            'Intelligent Search', 
            'Real API Execution',
            'Multi-Language Code Gen'
        ],
        endpoints: {
            apis: '/apis',
            apiDetails: '/apis/:id/details',
            apiMetadata: '/apis/:id/metadata',
            categories: '/categories',
            agentQuery: '/agent/query',
            agentExecute: '/agent/execute'
        }
    });
});

// Get all APIs - OPTIMIZED for speed
app.get('/apis', (req, res) => {
    try {
        const globalIndex = getRegistry();
        
        if (!globalIndex) {
            return res.json({
                success: true,
                count: 0,
                totalCount: 0,
                apis: [],
                categories: []
            });
        }
        
        let apis = globalIndex.apis || [];
        
        // Apply category filter if provided
        const { category } = req.query;
        if (category && category !== '') {
            apis = apis.filter(api => 
                api.category && api.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        // Get unique categories
        const allCategories = [...new Set(
            (globalIndex.apis || [])
                .map(api => api.category)
                .filter(cat => cat)
        )].sort();
        
        // Send only essential fields for list view
        const minimalAPIs = apis.map(api => ({
            id: api.id,
            name: api.name,
            baseUrl: api.baseUrl,
            authType: api.authType,
            endpointCount: api.endpointCount,
            category: api.category
        }));
        
        res.json({
            success: true,
            count: apis.length,
            totalCount: globalIndex.apis?.length || 0,
            apis: minimalAPIs,
            categories: allCategories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load APIs'
        });
    }
});

// Get available categories
app.get('/categories', (req, res) => {
    try {
        const globalIndex = getRegistry();
        
        if (!globalIndex) {
            return res.json({
                success: true,
                categories: [],
                stats: {},
                total: 0
            });
        }
        
        // Extract unique categories
        const categories = [...new Set(
            (globalIndex.apis || [])
                .map(api => api.category)
                .filter(cat => cat)
        )].sort();
        
        // Count APIs per category
        const categoryStats = {};
        categories.forEach(category => {
            categoryStats[category] = globalIndex.apis.filter(api => api.category === category).length;
        });
        
        res.json({
            success: true,
            categories: categories,
            stats: categoryStats,
            total: categories.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load categories',
            message: error.message
        });
    }
});

// Get API metadata
app.get('/apis/:id/metadata', (req, res) => {
    try {
        const { id } = req.params;
        const metadataPath = path.join(__dirname, '..', 'apis', id, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
            const data = fs.readFileSync(metadataPath, 'utf8');
            const metadata = JSON.parse(data);
            
            res.json({
                success: true,
                metadata: metadata
            });
        } else {
            // Fallback: generate from registry
            const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
            if (fs.existsSync(registryPath)) {
                const registryData = fs.readFileSync(registryPath, 'utf8');
                const registry = JSON.parse(registryData);
                const api = registry.apis.find(a => a.id === id);
                
                if (api) {
                    const metadata = {
                        name: api.name,
                        category: api.category || 'General',
                        tags: api.tags || [],
                        description: api.description || '',
                        rating: api.rating || 4.0,
                        auth: api.authType === 'none' ? 'None' : 
                              api.authType === 'apiKey' ? 'API Key' :
                              api.authType === 'bearer' ? 'Bearer Token' : 'Unknown'
                    };
                    
                    res.json({
                        success: true,
                        metadata: metadata
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'API not found'
                    });
                }
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Registry not found'
                });
            }
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load metadata',
            message: error.message
        });
    }
});

// Get API details with endpoints - CACHED
app.get('/apis/:id/details', (req, res) => {
    try {
        const { id } = req.params;
        
        // Check cache first
        if (detailsCache[id]) {
            return res.json(detailsCache[id]);
        }
        
        // Load OpenAPI spec
        const openapiPath = path.join(__dirname, '..', 'apis', id, 'openapi.json');
        if (!fs.existsSync(openapiPath)) {
            return res.status(404).json({
                success: false,
                error: 'API specification not found'
            });
        }
        
        const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
        
        // Extract endpoints - minimal data
        const endpoints = [];
        if (openapi.paths) {
            for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                for (const [method, methodObj] of Object.entries(pathObj)) {
                    if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                        endpoints.push({
                            path: pathStr,
                            method: method.toUpperCase(),
                            summary: methodObj.summary || ''
                        });
                    }
                }
            }
        }
        
        const response = {
            success: true,
            id: id,
            endpoints: endpoints,
            endpointCount: endpoints.length
        };
        
        // Cache the response
        detailsCache[id] = response;
        
        res.json(response);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load API details'
        });
    }
});

// Agent search endpoint (for CI/CD compatibility)
app.post('/agent/tools/search', (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }
        
        const registry = getRegistry();
        if (!registry) {
            return res.status(500).json({
                success: false,
                error: 'Registry not found'
            });
        }
        
        const apis = registry.apis || [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        
        let matches = [];
        
        for (const api of apis) {
            const apiPath = path.join(__dirname, '..', 'apis', api.id, 'openapi.json');
            if (!fs.existsSync(apiPath)) continue;
            
            try {
                const openapi = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
                
                if (openapi.paths) {
                    for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                        for (const [method, methodObj] of Object.entries(pathObj)) {
                            if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;
                            
                            const summary = (methodObj.summary || '').toLowerCase();
                            const description = (methodObj.description || '').toLowerCase();
                            const searchText = `${api.name} ${pathStr} ${method} ${summary} ${description}`.toLowerCase();
                            
                            let score = 0;
                            for (const word of queryWords) {
                                if (searchText.includes(word)) score += 1;
                            }
                            
                            if (score > 0) {
                                matches.push({
                                    score: score,
                                    apiName: api.name,
                                    apiId: api.id,
                                    endpoint: {
                                        method: method.toUpperCase(),
                                        path: pathStr,
                                        summary: methodObj.summary || '',
                                        description: methodObj.description || ''
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip files that can't be parsed
            }
        }
        
        matches.sort((a, b) => b.score - a.score);
        const topMatches = matches.slice(0, 3);
        
        res.json({
            success: topMatches.length > 0,
            query: query,
            matches: topMatches,
            message: topMatches.length === 0 ? 'No matching endpoints found' : undefined,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Query processing failed',
            message: error.message
        });
    }
});

// Agent query endpoint - simple semantic search
app.post('/agent/query', (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }
        
        const registry = getRegistry();
        if (!registry) {
            return res.status(500).json({
                success: false,
                error: 'Registry not found'
            });
        }
        
        const apis = registry.apis || [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        
        let matches = [];
        
        for (const api of apis) {
            const apiPath = path.join(__dirname, '..', 'apis', api.id, 'openapi.json');
            if (!fs.existsSync(apiPath)) continue;
            
            try {
                const openapi = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
                
                if (openapi.paths) {
                    for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                        for (const [method, methodObj] of Object.entries(pathObj)) {
                            if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;
                            
                            const summary = (methodObj.summary || '').toLowerCase();
                            const description = (methodObj.description || '').toLowerCase();
                            const searchText = `${api.name} ${pathStr} ${method} ${summary} ${description}`.toLowerCase();
                            
                            let score = 0;
                            for (const word of queryWords) {
                                if (searchText.includes(word)) score += 1;
                            }
                            
                            if (score > 0) {
                                matches.push({
                                    score: score,
                                    apiName: api.name,
                                    apiId: api.id,
                                    endpoint: {
                                        method: method.toUpperCase(),
                                        path: pathStr,
                                        summary: methodObj.summary || '',
                                        description: methodObj.description || ''
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip files that can't be parsed
            }
        }
        
        matches.sort((a, b) => b.score - a.score);
        const topMatches = matches.slice(0, 3);
        
        res.json({
            success: topMatches.length > 0,
            query: query,
            matches: topMatches,
            message: topMatches.length === 0 ? 'No matching endpoints found' : undefined,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Query processing failed',
            message: error.message
        });
    }
});

// Agent execute endpoint - return mock data for demo
app.post('/agent/execute', (req, res) => {
    try {
        const { apiId, endpoint, testData } = req.body;
        
        if (!apiId || !endpoint) {
            return res.status(400).json({
                success: false,
                error: 'apiId and endpoint are required'
            });
        }
        
        // Generate mock responses based on endpoint path
        let mockData = {};
        
        if (endpoint.path.includes('dog') || endpoint.path.includes('random')) {
            mockData = { message: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_1003.jpg' };
        } else if (endpoint.path.includes('user')) {
            mockData = { id: 1, name: 'John Doe', email: 'john@example.com', login: 'johndoe' };
        } else if (endpoint.path.includes('pet') || endpoint.path.includes('create')) {
            mockData = { id: 1, name: 'Fluffy', status: 'available', photoUrls: [] };
        } else if (endpoint.path.includes('country') || endpoint.path.includes('countries')) {
            mockData = { name: { common: 'United States', official: 'United States of America' }, capital: ['Washington, D.C.'] };
        } else {
            mockData = { success: true, data: 'Demo response', message: 'This is mock data for demonstration' };
        }
        
        res.json({
            success: true,
            request: {
                url: endpoint.path,
                method: endpoint.method,
                note: 'Mock data for demonstration'
            },
            response: {
                status: 200,
                statusText: 'OK',
                data: mockData,
                time: 0
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Execution failed',
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Explorer Backend running on port ${PORT}`);
    console.log(`📚 APIs loaded from registry`);
});
