const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const AgentTools = require('./agent_tools');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Initialize Agent Tools
const agentTools = new AgentTools();

// Simple test endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'API Explorer Backend is running!',
        version: '2.0.0',
        features: ['API Registry', 'AI Agent Tools', 'MCP Integration'],
        endpoints: {
            apis: '/apis',
            agentSearch: '/agent/tools/search',
            agentList: '/agent/tools/list',
            agentExecute: '/agent/tools/execute',
            legacyQuery: '/agent/query'
        }
    });
});

// ===== NEW MCP-STYLE AGENT ENDPOINTS =====

/**
 * MCP-Style Agent Search Endpoint
 * POST /agent/tools/search
 * Input: { "query": "get users" }
 * Output: Structured API matches with templates
 */
app.post('/agent/tools/search', (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid input',
                message: 'Query parameter is required and must be a string',
                example: { query: "get users" }
            });
        }

        console.log(`🔍 [MCP-SEARCH] Query: "${query}"`);
        
        // Reload APIs to get latest data
        agentTools.loadAPIs();
        
        // Search for matches
        const result = agentTools.searchAPIs(query);
        
        // Format response for MCP compatibility
        if (result.success && result.results && result.results.length > 0) {
            const bestMatch = result.results[0];
            
            res.json({
                success: true,
                query: result.query,
                intent: result.intent,
                entity: result.entity,
                confidence: Math.round(bestMatch.score * 100),
                api: bestMatch.api,
                endpoint: {
                    method: bestMatch.endpoint.method,
                    path: bestMatch.endpoint.path,
                    summary: bestMatch.endpoint.summary || `${bestMatch.endpoint.method} ${bestMatch.endpoint.path}`
                },
                authType: bestMatch.authType,
                baseUrl: bestMatch.baseUrl,
                templates: {
                    curl: bestMatch.templates?.curl || `curl -X ${bestMatch.endpoint.method} "${bestMatch.baseUrl}${bestMatch.endpoint.path}"`,
                    powershell: bestMatch.templates?.powershell || `Invoke-RestMethod -Uri "${bestMatch.baseUrl}${bestMatch.endpoint.path}" -Method ${bestMatch.endpoint.method}`
                },
                results: result.results,  // Include full results array
                alternatives: result.results.slice(1, 3).map(match => ({
                    api: match.api,
                    endpoint: `${match.endpoint.method} ${match.endpoint.path}`,
                    confidence: Math.round(match.score * 100)
                })),
                totalFound: result.totalFound,
                responseTime: result.responseTime
            });
        } else {
            res.json({
                success: false,
                query: result.query || query,
                intent: result.intent || 'unknown',
                entity: result.entity || 'unknown',
                message: result.message || 'No matching APIs found',
                suggestions: [
                    "get users", "create user", "update user", "delete user",
                    "get pets", "create pet", "list products"
                ],
                responseTime: result.responseTime || 0
            });
        }
        
    } catch (error) {
        console.error('❌ [MCP-SEARCH] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message
        });
    }
});

/**
 * MCP-Style Agent List Endpoint
 * POST /agent/tools/list
 * Returns all APIs and endpoints in structured format
 */
app.post('/agent/tools/list', (req, res) => {
    try {
        console.log('📋 [MCP-LIST] Listing all APIs and endpoints');
        
        // Reload APIs to get latest data
        agentTools.loadAPIs();
        
        // Get all APIs and endpoints
        const result = agentTools.listAllAPIs();
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ [MCP-LIST] Error:', error);
        res.status(500).json({
            success: false,
            error: 'List failed',
            message: error.message
        });
    }
});

/**
 * MCP-Style Agent Execute Endpoint
 * POST /agent/tools/execute
 * Simulates API execution with mock responses
 */
