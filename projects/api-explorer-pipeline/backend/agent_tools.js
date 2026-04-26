/**
 * AI Agent Tools Module - MCP-style API Explorer Integration
 * Provides structured endpoints for AI agents to interact with API Explorer
 */

const fs = require('fs');
const path = require('path');

class AgentTools {
    constructor() {
        this.apis = [];
        this.loadAPIs();
    }

    /**
     * Load all APIs from registry
     */
    loadAPIs() {
        try {
            // Try the correct registry path first
            const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
            if (fs.existsSync(registryPath)) {
                const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
                this.apis = registryData.apis || [];
                console.log(`🤖 Agent Tools: Loaded ${this.apis.length} APIs from global_index.json`);
                return;
            }
            
            // Fallback to apis.json if it exists
            const fallbackPath = path.join(__dirname, '..', 'registry', 'apis.json');
            if (fs.existsSync(fallbackPath)) {
                const registryData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
                this.apis = registryData.apis || [];
                console.log(`🤖 Agent Tools: Loaded ${this.apis.length} APIs from apis.json`);
                return;
            }
            
            console.log('🤖 Agent Tools: No registry file found, using empty API list');
            this.apis = [];
        } catch (error) {
            console.error('❌ Agent Tools: Failed to load APIs:', error.message);
            this.apis = [];
        }
    }

    /**
     * Search for APIs/endpoints based on natural language query
     * @param {string} query - Natural language query (e.g., "get users", "create pet")
     * @returns {Object} Search results with best matches
     */
    searchAPIs(query) {
        const startTime = Date.now();
        
        if (!query || typeof query !== 'string') {
            return {
                success: false,
                message: 'Invalid query provided',
                matches: [],
                responseTime: Date.now() - startTime
            };
        }

        const normalizedQuery = query.toLowerCase().trim();
        const queryWords = normalizedQuery.split(/\s+/);
        
        // Extract intent and entity from query
        const intent = this.extractIntent(queryWords);
        const entity = this.extractEntity(queryWords);
        
        console.log(`🔍 Agent Search: "${query}" -> Intent: ${intent}, Entity: ${entity}`);

        const matches = [];

        // Search through all APIs and their endpoints
        for (const api of this.apis) {
            const mockEndpoints = this.generateMockEndpoints(api);
            
            for (const endpoint of mockEndpoints) {
                const score = this.calculateMatchScore(endpoint, intent, entity, queryWords);
                
                if (score > 0.3) { // Minimum threshold for relevance
                    matches.push({
                        score,
                        api: api.name,
                        apiId: api.id,
                        endpoint: {
                            method: endpoint.method,
                            path: endpoint.path,
                            summary: endpoint.summary,
                            description: endpoint.description
                        },
                        authType: api.authType,
                        baseUrl: api.baseUrl,
                        templates: this.generateTemplates(endpoint, api)
                    });
                }
            }
        }

        // Sort by score (highest first) and limit results
        matches.sort((a, b) => b.score - a.score);
        const topMatches = matches.slice(0, 5);

        const responseTime = Date.now() - startTime;
        console.log(`⚡ Agent Search completed in ${responseTime}ms, found ${topMatches.length} matches`);

        return {
            success: true,
            query: query,
            intent,
            entity,
            results: topMatches,  // Changed from "matches" to "results" for consistency
            matches: topMatches,  // Keep "matches" for backward compatibility
            totalFound: matches.length,
            responseTime
        };
    }

    /**
     * Extract intent from query words (GET, POST, PUT, DELETE operations)
     */
    extractIntent(queryWords) {
        const intentMap = {
            // GET operations
            'get': 'GET', 'fetch': 'GET', 'retrieve': 'GET', 'list': 'GET', 
            'show': 'GET', 'find': 'GET', 'search': 'GET', 'view': 'GET',
            
            // POST operations  
            'create': 'POST', 'add': 'POST', 'new': 'POST', 'insert': 'POST',
            'post': 'POST', 'submit': 'POST', 'register': 'POST',
            
            // PUT operations
            'update': 'PUT', 'edit': 'PUT', 'modify': 'PUT', 'change': 'PUT',
            'put': 'PUT', 'replace': 'PUT',
            
            // DELETE operations
            'delete': 'DELETE', 'remove': 'DELETE', 'destroy': 'DELETE',
            'drop': 'DELETE', 'clear': 'DELETE'
        };

        for (const word of queryWords) {
            if (intentMap[word]) {
                return intentMap[word];
            }
        }
        
        // Default to GET if no clear intent
        return 'GET';
    }

