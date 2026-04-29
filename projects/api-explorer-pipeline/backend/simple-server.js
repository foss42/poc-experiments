const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

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

// Get all APIs
app.get('/apis', (req, res) => {
    try {
        const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
        
        if (fs.existsSync(registryPath)) {
            const data = fs.readFileSync(registryPath, 'utf8');
            const globalIndex = JSON.parse(data);
            
            let apis = globalIndex.apis || [];
            
            // Apply category filter if provided
            const { category } = req.query;
            if (category && category !== '') {
                apis = apis.filter(api => 
                    api.category && api.category.toLowerCase() === category.toLowerCase()
                );
            }
            
            // Get unique categories for frontend
            const allCategories = [...new Set(
                (globalIndex.apis || [])
                    .map(api => api.category)
                    .filter(cat => cat)
            )].sort();
            
            res.json({
                success: true,
                count: apis.length,
                totalCount: globalIndex.apis?.length || 0,
                apis: apis,
                categories: allCategories,
                appliedFilter: category || null,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: true,
                count: 0,
                totalCount: 0,
                apis: [],
                categories: [],
                message: 'No registry file found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load APIs',
            message: error.message
        });
    }
});

// Get available categories
app.get('/categories', (req, res) => {
    try {
        const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
        
        if (fs.existsSync(registryPath)) {
            const data = fs.readFileSync(registryPath, 'utf8');
            const globalIndex = JSON.parse(data);
            
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
        } else {
            res.json({
                success: true,
                categories: [],
                stats: {},
                total: 0
            });
        }
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

// Get API details with endpoints
app.get('/apis/:id/details', (req, res) => {
    try {
        const { id } = req.params;
        
        // Load OpenAPI spec
        const openapiPath = path.join(__dirname, '..', 'apis', id, 'openapi.json');
        if (!fs.existsSync(openapiPath)) {
            return res.status(404).json({
                success: false,
                error: 'API specification not found'
            });
        }
        
        const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
        
        // Extract endpoints
        const endpoints = [];
        if (openapi.paths) {
            for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                for (const [method, methodObj] of Object.entries(pathObj)) {
                    if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                        endpoints.push({
                            path: pathStr,
                            method: method.toUpperCase(),
                            summary: methodObj.summary || `${method.toUpperCase()} ${pathStr}`,
                            description: methodObj.description || '',
                            tags: methodObj.tags || [],
                            parameters: methodObj.parameters || [],
                            requestBody: methodObj.requestBody || null
                        });
                    }
                }
            }
        }
        
        res.json({
            success: true,
            id: id,
            spec: openapi,
            endpoints: endpoints,
            endpointCount: endpoints.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load API details',
            message: error.message
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
        
        console.log(`[AGENT-SEARCH] Query: "${query}"`);
        
        // Load registry
        const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
        if (!fs.existsSync(registryPath)) {
            return res.status(500).json({
                success: false,
                error: 'Registry not found'
            });
        }
        
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const apis = registry.apis || [];
        
        // Simple keyword matching
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        
        let matches = [];
        
        for (const api of apis) {
            const apiPath = path.join(__dirname, '..', 'apis', api.id, 'openapi.json');
            if (!fs.existsSync(apiPath)) continue;
            
            const openapi = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
            
            if (openapi.paths) {
                for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                    for (const [method, methodObj] of Object.entries(pathObj)) {
                        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;
                        
                        const summary = (methodObj.summary || '').toLowerCase();
                        const description = (methodObj.description || '').toLowerCase();
                        const searchText = `${api.name} ${pathStr} ${method} ${summary} ${description}`.toLowerCase();
                        
                        // Calculate match score
                        let score = 0;
                        for (const word of queryWords) {
                            if (searchText.includes(word)) {
                                score += 1;
                            }
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
        }
        
        // Sort by score and return top 3
        matches.sort((a, b) => b.score - a.score);
        const topMatches = matches.slice(0, 3);
        
        if (topMatches.length > 0) {
            res.json({
                success: true,
                query: query,
                matches: topMatches,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: false,
                query: query,
                message: 'No matching endpoints found',
                suggestion: 'Try queries like "get users", "create pet", "list items"',
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('[AGENT-SEARCH] Error:', error);
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
        
        console.log(`[AGENT] Query: "${query}"`);
        
        // Load registry
        const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
        if (!fs.existsSync(registryPath)) {
            return res.status(500).json({
                success: false,
                error: 'Registry not found'
            });
        }
        
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const apis = registry.apis || [];
        
        // Simple keyword matching
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        
        let matches = [];
        
        for (const api of apis) {
            const apiPath = path.join(__dirname, '..', 'apis', api.id, 'openapi.json');
            if (!fs.existsSync(apiPath)) continue;
            
            const openapi = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
            
            if (openapi.paths) {
                for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                    for (const [method, methodObj] of Object.entries(pathObj)) {
                        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;
                        
                        const summary = (methodObj.summary || '').toLowerCase();
                        const description = (methodObj.description || '').toLowerCase();
                        const searchText = `${api.name} ${pathStr} ${method} ${summary} ${description}`.toLowerCase();
                        
                        // Calculate match score
                        let score = 0;
                        for (const word of queryWords) {
                            if (searchText.includes(word)) {
                                score += 1;
                            }
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
        }
        
        // Sort by score and return top 3
        matches.sort((a, b) => b.score - a.score);
        const topMatches = matches.slice(0, 3);
        
        if (topMatches.length > 0) {
            res.json({
                success: true,
                query: query,
                matches: topMatches,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: false,
                query: query,
                message: 'No matching endpoints found',
                suggestion: 'Try queries like "get users", "create pet", "list items"',
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('[AGENT] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Query processing failed',
            message: error.message
        });
    }
});

// Agent execute endpoint - simulate API execution
app.post('/agent/execute', async (req, res) => {
    try {
        const { apiId, endpoint, testData } = req.body;
        
        if (!apiId || !endpoint) {
            return res.status(400).json({
                success: false,
                error: 'apiId and endpoint are required'
            });
        }
        
        console.log(`[EXECUTE] ${endpoint.method} ${endpoint.path}`);
        
        // Load API metadata
        const metadataPath = path.join(__dirname, '..', 'apis', apiId, 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            return res.status(404).json({
                success: false,
                error: 'API metadata not found'
            });
        }
        
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const baseUrl = metadata.baseUrl || 'https://api.example.com';
        const fullUrl = baseUrl + endpoint.path;
        
        // Build request
        const requestOptions = {
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'API-Explorer/1.0'
            }
        };
        
        // Add auth headers
        if (metadata.authType === 'apiKey') {
            const keyName = metadata.authDetails?.name || 'X-API-Key';
            requestOptions.headers[keyName] = 'DEMO_KEY';
        } else if (metadata.authType === 'bearer') {
            requestOptions.headers['Authorization'] = 'Bearer DEMO_TOKEN';
        }
        
        // Add body for POST/PUT
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            requestOptions.body = JSON.stringify(testData || { id: 1, name: 'Test' });
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const startTime = Date.now();
            const response = await fetch(fullUrl, {
                ...requestOptions,
                signal: controller.signal
            });
            const endTime = Date.now();
            
            clearTimeout(timeoutId);
            
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
            
            res.json({
                success: true,
                request: {
                    url: fullUrl,
                    method: endpoint.method,
                    headers: requestOptions.headers
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    data: responseData,
                    time: endTime - startTime
                }
            });
            
        } catch (fetchError) {
            res.status(500).json({
                success: false,
                error: 'Request failed',
                message: fetchError.message
            });
        }
        
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
    console.log(`🚀 Server URL: http://localhost:${PORT}`);
    console.log(`📚 APIs loaded from registry`);
    console.log(`🤖 Agent endpoints available`);
});