app.post('/agent/tools/execute', (req, res) => {
    try {
        const { method, path, api } = req.body;
        
        if (!method || !path) {
            return res.status(400).json({
                success: false,
                error: 'Invalid input',
                message: 'Method and path parameters are required',
                example: { method: "GET", path: "/users", api: "User API" }
            });
        }

        console.log(`🎭 [MCP-EXECUTE] Simulating: ${method} ${path}`);
        
        // Simulate API execution
        const result = agentTools.simulateExecution(method, path, api || 'Unknown API');
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ [MCP-EXECUTE] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Execution simulation failed',
            message: error.message
        });
    }
});

// Context storage for follow-up queries
let agentContext = {
    lastQuery: null,
    lastAPI: null,
    lastEndpoint: null,
    sessionId: null
};

/**
 * Enhanced AI Agent Query Endpoint (MCP-style)
 * POST /agent/query
 * Supports context awareness and returns top 3 matches
 */
app.post('/agent/query', (req, res) => {
    try {
        const { query, sessionId } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query is required',
                message: 'Please provide a natural language query'
            });
        }
        
        console.log(`[AGENT] Query received: "${query}"`);
        
        // Handle session context
        if (sessionId && sessionId !== agentContext.sessionId) {
            // New session, reset context
            agentContext = { sessionId, lastQuery: null, lastAPI: null, lastEndpoint: null };
        }
        
        // Load APIs and find matches
        const apis = loadAPIs();
        console.log(`[AGENT] Matching endpoints...`);
        
        const matches = findTopMatches(query, apis, agentContext);
        
        if (matches.length > 0) {
            console.log(`[AGENT] Found ${matches.length} matches`);
            console.log(`[AGENT] Returning best match: ${matches[0].apiName} - ${matches[0].endpoint.method} ${matches[0].endpoint.path}`);
            
            // Update context
            agentContext.lastQuery = query;
            agentContext.lastAPI = matches[0].apiName;
            agentContext.lastEndpoint = matches[0].endpoint;
            
            res.json({
                success: true,
                query: query,
                matches: matches,
                context: {
                    hasContext: agentContext.lastAPI !== null,
                    lastAPI: agentContext.lastAPI,
                    sessionId: agentContext.sessionId
                },
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`[AGENT] No matches found for: "${query}"`);
            res.json({
                success: false,
                query: query,
                message: 'No API endpoints found',
                suggestion: 'Try queries like "get users", "create pet", "update user", or "delete item"',
                availableActions: getAvailableActions(apis),
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error(`[AGENT] Error in query processing:`, error);
        res.status(500).json({
            success: false,
            error: 'Agent query failed',
            message: error.message
        });
    }
});

/**
 * Enhanced MCP-style matching - finds top 3 matches with context awareness
 */
function findTopMatches(query, apis, context) {
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/);
    
    console.log(`[AGENT] Processing query words: [${queryWords.join(', ')}]`);
    
    // Handle context-aware queries
    const processedQuery = handleContextAwareQuery(queryLower, queryWords, context);
    
    let allMatches = [];
    
    // Search through all APIs and their endpoints
    for (const api of apis) {
        const endpoints = loadAPIEndpoints(api.id);
        
        for (const endpoint of endpoints) {
            const score = calculateEnhancedMatchScore(processedQuery.words, api, endpoint, processedQuery.intent);
            
            if (score > 0.4) { // Lower threshold for more results
                allMatches.push({
                    score: score,
                    apiName: api.name,
                    endpoint: {
                        method: endpoint.method,
                        path: endpoint.path,
                        summary: endpoint.summary || endpoint.description || '',
                        description: endpoint.description || ''
                    },
                    authType: endpoint.authType || api.authType,
                    templates: generateTemplateForEndpoint(api, endpoint)
                });
            }
        }
    }
    
    // Sort by score and return top 3
    allMatches.sort((a, b) => b.score - a.score);
    const topMatches = allMatches.slice(0, 3);
    
    console.log(`[AGENT] Top matches scores: [${topMatches.map(m => m.score.toFixed(2)).join(', ')}]`);
    
    return topMatches;
}

/**
 * Handle context-aware queries and follow-ups
 */
