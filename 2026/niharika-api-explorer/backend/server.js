const express = require('express');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Load API registry
function loadRegistry() {
    try {
        const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
        if (fs.existsSync(registryPath)) {
            const data = fs.readFileSync(registryPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading registry:', error.message);
    }
    return { apis: [] };
}

// Simple keyword-based search
function searchAPIs(query) {
    const registry = loadRegistry();
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const results = registry.apis.map(api => {
        let score = 0;
        const searchText = `${api.name} ${api.description} ${api.category} ${(api.tags || []).join(' ')}`.toLowerCase();
        
        queryWords.forEach(word => {
            if (searchText.includes(word)) score += 1;
        });
        
        return { ...api, score };
    }).filter(api => api.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    return results;
}

// Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'API Explorer Backend',
        version: '1.0.0',
        status: 'running'
    });
});

// Get all APIs
app.get('/apis', (req, res) => {
    try {
        const registry = loadRegistry();
        res.json({
            success: true,
            count: registry.apis.length,
            apis: registry.apis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search APIs
app.post('/search', (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required'
            });
        }
        
        const results = searchAPIs(query);
        
        res.json({
            success: true,
            query: query,
            count: results.length,
            results: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get API details
app.get('/apis/:id', (req, res) => {
    try {
        const registry = loadRegistry();
        const api = registry.apis.find(a => a.id === req.params.id);
        
        if (!api) {
            return res.status(404).json({
                success: false,
                error: 'API not found'
            });
        }
        
        res.json({
            success: true,
            api: api
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get categories
app.get('/categories', (req, res) => {
    try {
        const registry = loadRegistry();
        const categories = [...new Set(registry.apis.map(api => api.category))].sort();
        
        res.json({
            success: true,
            categories: categories,
            count: categories.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    const registry = loadRegistry();
    console.log(`🚀 API Explorer Backend running on http://localhost:${PORT}`);
    console.log(`📚 Registry loaded with ${registry.apis.length} APIs`);
});