    /**
     * Extract entity/resource from query words
     */
    extractEntity(queryWords) {
        const commonEntities = [
            'user', 'users', 'pet', 'pets', 'product', 'products',
            'order', 'orders', 'item', 'items', 'customer', 'customers',
            'account', 'accounts', 'profile', 'profiles', 'store', 'stores',
            'category', 'categories', 'tag', 'tags', 'comment', 'comments',
            'review', 'reviews', 'inventory', 'payment', 'payments'
        ];

        for (const word of queryWords) {
            if (commonEntities.includes(word)) {
                return word;
            }
        }

        // Return the last meaningful word as potential entity
        const meaningfulWords = queryWords.filter(word => 
            word.length > 2 && !['the', 'and', 'for', 'with', 'all'].includes(word)
        );
        
        return meaningfulWords[meaningfulWords.length - 1] || 'resource';
    }

    /**
     * Calculate match score between endpoint and query
     */
    calculateMatchScore(endpoint, intent, entity, queryWords) {
        let score = 0;

        // Method matching (high weight)
        if (endpoint.method === intent) {
            score += 0.4;
        }

        // Path matching
        const pathLower = endpoint.path.toLowerCase();
        if (pathLower.includes(entity)) {
            score += 0.3;
        }

        // Summary/description matching
        const summaryLower = (endpoint.summary || '').toLowerCase();
        const descriptionLower = (endpoint.description || '').toLowerCase();
        
        for (const word of queryWords) {
            if (word.length > 2) {
                if (pathLower.includes(word)) score += 0.1;
                if (summaryLower.includes(word)) score += 0.15;
                if (descriptionLower.includes(word)) score += 0.1;
            }
        }

        // Boost score for exact entity matches in path
        if (pathLower.includes(`/${entity}`) || pathLower.includes(`${entity}/`)) {
            score += 0.2;
        }

        // Penalize very generic paths
        if (pathLower === '/' || pathLower === '/api') {
            score *= 0.5;
        }

        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Generate mock endpoints for an API (since we don't have full OpenAPI parsing)
     */
    generateMockEndpoints(api) {
        const baseEndpoints = [
            // User endpoints
            { method: 'GET', path: '/users', summary: 'Get all users', description: 'Retrieve a list of all users' },
            { method: 'GET', path: '/users/{id}', summary: 'Get user by ID', description: 'Retrieve a specific user by ID' },
            { method: 'POST', path: '/users', summary: 'Create user', description: 'Create a new user account' },
            { method: 'PUT', path: '/users/{id}', summary: 'Update user', description: 'Update an existing user' },
            { method: 'DELETE', path: '/users/{id}', summary: 'Delete user', description: 'Delete a user account' },
            
            // Pet endpoints (for pet store APIs)
            { method: 'GET', path: '/pets', summary: 'Get all pets', description: 'Retrieve a list of all pets' },
            { method: 'GET', path: '/pets/{id}', summary: 'Get pet by ID', description: 'Retrieve a specific pet by ID' },
            { method: 'POST', path: '/pets', summary: 'Create pet', description: 'Add a new pet to the store' },
            { method: 'PUT', path: '/pets/{id}', summary: 'Update pet', description: 'Update an existing pet' },
            { method: 'DELETE', path: '/pets/{id}', summary: 'Delete pet', description: 'Remove a pet from the store' },
            
            // Product endpoints
            { method: 'GET', path: '/products', summary: 'Get all products', description: 'Retrieve a list of all products' },
            { method: 'GET', path: '/products/{id}', summary: 'Get product by ID', description: 'Retrieve a specific product by ID' },
            { method: 'POST', path: '/products', summary: 'Create product', description: 'Add a new product' },
            { method: 'PUT', path: '/products/{id}', summary: 'Update product', description: 'Update an existing product' },
            
            // Order endpoints
            { method: 'GET', path: '/orders', summary: 'Get all orders', description: 'Retrieve a list of all orders' },
            { method: 'GET', path: '/orders/{id}', summary: 'Get order by ID', description: 'Retrieve a specific order by ID' },
            { method: 'POST', path: '/orders', summary: 'Create order', description: 'Place a new order' },
            
            // Generic endpoints
            { method: 'GET', path: '/health', summary: 'Health check', description: 'Check API health status' },
            { method: 'GET', path: '/version', summary: 'Get version', description: 'Get API version information' }
        ];

        // Filter endpoints based on API name/type
        const apiNameLower = api.name.toLowerCase();
        if (apiNameLower.includes('pet')) {
            return baseEndpoints.filter(ep => ep.path.includes('pet') || ep.path.includes('health') || ep.path.includes('version'));
        } else if (apiNameLower.includes('user')) {
            return baseEndpoints.filter(ep => ep.path.includes('user') || ep.path.includes('health') || ep.path.includes('version'));
        } else if (apiNameLower.includes('store') || apiNameLower.includes('shop')) {
            return baseEndpoints.filter(ep => ep.path.includes('product') || ep.path.includes('order') || ep.path.includes('health'));
        }
        
        // Return a subset for generic APIs
        return baseEndpoints.slice(0, 8);
    }

    /**
     * Generate curl and PowerShell templates for an endpoint
     */
    generateTemplates(endpoint, api) {
        const baseUrl = api.baseUrl || 'https://api.example.com';
        const fullUrl = `${baseUrl}${endpoint.path}`;
        
        // Generate curl template
        let curlTemplate = `curl -X ${endpoint.method} "${fullUrl}"`;
        curlTemplate += ` \\\n  -H "Content-Type: application/json"`;
        
        if (api.authType === 'apiKey') {
            const keyName = api.authDetails?.name || 'X-API-Key';
            curlTemplate += ` \\\n  -H "${keyName}: YOUR_API_KEY"`;
        } else if (api.authType === 'bearer') {
            curlTemplate += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
        }
        
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            curlTemplate += ` \\\n  -d '${this.generateSamplePayload(endpoint)}'`;
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
            powershellTemplate += `$body = '${this.generateSamplePayload(endpoint)}'\n\n`;
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
     * Generate sample JSON payload for POST/PUT requests
     */
    generateSamplePayload(endpoint) {
        const pathLower = endpoint.path.toLowerCase();
        
        if (pathLower.includes('user')) {
            return JSON.stringify({
                name: "John Doe",
                email: "john@example.com",
                age: 30
            });
        } else if (pathLower.includes('pet')) {
            return JSON.stringify({
                name: "Fluffy",
                category: "cat",
                status: "available"
            });
        } else if (pathLower.includes('product')) {
            return JSON.stringify({
                name: "Sample Product",
                price: 29.99,
                category: "electronics"
            });
        } else if (pathLower.includes('order')) {
            return JSON.stringify({
                productId: 123,
                quantity: 2,
                customerEmail: "customer@example.com"
            });
        }
        
        return JSON.stringify({
            key: "value",
            example: "data"
        });
    }

    /**
     * List all available APIs and endpoints
     */
    listAllAPIs() {
        const startTime = Date.now();
        
        const result = {
            success: true,
            totalAPIs: this.apis.length,
            apis: [],
            responseTime: 0
        };

        for (const api of this.apis) {
            const endpoints = this.generateMockEndpoints(api);
            
            result.apis.push({
                id: api.id,
                name: api.name,
                baseUrl: api.baseUrl,
                authType: api.authType,
                endpointCount: endpoints.length,
                endpoints: endpoints.map(ep => ({
                    method: ep.method,
                    path: ep.path,
                    summary: ep.summary,
                    description: ep.description,
                    templates: this.generateTemplates(ep, api)
                }))
            });
        }

        result.responseTime = Date.now() - startTime;
        console.log(`📋 Agent List: Returned ${result.totalAPIs} APIs in ${result.responseTime}ms`);
        
        return result;
    }

    /**
     * Simulate API execution (mock responses)
     */
    simulateExecution(method, path, apiName) {
        const startTime = Date.now();
        
        // Generate mock response based on endpoint
        const mockResponse = this.generateMockResponse(method, path);
        
        const result = {
            success: true,
            execution: {
                api: apiName,
                method,
                path,
                timestamp: new Date().toISOString(),
                responseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
                status: 200,
                response: mockResponse
            },
            simulationTime: Date.now() - startTime
        };

        console.log(`🎭 Agent Simulation: ${method} ${path} -> ${result.execution.status}`);
        return result;
    }

    /**
     * Generate mock JSON response for simulation
     */
    generateMockResponse(method, path) {
        const pathLower = path.toLowerCase();
        
        if (method === 'GET') {
            if (pathLower.includes('users') && !pathLower.includes('{id}')) {
                return {
                    users: [
                        { id: 1, name: "John Doe", email: "john@example.com", status: "active" },
                        { id: 2, name: "Jane Smith", email: "jane@example.com", status: "active" },
                        { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "inactive" }
                    ],
                    total: 3,
                    page: 1
                };
            } else if (pathLower.includes('user') && pathLower.includes('{id}')) {
                return {
                    id: 1,
                    name: "John Doe",
                    email: "john@example.com",
                    status: "active",
                    createdAt: "2024-01-15T10:30:00Z"
                };
            } else if (pathLower.includes('pets')) {
                return {
                    pets: [
                        { id: 1, name: "Fluffy", category: "cat", status: "available", price: 299.99 },
                        { id: 2, name: "Buddy", category: "dog", status: "available", price: 499.99 },
                        { id: 3, name: "Charlie", category: "bird", status: "sold", price: 149.99 }
                    ],
                    total: 3
                };
            } else if (pathLower.includes('products')) {
                return {
                    products: [
                        { id: 1, name: "Laptop", category: "electronics", price: 999.99, stock: 15 },
                        { id: 2, name: "Mouse", category: "accessories", price: 29.99, stock: 50 },
                        { id: 3, name: "Keyboard", category: "accessories", price: 79.99, stock: 25 }
                    ],
                    total: 3
                };
            } else if (pathLower.includes('health')) {
                return {
                    status: "healthy",
                    timestamp: new Date().toISOString(),
                    version: "1.0.0",
                    uptime: "5d 12h 30m"
                };
            }
        } else if (method === 'POST') {
            if (pathLower.includes('user')) {
                return {
                    id: Math.floor(Math.random() * 1000) + 100,
                    name: "New User",
                    email: "newuser@example.com",
                    status: "active",
                    createdAt: new Date().toISOString(),
                    message: "User created successfully"
                };
            } else if (pathLower.includes('pet')) {
                return {
                    id: Math.floor(Math.random() * 1000) + 100,
                    name: "New Pet",
                    category: "dog",
                    status: "available",
                    createdAt: new Date().toISOString(),
                    message: "Pet added successfully"
                };
            } else if (pathLower.includes('order')) {
                return {
                    id: Math.floor(Math.random() * 10000) + 1000,
                    status: "confirmed",
                    total: 129.99,
                    createdAt: new Date().toISOString(),
                    estimatedDelivery: "2024-04-20",
                    message: "Order placed successfully"
                };
            }
        } else if (method === 'PUT') {
            return {
                id: Math.floor(Math.random() * 1000) + 1,
                updatedAt: new Date().toISOString(),
                message: "Resource updated successfully"
            };
        } else if (method === 'DELETE') {
            return {
                message: "Resource deleted successfully",
                deletedAt: new Date().toISOString()
            };
        }

        // Default response
        return {
            message: "Operation completed successfully",
            timestamp: new Date().toISOString(),
            data: { example: "response" }
        };
    }
}

module.exports = AgentTools;