function handleContextAwareQuery(queryLower, queryWords, context) {
    let intent = null;
    let processedWords = [...queryWords];
    
    // Detect follow-up queries
    const followUpPatterns = [
        { pattern: /^(now |then |next )?create (one|it|that)$/i, intent: 'create', method: 'POST' },
        { pattern: /^(now |then |next )?update (one|it|that)$/i, intent: 'update', method: 'PUT' },
        { pattern: /^(now |then |next )?delete (one|it|that)$/i, intent: 'delete', method: 'DELETE' },
        { pattern: /^(now |then |next )?get (one|it|that)$/i, intent: 'get', method: 'GET' }
    ];
    
    for (const followUp of followUpPatterns) {
        if (followUp.pattern.test(queryLower)) {
            console.log(`[AGENT] Detected follow-up query: ${followUp.intent}`);
            if (context.lastAPI && context.lastEndpoint) {
                // Use context from previous query
                const resourcePath = extractResourceFromPath(context.lastEndpoint.path);
                processedWords = [followUp.intent, resourcePath];
                intent = { action: followUp.intent, method: followUp.method, contextAPI: context.lastAPI };
            }
            break;
        }
    }
    
    return { words: processedWords, intent };
}

/**
 * Extract resource name from endpoint path
 */
function extractResourceFromPath(path) {
    const segments = path.split('/').filter(s => s && !s.startsWith('{'));
    return segments[segments.length - 1] || 'resource';
}

/**
 * Enhanced scoring system with synonyms and better matching
 */
function calculateEnhancedMatchScore(queryWords, api, endpoint, intent) {
    let score = 0;
    const totalWords = queryWords.length;
    
    // Combine all searchable text
    const searchableText = [
        api.name,
        endpoint.path,
        endpoint.method,
        endpoint.summary || '',
        endpoint.description || '',
        ...(endpoint.tags || [])
    ].join(' ').toLowerCase();
    
    // Enhanced method synonyms
    const methodSynonyms = {
        'get': ['get', 'fetch', 'retrieve', 'list', 'show', 'find', 'read', 'view'],
        'post': ['post', 'create', 'add', 'new', 'insert', 'make', 'build'],
        'put': ['put', 'update', 'edit', 'modify', 'change', 'patch', 'set'],
        'delete': ['delete', 'remove', 'del', 'destroy', 'clear', 'erase'],
        'patch': ['patch', 'update', 'modify', 'edit', 'change']
    };
    
    // Resource synonyms
    const resourceSynonyms = {
        'user': ['user', 'users', 'person', 'people', 'account', 'profile'],
        'pet': ['pet', 'pets', 'animal', 'animals'],
        'product': ['product', 'products', 'item', 'items'],
        'order': ['order', 'orders', 'purchase', 'transaction']
    };
    
    // Score based on word matches
    for (const word of queryWords) {
        // Direct text match
        if (searchableText.includes(word)) {
            score += 1.0;
        }
        
        // Method synonym matching
        for (const [method, synonyms] of Object.entries(methodSynonyms)) {
            if (synonyms.includes(word) && endpoint.method.toLowerCase() === method) {
                score += 1.5; // Higher score for method matches
                console.log(`[AGENT] Method match: "${word}" → ${method.toUpperCase()}`);
            }
        }
        
        // Resource synonym matching
        for (const [resource, synonyms] of Object.entries(resourceSynonyms)) {
            if (synonyms.includes(word)) {
                const pathWords = endpoint.path.toLowerCase().split(/[\/\-\_]/);
                if (pathWords.some(pathWord => pathWord.includes(resource) || resource.includes(pathWord))) {
                    score += 1.2;
                    console.log(`[AGENT] Resource match: "${word}" → ${resource}`);
                }
            }
        }
        
        // Path segment matching
        const pathWords = endpoint.path.toLowerCase().split(/[\/\-\_]/);
        if (pathWords.some(pathWord => pathWord.includes(word) || word.includes(pathWord))) {
            score += 0.8;
        }
    }
    
    // Context-aware scoring
    if (intent && intent.method === endpoint.method) {
        score += 2.0; // Strong bonus for context matches
        console.log(`[AGENT] Context match: ${intent.action} → ${endpoint.method}`);
    }
    
    // Exact method match bonus
    if (queryWords.includes(endpoint.method.toLowerCase())) {
        score += 1.0;
    }
    
    // Summary/description relevance
    const summaryWords = (endpoint.summary || '').toLowerCase().split(/\s+/);
    const matchingWords = queryWords.filter(word => summaryWords.includes(word));
    score += matchingWords.length * 0.5;
    
    // Normalize score
    return totalWords > 0 ? score / totalWords : 0;
}

/**
 * Get available actions from all APIs for suggestions
 */
function getAvailableActions(apis) {
    const actions = new Set();
    
    for (const api of apis) {
        const endpoints = loadAPIEndpoints(api.id);
        for (const endpoint of endpoints) {
            const pathSegments = endpoint.path.split('/').filter(s => s && !s.startsWith('{'));
            const resource = pathSegments[pathSegments.length - 1];
            if (resource) {
                actions.add(`${endpoint.method.toLowerCase()} ${resource}`);
            }
        }
    }
    
    return Array.from(actions).slice(0, 10); // Return top 10 suggestions
}

/**
 * Generate template for specific endpoint
 */
function generateTemplateForEndpoint(api, endpoint) {
    const baseUrl = api.baseUrl || 'https://api.example.com';
    const fullUrl = baseUrl + endpoint.path;
    
    // Generate curl template
    let curlTemplate = `curl -X ${endpoint.method} "${fullUrl}"`;
    curlTemplate += ` \\\n  -H "Content-Type: application/json"`;
    
    // Add auth headers
    if (api.authType === 'apiKey') {
        const keyName = api.authDetails?.name || 'X-API-Key';
        curlTemplate += ` \\\n  -H "${keyName}: YOUR_API_KEY"`;
    } else if (api.authType === 'bearer') {
        curlTemplate += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
    }
    
    // Add body for POST/PUT
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        curlTemplate += ` \\\n  -d '{"key": "value"}'`;
    }
    
    // Generate PowerShell template
    let powershellTemplate = `$headers = @{\n    "Content-Type" = "application/json"`;
    
    if (api.authType === 'apiKey') {
        const keyName = api.authDetails?.name || 'X-API-Key';
        powershellTemplate += `\n    "${keyName}" = "YOUR_API_KEY"`;
    } else if (api.authType === 'bearer') {
        powershellTemplate += `\n    "Authorization" = "Bearer YOUR_TOKEN"`;
    }
    
    powershellTemplate += `\n}\n\n`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        powershellTemplate += `$body = @{\n    "key" = "value"\n} | ConvertTo-Json\n\n`;
        powershellTemplate += `Invoke-RestMethod -Uri "${fullUrl}" -Method ${endpoint.method} -Headers $headers -Body $body`;
    } else {
        powershellTemplate += `Invoke-RestMethod -Uri "${fullUrl}" -Method ${endpoint.method} -Headers $headers`;
    }
    
    return {
        curl: curlTemplate,
        powershell: powershellTemplate
    };
}

/**
 * Execute API Request Endpoint (Try This API feature)
 * POST /agent/execute
 */
app.post('/agent/execute', async (req, res) => {
    try {
        const { apiName, endpoint, authType, testData } = req.body;
        
        console.log(`[AGENT] Execute request: ${endpoint.method} ${endpoint.path}`);
        
        // Find the API details
        const apis = loadAPIs();
        const api = apis.find(a => a.name === apiName);
        
        if (!api) {
            return res.status(404).json({
                success: false,
                error: 'API not found',
                message: `API "${apiName}" not found in registry`
            });
        }
        
        // Build request URL
        const baseUrl = api.baseUrl || 'https://api.example.com';
        let fullUrl = baseUrl + endpoint.path;
        
        // Replace path parameters with test values
        fullUrl = fullUrl.replace(/\{([^}]+)\}/g, (match, param) => {
            return testData?.[param] || '123'; // Default test value
        });
        
        // Prepare request options
        const requestOptions = {
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'API-Explorer-Agent/1.0'
            }
        };
        
        // Add authentication headers
        addAuthHeaders(requestOptions.headers, authType, api.authDetails);
        
        // Add body for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            requestOptions.body = JSON.stringify(testData?.body || generateSampleBody(endpoint.path));
        }
        
        console.log(`[AGENT] Making request to: ${fullUrl}`);
        
        // Make the request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
            const startTime = Date.now();
            const response = await fetch(fullUrl, {
                ...requestOptions,
                signal: controller.signal
            });
            const endTime = Date.now();
            
            clearTimeout(timeoutId);
            
            // Get response data
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
            
            console.log(`[AGENT] Request completed: ${response.status} in ${endTime - startTime}ms`);
            
            res.json({
                success: true,
                request: {
                    url: fullUrl,
                    method: endpoint.method,
                    headers: requestOptions.headers,
                    body: requestOptions.body
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    data: responseData,
                    time: endTime - startTime
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout (10 seconds)');
            }
            throw fetchError;
        }
        
    } catch (error) {
        console.error(`[AGENT] Execute request failed:`, error);
        res.status(500).json({
            success: false,
            error: 'Request execution failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Add authentication headers based on auth type
 */
function addAuthHeaders(headers, authType, authDetails) {
    switch (authType) {
        case 'apiKey':
            const keyName = authDetails?.name || 'X-API-Key';
            headers[keyName] = 'DEMO_API_KEY';
            break;
        case 'bearer':
        case 'http':
            headers['Authorization'] = 'Bearer DEMO_TOKEN';
            break;
        case 'oauth2':
            headers['Authorization'] = 'Bearer DEMO_OAUTH_TOKEN';
            break;
        // 'none' - no headers added
    }
}

/**
 * Generate sample request body based on endpoint path
 */
function generateSampleBody(path) {
    if (path.includes('user')) {
        return { 
            name: 'John Doe', 
            email: 'john.doe@example.com',
            age: 30
        };
    } else if (path.includes('pet')) {
        return { 
            name: 'Fluffy', 
            species: 'cat', 
            age: 3,
            color: 'orange'
        };
    } else if (path.includes('product')) {
        return { 
            name: 'Sample Product', 
            price: 29.99, 
            category: 'electronics',
            description: 'A sample product for testing'
        };
    } else {
        return { 
            id: 1,
            name: 'Sample Item',
            data: 'test_data',
            timestamp: new Date().toISOString()
        };
    }
}
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

// NEW: Get API details with endpoints and templates
app.get('/apis/:id/details', (req, res) => {
    try {
        const { id } = req.params;
        
        // Load metadata
        const metadataPath = path.join(__dirname, '..', 'apis', id, 'metadata.json');
        const metadata = fs.existsSync(metadataPath) 
            ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
            : {};
        
        // Load OpenAPI spec
        const openapiPath = path.join(__dirname, '..', 'apis', id, 'openapi.json');
        if (!fs.existsSync(openapiPath)) {
            return res.status(404).json({
                success: false,
                error: 'API specification not found'
            });
        }
        
        const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
        
        // Extract endpoints with templates
        const endpoints = [];
        if (openapi.paths) {
            for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                for (const [method, methodObj] of Object.entries(pathObj)) {
                    if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                        // Generate templates for this endpoint
                        const endpoint = {
                            path: pathStr,
                            method: method.toUpperCase(),
                            summary: methodObj.summary || `${method.toUpperCase()} ${pathStr}`,
                            description: methodObj.description || '',
                            tags: methodObj.tags || []
                        };
                        
                        // Generate curl template
                        const baseUrl = metadata.baseUrl || openapi.servers?.[0]?.url || 'https://api.example.com';
                        const fullUrl = `${baseUrl}${pathStr}`;
                        
                        let curlTemplate = `curl -X ${endpoint.method} "${fullUrl}"`;
                        curlTemplate += ` \\\n  -H "Content-Type: application/json"`;
                        
                        // Add auth headers
                        if (metadata.authType === 'apiKey') {
                            const keyName = metadata.authDetails?.name || 'X-API-Key';
                            curlTemplate += ` \\\n  -H "${keyName}: YOUR_API_KEY"`;
                        } else if (metadata.authType === 'bearer') {
                            curlTemplate += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
                        }
                        
                        // Add body for POST/PUT
                        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
                            curlTemplate += ` \\\n  -d '{"key": "value"}'`;
                        }
                        
                        // Generate PowerShell template
                        let powershellTemplate = `$headers = @{\n    "Content-Type" = "application/json"`;
                        
                        if (metadata.authType === 'apiKey') {
                            const keyName = metadata.authDetails?.name || 'X-API-Key';
                            powershellTemplate += `\n    "${keyName}" = "YOUR_API_KEY"`;
                        } else if (metadata.authType === 'bearer') {
                            powershellTemplate += `\n    "Authorization" = "Bearer YOUR_TOKEN"`;
                        }
                        
                        powershellTemplate += `\n}\n\n`;
                        
                        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
                            powershellTemplate += `$body = @{\n    "key" = "value"\n} | ConvertTo-Json\n\n`;
                            powershellTemplate += `Invoke-RestMethod -Uri "${fullUrl}" -Method ${endpoint.method} -Headers $headers -Body $body`;
                        } else {
                            powershellTemplate += `Invoke-RestMethod -Uri "${fullUrl}" -Method ${endpoint.method} -Headers $headers`;
                        }
                        
                        endpoint.templates = {
                            curl: curlTemplate,
                            powershell: powershellTemplate
                        };
                        
                        endpoints.push(endpoint);
                    }
                }
            }
        }
        
        res.json({
            success: true,
            api: {
                id: id,
                name: metadata.name || openapi.info?.title || 'Unknown API',
                description: metadata.description || openapi.info?.description || '',
                baseUrl: metadata.baseUrl || openapi.servers?.[0]?.url || '',
                authType: metadata.authType || 'none',
                category: metadata.category || 'General',
                tags: metadata.tags || [],
                rating: metadata.rating || 4.0,
                endpointCount: endpoints.length
            },
            endpoints: endpoints
        });
        
    } catch (error) {
        console.error('Error loading API details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load API details',
            message: error.message
        });
    }
});

/**
 * Load APIs from registry
 */
function loadAPIs() {
    try {
        const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
        
        if (fs.existsSync(registryPath)) {
            const data = fs.readFileSync(registryPath, 'utf8');
            const globalIndex = JSON.parse(data);
            return globalIndex.apis || [];
        }
        
        return [];
    } catch (error) {
        console.error('Error loading APIs:', error);
        return [];
    }
}

/**
 * Load endpoints for a specific API
 */
function loadAPIEndpoints(apiId) {
    try {
        const apiPath = path.join(__dirname, '..', 'apis', apiId, 'openapi.json');
        
        if (fs.existsSync(apiPath)) {
            const data = fs.readFileSync(apiPath, 'utf8');
            const openapi = JSON.parse(data);
            
            const endpoints = [];
            
            // Extract endpoints from OpenAPI spec
            if (openapi.paths) {
                for (const [pathStr, pathObj] of Object.entries(openapi.paths)) {
                    for (const [method, methodObj] of Object.entries(pathObj)) {
                        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
                            endpoints.push({
                                path: pathStr,
                                method: method.toUpperCase(),
                                summary: methodObj.summary || '',
                                description: methodObj.description || '',
                                tags: methodObj.tags || []
                            });
                        }
                    }
                }
            }
            
            return endpoints;
        }
        
        return [];
    } catch (error) {
        console.error(`Error loading endpoints for API ${apiId}:`, error);
        return [];
    }
}

app.listen(PORT, () => {
    console.log(`🚀 API Explorer Backend running on port ${PORT}`);
    console.log(`🚀 Server URL: http://localhost:${PORT}`);
});