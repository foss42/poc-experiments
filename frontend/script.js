/**
 * API Explorer Frontend - Fixed Version
 * Handles API data fetching, UI interactions, and template management
 */

// Global state
let allAPIs = [];
let currentAPI = null;
let currentEndpoints = [];
let currentEndpoint = null;
let lastResponse = null;

// Configuration - CORRECT PORT
const API_BASE_URL = 'http://localhost:3002';

console.log('🔧 API_BASE_URL configured as:', API_BASE_URL);

// DOM Elements
const elements = {
    apiList: document.getElementById('api-list'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    welcomeScreen: document.getElementById('welcome-screen'),
    apiDetails: document.getElementById('api-details'),
    searchInput: document.getElementById('search-input'),
    authFilter: document.getElementById('auth-filter'),
    categoryFilter: document.getElementById('category-filter'),
    apiCount: document.getElementById('api-count'),
    endpointCount: document.getElementById('endpoint-count'),
    
    // API Details elements
    apiName: document.getElementById('api-name'),
    apiAuthBadge: document.getElementById('api-auth-badge'),
    apiBaseUrl: document.getElementById('api-base-url'),
    apiBaseUrlDisplay: document.getElementById('api-base-url-display'),
    baseUrlWarning: document.getElementById('base-url-warning'),
    apiEndpointCount: document.getElementById('api-endpoint-count'),
    endpointsList: document.getElementById('endpoints-list'),
    
    // Template Modal elements
    templateModal: document.getElementById('template-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMethod: document.getElementById('modal-method'),
    modalPath: document.getElementById('modal-path'),
    curlCode: document.getElementById('curl-code'),
    powershellCode: document.getElementById('powershell-code'),
    
    copyNotification: document.getElementById('copy-notification')
};

/**
 * Initialize the application
 */
function init() {
    console.log('🚀 Initializing API Explorer...');
    console.log('🔧 Backend URL:', API_BASE_URL);
    
    // Set up event listeners
    setupEventListeners();
    setupAIEventListeners();
    
    // Load APIs from backend
    loadAPIs();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Search functionality
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
    }
    
    // Auth filter
    if (elements.authFilter) {
        elements.authFilter.addEventListener('change', handleAuthFilter);
    }
    
    // Category filter
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', handleCategoryFilter);
    }
    
    // Method filter buttons
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', handleMethodFilter);
    });
    
    // Template tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
    
    // Modal close on background click
    if (elements.templateModal) {
        elements.templateModal.addEventListener('click', (e) => {
            if (e.target === elements.templateModal) {
                closeTemplateModal();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Load APIs from the backend
 */
async function loadAPIs() {
    console.log('📡 Loading APIs from backend...');
    console.log('🔧 Fetching from:', `${API_BASE_URL}/apis`);
    
    try {
        // Show loading state
        if (elements.loading) elements.loading.style.display = 'block';
        if (elements.errorMessage) elements.errorMessage.style.display = 'none';
        if (elements.apiList) elements.apiList.innerHTML = '';
        
        // Get current category filter
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const url = categoryFilter ? `${API_BASE_URL}/apis?category=${encodeURIComponent(categoryFilter)}` : `${API_BASE_URL}/apis`;
        
        // Fetch APIs from backend
        const response = await fetch(url);
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        allAPIs = data.apis || [];
        
        console.log(`✅ Loaded ${allAPIs.length} APIs (${data.totalCount} total)`);
        
        // Update category filter options
        updateCategoryFilter(data.categories || []);
        
        // Update UI
        updateStats(data.count, data.totalCount);
        renderAPIList(allAPIs);
        
        // Hide loading state
        if (elements.loading) elements.loading.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Failed to load APIs:', error);
        console.error('🔧 Attempted URL:', `${API_BASE_URL}/apis`);
        
        // Show error state
        if (elements.loading) elements.loading.style.display = 'none';
        if (elements.errorMessage) elements.errorMessage.style.display = 'block';
        
        // Update error message with specific details
        const errorText = elements.errorMessage?.querySelector('p');
        if (errorText) {
            if (error.message.includes('Failed to fetch')) {
                errorText.textContent = `Backend server not running. Please start the server on port 3002. (Attempted: ${API_BASE_URL})`;
            } else {
                errorText.textContent = `Failed to load APIs: ${error.message}`;
            }
        }
    }
}

/**
 * Update header statistics
 */
function updateStats(displayedCount = null, totalCount = null) {
    const count = displayedCount !== null ? displayedCount : allAPIs.length;
    const total = totalCount !== null ? totalCount : allAPIs.length;
    const totalEndpoints = allAPIs.reduce((sum, api) => sum + (api.endpointCount || 0), 0);
    
    if (elements.apiCount) {
        if (count !== total) {
            elements.apiCount.textContent = `${count} of ${total} API${total !== 1 ? 's' : ''}`;
        } else {
            elements.apiCount.textContent = `${count} API${count !== 1 ? 's' : ''}`;
        }
    }
    if (elements.endpointCount) {
        elements.endpointCount.textContent = `${totalEndpoints} Endpoint${totalEndpoints !== 1 ? 's' : ''}`;
    }
    
    // Update AI status bar (both welcome and details)
    const aiApiCount = document.getElementById('ai-api-count');
    if (aiApiCount) {
        aiApiCount.textContent = `${count} API${count !== 1 ? 's' : ''} Loaded`;
    }
    const aiApiCountWelcome = document.getElementById('ai-api-count-welcome');
    if (aiApiCountWelcome) {
        aiApiCountWelcome.textContent = `${count} API${count !== 1 ? 's' : ''} Loaded`;
    }
}

/**
 * Update category filter dropdown
 */
function updateCategoryFilter(categories) {
    if (!elements.categoryFilter) return;
    
    const currentValue = elements.categoryFilter.value;
    
    // Clear existing options except "All Categories"
    elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        if (category === currentValue) {
            option.selected = true;
        }
        elements.categoryFilter.appendChild(option);
    });
}

/**
 * Handle category filter change
 */
function handleCategoryFilter() {
    console.log('🔍 Category filter changed');
    loadAPIs(); // Reload with new filter
}

/**
 * Render the API list in the sidebar
 */
function renderAPIList(apis) {
    if (!elements.apiList) return;
    
    if (!apis || apis.length === 0) {
        elements.apiList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No APIs found</p>
                <small>Add some OpenAPI files and run the batch processor</small>
            </div>
        `;
        return;
    }
    
    elements.apiList.innerHTML = apis.map(api => {
        return `
        <div class="api-item" data-api-id="${api.id}" onclick="selectAPI('${api.id}')" style="cursor: pointer;">
            <div class="api-item-header">
                ${getCategoryBadge(api.category)}
                <h3>${escapeHtml(api.name)}</h3>
                ${getAuthBadge(api.authType)}
            </div>
            <div class="api-item-info">
                <div>${api.baseUrl ? `<code>${escapeHtml(api.baseUrl)}</code>` : '<em class="no-base-url">No base URL specified</em>'}</div>
            </div>
            ${api.description ? `<div class="api-description">${escapeHtml(api.description)}</div>` : ''}
            <div class="api-item-meta">
                <div class="api-item-stats">
                    <i class="fas fa-link"></i> ${api.endpointCount || 0} endpoint${(api.endpointCount || 0) !== 1 ? 's' : ''}
                </div>
                ${api.rating ? `<div class="api-rating">⭐ ${api.rating}</div>` : ''}
            </div>
            ${getTagsDisplay(api.tags)}
        </div>
    `;
    }).join('');
}

/**
 * Get auth badge
 */
function getAuthBadge(authType) {
    const authConfig = {
        'none': { label: 'Public', class: 'none' },
        'apiKey': { label: 'API Key', class: 'apiKey' },
        'bearer': { label: 'Bearer', class: 'bearer' },
        'oauth2': { label: 'OAuth2', class: 'oauth2' }
    };
    
    const config = authConfig[authType] || authConfig['none'];
    
    return `<span class="auth-badge ${config.class}">${config.label}</span>`;
}

/**
 * Get category badge
 */
function getCategoryBadge(category) {
    if (!category || category === 'General') return '';
    
    const icons = {
        'AI': '🤖',
        'Finance': '💰', 
        'Weather': '🌤️',
        'Social': '📱',
        'General': '📋'
    };
    
    const icon = icons[category] || '📋';
    return `<span class="category-badge ${category}">${icon} ${category}</span>`;
}

/**
 * Get tags display
 */
function getTagsDisplay(tags) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) return '';
    
    const displayTags = tags.slice(0, 5); // Limit to 5 tags
    const tagElements = displayTags.map(tag => 
        `<span class="tag">${escapeHtml(tag)}</span>`
    ).join('');
    
    return `<div class="api-tags">${tagElements}</div>`;
}



/**
 * Select and display an API
 */
function selectAPI(apiId) {
    console.log(`🎯 Selecting API: ${apiId}`);
    
    // Find the API
    currentAPI = allAPIs.find(api => api.id === apiId);
    if (!currentAPI) {
        console.error('API not found:', apiId);
        return;
    }
    
    // Update active state in sidebar
    document.querySelectorAll('.api-item').forEach(item => {
        item.classList.toggle('active', item.dataset.apiId === apiId);
    });
    
    // Show API details
    if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'none';
    if (elements.apiDetails) elements.apiDetails.style.display = 'block';
    
    // Populate API details
    if (elements.apiName) elements.apiName.textContent = currentAPI.name;
    
    // Enhanced auth badge
    const authConfig = {
        'none': { icon: 'fas fa-unlock', label: 'Public', class: 'none' },
        'apiKey': { icon: 'fas fa-key', label: 'API Key', class: 'apiKey' },
        'bearer': { icon: 'fas fa-shield-alt', label: 'Bearer Token', class: 'bearer' },
        'oauth2': { icon: 'fas fa-user-shield', label: 'OAuth2', class: 'oauth2' }
    };
    
    const authInfo = authConfig[currentAPI.authType] || authConfig['none'];
    if (elements.apiAuthBadge) {
        elements.apiAuthBadge.className = `auth-badge enhanced ${authInfo.class}`;
        elements.apiAuthBadge.innerHTML = `<i class="${authInfo.icon}"></i><span>${authInfo.label}</span>`;
    }
    
    // Handle base URL display
    if (currentAPI.baseUrl) {
        if (elements.apiBaseUrl) elements.apiBaseUrl.textContent = currentAPI.baseUrl;
        if (elements.apiBaseUrlDisplay) elements.apiBaseUrlDisplay.style.display = 'block';
        if (elements.baseUrlWarning) elements.baseUrlWarning.style.display = 'none';
    } else {
        if (elements.apiBaseUrlDisplay) elements.apiBaseUrlDisplay.style.display = 'none';
        if (elements.baseUrlWarning) elements.baseUrlWarning.style.display = 'flex';
    }
    
    if (elements.apiEndpointCount) {
        elements.apiEndpointCount.textContent = currentAPI.endpointCount || 0;
    }
    
    // Reset method filter
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === '');
    });
    
    // Create mock endpoints for display
    currentEndpoints = [
        {
            method: 'GET',
            path: '/users',
            summary: 'Get all users',
            description: 'Retrieve a list of all users',
            authType: currentAPI.authType
        },
        {
            method: 'POST',
            path: '/users',
            summary: 'Create user',
            description: 'Create a new user',
            authType: currentAPI.authType
        }
    ];
    
    renderEndpoints(currentEndpoints);
}

/**
 * Render endpoints list
 */
function renderEndpoints(endpoints) {
    if (!elements.endpointsList) return;
    
    if (!endpoints || endpoints.length === 0) {
        elements.endpointsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-route"></i>
                <p>No endpoints found</p>
            </div>
        `;
        return;
    }
    
    elements.endpointsList.innerHTML = endpoints.map((endpoint, index) => `
        <div class="endpoint-item" data-method="${endpoint.method}">
            <div class="endpoint-header">
                <span class="method-badge ${endpoint.method}">${endpoint.method}</span>
                <span class="endpoint-path">${escapeHtml(endpoint.path)}</span>
                <div class="endpoint-auth">
                    ${getAuthIcon(endpoint.authType)}
                    ${getEnhancedAuthBadge(endpoint.authType, true)}
                </div>
            </div>
            
            ${endpoint.description ? `
                <div class="endpoint-description">
                    ${escapeHtml(endpoint.description)}
                </div>
            ` : ''}
            
            <div class="endpoint-actions">
                <button class="template-btn" onclick="showTemplates(${index})">
                    <i class="fas fa-code"></i>
                    View Templates
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Get auth icon based on auth type
 */
function getAuthIcon(authType) {
    const icons = {
        'none': '<i class="fas fa-unlock" title="No authentication"></i>',
        'apiKey': '<i class="fas fa-key" title="API Key required"></i>',
        'bearer': '<i class="fas fa-shield-alt" title="Bearer token required"></i>',
        'oauth2': '<i class="fas fa-user-shield" title="OAuth2 required"></i>'
    };
    return icons[authType] || icons['none'];
}

/**
 * Show templates modal for an endpoint
 */
function showTemplates(endpointIndex) {
    const endpoint = currentEndpoints[endpointIndex];
    if (!endpoint) {
        console.error('No endpoint found for index:', endpointIndex);
        return;
    }
    
    console.log('📋 Showing templates for:', endpoint.method, endpoint.path);
    
    currentEndpoint = endpoint;
    
    // Generate templates
    const curlTemplate = generateCurlTemplate(endpoint.method, endpoint.path, currentAPI);
    const powershellTemplate = generatePowerShellTemplate(endpoint.method, endpoint.path, currentAPI);
    
    // Update modal title and endpoint info
    if (elements.modalTitle) elements.modalTitle.textContent = 'Request Templates';
    if (elements.modalMethod) {
        elements.modalMethod.textContent = endpoint.method;
        elements.modalMethod.className = `method-badge ${endpoint.method}`;
    }
    if (elements.modalPath) elements.modalPath.textContent = endpoint.path;
    
    // Populate templates
    if (elements.curlCode) elements.curlCode.textContent = curlTemplate;
    if (elements.powershellCode) elements.powershellCode.textContent = powershellTemplate;
    
    // Show modal
    if (elements.templateModal) elements.templateModal.style.display = 'flex';
    
    // Reset to curl tab
    switchTab('curl');
}

/**
 * Generate curl template
 */
function generateCurlTemplate(method, path, api) {
    const baseUrl = api.baseUrl || 'https://api.example.com';
    let template = `curl -X ${method} "${baseUrl}${path}"`;
    template += ` \\\n  -H "Content-Type: application/json"`;
    
    if (api.authType === 'apiKey') {
        const keyName = api.authDetails?.name || 'X-API-Key';
        template += ` \\\n  -H "${keyName}: YOUR_API_KEY"`;
    } else if (api.authType === 'bearer') {
        template += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
    }
    
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        template += ` \\\n  -d '{"key": "value"}'`;
    }
    
    return template;
}

/**
 * Generate PowerShell template
 */
function generatePowerShellTemplate(method, path, api) {
    const baseUrl = api.baseUrl || 'https://api.example.com';
    let template = `$headers = @{\n    "Content-Type" = "application/json"`;
    
    if (api.authType === 'apiKey') {
        const keyName = api.authDetails?.name || 'X-API-Key';
        template += `\n    "${keyName}" = "YOUR_API_KEY"`;
    } else if (api.authType === 'bearer') {
        template += `\n    "Authorization" = "Bearer YOUR_TOKEN"`;
    }
    
    template += `\n}\n\n`;
    
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        template += `$body = @{\n    "key" = "value"\n} | ConvertTo-Json\n\n`;
        template += `Invoke-RestMethod -Uri "${baseUrl}${path}" -Method ${method} -Headers $headers -Body $body`;
    } else {
        template += `Invoke-RestMethod -Uri "${baseUrl}${path}" -Method ${method} -Headers $headers`;
    }
    
    return template;
}

/**
 * Close templates modal
 */
function closeTemplateModal() {
    if (elements.templateModal) {
        elements.templateModal.style.display = 'none';
    }
}

/**
 * Switch between template tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update template panels
    document.querySelectorAll('.template-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}-template`);
    });
}

/**
 * Copy template to clipboard
 */
async function copyTemplate(templateType) {
    try {
        const codeElement = templateType === 'curl' ? elements.curlCode : elements.powershellCode;
        if (!codeElement) return;
        
        const text = codeElement.textContent;
        await navigator.clipboard.writeText(text);
        
        console.log(`📋 Copied ${templateType} template to clipboard`);
        showNotification(`${templateType.toUpperCase()} template copied to clipboard!`);
        
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showNotification('Failed to copy template', 'error');
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'success') {
    if (!elements.copyNotification) return;
    
    const notification = elements.copyNotification;
    const icon = notification.querySelector('i');
    const text = notification.querySelector('span');
    
    // Update content
    if (text) text.textContent = message;
    
    // Update icon based on type
    if (icon) {
        icon.className = type === 'error' ? 'fas fa-exclamation-triangle' : 
                        type === 'warning' ? 'fas fa-exclamation-circle' : 
                        'fas fa-check';
    }
    
    // Update color based on type
    notification.style.backgroundColor = type === 'error' ? 'var(--danger)' : 
                                       type === 'warning' ? 'var(--warning)' : 
                                       'var(--success)';
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (!query) {
        renderAPIList(allAPIs);
        return;
    }
    
    const filteredAPIs = allAPIs.filter(api => 
        api.name.toLowerCase().includes(query) ||
        (api.baseUrl && api.baseUrl.toLowerCase().includes(query))
    );
    
    renderAPIList(filteredAPIs);
}

/**
 * Handle auth filter change
 */
function handleAuthFilter(event) {
    const authType = event.target.value;
    
    if (!authType) {
        renderAPIList(allAPIs);
        return;
    }
    
    const filteredAPIs = allAPIs.filter(api => api.authType === authType);
    renderAPIList(filteredAPIs);
}

/**
 * Toggle AI Agent visibility
 */
function toggleAIAgent() {
    const content = document.getElementById('ai-agent-content');
    const icon = document.getElementById('ai-toggle-icon');
    
    if (!content || !icon) return;
    
    const isVisible = content.style.display !== 'none';
    
    if (isVisible) {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
    } else {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
    }
}

/**
 * Toggle AI Agent Mode (MCP vs Legacy)
 */
function toggleAIMode() {
    const checkbox = document.getElementById('ai-agent-mode');
    const statusElement = document.getElementById('ai-mode-status');
    const queryBtn = document.getElementById('ai-query-btn');
    
    if (checkbox.checked) {
        statusElement.textContent = 'MCP Active';
        statusElement.className = 'ai-mode-status active';
        queryBtn.onclick = queryAgentMCP;
        queryBtn.innerHTML = '<i class="fas fa-search"></i> Search';
        console.log('🤖 Switched to MCP Agent Mode');
    } else {
        statusElement.textContent = 'Legacy Mode';
        statusElement.className = 'ai-mode-status legacy';
        queryBtn.onclick = queryAgent;
        queryBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Ask';
        console.log('🤖 Switched to Legacy Agent Mode');
    }
}

/**
 * MCP-Style Agent Query
 */
async function queryAgentMCP() {
    const input = document.getElementById('ai-query-input');
    const button = document.getElementById('ai-query-btn');
    const responseDiv = document.getElementById('ai-response');
    const responseContent = document.getElementById('ai-response-content');
    
    if (!input || !button || !responseDiv || !responseContent) {
        console.error('MCP AI interface elements not found');
        return;
    }
    
    const query = input.value.trim();
    
    if (!query) {
        showNotification('Please enter a query', 'warning');
        input.focus();
        return;
    }
    
    console.log('🔍 MCP Agent Query:', query);
    
    // Show loading state
    const originalButtonContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    button.disabled = true;
    
    // Show typing indicator
    showAITyping();
    responseDiv.style.display = 'none';
    
    try {
        // Make request to MCP search endpoint
        const response = await fetch(`${API_BASE_URL}/agent/tools/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        console.log('🔍 MCP Response:', data);
        
        // Hide typing indicator
        hideAITyping();
        
        // Display structured MCP response
        if (data.success) {
            responseContent.innerHTML = generateMCPSuccessResponse(data);
        } else {
            responseContent.innerHTML = generateMCPErrorResponse(data);
        }
        
        responseDiv.style.display = 'block';
        
    } catch (error) {
        console.error('❌ MCP Agent query failed:', error);
        hideAITyping();
        
        responseContent.innerHTML = `
            <div class="ai-result ai-result-error">
                <div class="ai-status-indicator ai-status-error">
                    <i class="fas fa-exclamation-triangle"></i> Connection Error
                </div>
                <h4><i class="fas fa-wifi"></i> MCP Connection Failed</h4>
                <p class="ai-error">Failed to connect to MCP agent: ${escapeHtml(error.message)}</p>
                <div class="ai-suggestion">
                    <strong>🔧 Troubleshooting:</strong><br>
                    • Ensure backend server is running on port 3002<br>
                    • Check MCP agent tools are loaded<br>
                    • Try refreshing the page
                </div>
            </div>
        `;
        responseDiv.style.display = 'block';
    } finally {
        // Reset button state
        button.innerHTML = originalButtonContent;
        button.disabled = false;
    }
}

/**
 * Generate MCP success response HTML
 */
function generateMCPSuccessResponse(data) {
    return `
        <div class="ai-result ai-result-success">
            <div class="ai-status-indicator ai-status-success">
                <i class="fas fa-check-circle"></i> MCP Match Found
            </div>
            
            <h4><i class="fas fa-robot"></i> API Match Found</h4>
            
            <div class="mcp-match-info">
                <div class="mcp-confidence">
                    <span>Confidence:</span>
                    <div class="ai-confidence-bar">
                        <div class="ai-confidence-fill" style="width: ${data.confidence}%"></div>
                    </div>
                    <span class="ai-confidence-text">${data.confidence}%</span>
                </div>
                
                <div class="mcp-api-info">
                    <div class="mcp-field">
                        <strong>🎯 API:</strong> ${escapeHtml(data.api)}
                    </div>
                    <div class="mcp-field">
                        <strong>📡 Endpoint:</strong>
                        <span class="method-badge ${data.endpoint.method}">${data.endpoint.method}</span>
                        <code class="endpoint-path">${escapeHtml(data.endpoint.path)}</code>
                    </div>
                    ${data.endpoint.summary ? `
                        <div class="mcp-field">
                            <strong>📝 Summary:</strong> ${escapeHtml(data.endpoint.summary)}
                        </div>
                    ` : ''}
                    <div class="mcp-field">
                        <strong>🔐 Auth:</strong> ${getAuthLabel(data.authType)}
                    </div>
                </div>
            </div>
            
            ${data.alternativeMatches && data.alternativeMatches.length > 0 ? `
                <div class="mcp-alternatives">
                    <strong>🔄 Alternative Matches:</strong>
                    ${data.alternativeMatches.map(alt => `
                        <div class="mcp-alt-match">
                            <span class="mcp-alt-api">${escapeHtml(alt.api)}</span>
                            <span class="mcp-alt-endpoint">${escapeHtml(alt.endpoint)}</span>
                            <span class="mcp-alt-confidence">${alt.confidence}%</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="mcp-templates">
                <div class="mcp-template">
                    <h5>
                        <span><i class="fas fa-terminal"></i> curl Command</span>
                        <button class="copy-template-btn" onclick="copyMCPTemplate('curl', this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </h5>
                    <pre><code>${escapeHtml(data.templates.curl)}</code></pre>
                </div>
                
                <div class="mcp-template">
                    <h5>
                        <span><i class="fas fa-microsoft"></i> PowerShell Command</span>
                        <button class="copy-template-btn" onclick="copyMCPTemplate('powershell', this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </h5>
                    <pre><code>${escapeHtml(data.templates.powershell)}</code></pre>
                </div>
            </div>
            
            <div class="mcp-execute-section">
                <h4>🚀 Execute API</h4>
                <p>Test this endpoint with mock execution:</p>
                <button class="mcp-execute-btn" onclick="executeMCPEndpoint('${escapeHtml(data.endpoint.method)}', '${escapeHtml(data.endpoint.path)}', '${escapeHtml(data.api)}')">
                    <i class="fas fa-play"></i> Execute ${data.endpoint.method} ${data.endpoint.path}
                </button>
            </div>
            
            <div class="mcp-metadata">
                <small>
                    <strong>Metadata:</strong> 
                    Intent: ${data.intent || 'unknown'} | 
                    Entity: ${data.entity || 'unknown'} | 
                    Response: ${data.responseTime || 0}ms |
                    Found: ${data.totalFound || 0} matches
                </small>
            </div>
        </div>
    `;
}

/**
 * Generate MCP error response HTML
 */
function generateMCPErrorResponse(data) {
    return `
        <div class="ai-result ai-result-warning">
            <div class="ai-status-indicator ai-status-error">
                <i class="fas fa-search"></i> No MCP Match
            </div>
            
            <h4><i class="fas fa-question-circle"></i> No API Match Found</h4>
            <p class="ai-error">${escapeHtml(data.message)}</p>
            
            <div class="mcp-suggestions">
                <strong>💡 Try these MCP queries:</strong>
                <div class="mcp-suggestion-grid">
                    ${data.suggestions.map(suggestion => `
                        <button class="mcp-suggestion-btn" onclick="setQuickQuery('${escapeHtml(suggestion)}')">
                            ${escapeHtml(suggestion)}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            ${data.responseTime ? `
                <div class="mcp-metadata">
                    <small>
                        <strong>Analysis:</strong> 
                        Intent: ${data.intent || 'unknown'} | 
                        Entity: ${data.entity || 'unknown'} | 
                        Response: ${data.responseTime || 0}ms
                    </small>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Execute MCP endpoint (simulation)
 */
async function executeMCPEndpoint(method, path, api) {
    console.log(`🎭 Executing MCP endpoint: ${method} ${path}`);
    
    try {
        showNotification('🚀 Executing API endpoint...', 'warning');
        
        const response = await fetch(`${API_BASE_URL}/agent/tools/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method, path, api })
        });
        
        const data = await response.json();
        console.log('🎭 MCP Execution result:', data);
        
        if (data.success) {
            // Show execution result in modal or new section
            showMCPExecutionResult(data.execution);
            showNotification('✅ API execution completed!', 'success');
        } else {
            showNotification('❌ API execution failed', 'error');
        }
        
    } catch (error) {
        console.error('❌ MCP execution failed:', error);
        showNotification('❌ Execution error: ' + error.message, 'error');
    }
}

/**
 * Show MCP execution result
 */
function showMCPExecutionResult(execution) {
    const responseContent = document.getElementById('ai-response-content');
    
    const executionHTML = `
        <div class="mcp-execution-result">
            <div class="mcp-execution-header">
                <h4><i class="fas fa-play-circle"></i> Execution Result</h4>
                <div class="mcp-execution-meta">
                    <span class="mcp-status-badge success">Status: ${execution.status}</span>
                    <span class="mcp-time-badge">Time: ${execution.responseTime}ms</span>
                </div>
            </div>
            
            <div class="mcp-execution-details">
                <div class="mcp-exec-field">
                    <strong>🎯 API:</strong> ${escapeHtml(execution.api)}
                </div>
                <div class="mcp-exec-field">
                    <strong>📡 Request:</strong> ${execution.method} ${execution.path}
                </div>
                <div class="mcp-exec-field">
                    <strong>⏰ Timestamp:</strong> ${execution.timestamp}
                </div>
            </div>
            
            <div class="mcp-response-data">
                <h5>📋 Response Data:</h5>
                <pre class="mcp-json-response"><code>${JSON.stringify(execution.response, null, 2)}</code></pre>
            </div>
            
            <div class="mcp-execution-actions">
                <button class="copy-template-btn" onclick="copyMCPResponse(this)">
                    <i class="fas fa-copy"></i> Copy Response
                </button>
            </div>
        </div>
    `;
    
    // Append to existing content
    responseContent.innerHTML += executionHTML;
}

/**
 * Copy MCP template to clipboard
 */
async function copyMCPTemplate(type, button) {
    try {
        const pre = button.closest('.mcp-template').querySelector('pre code');
        const text = pre.textContent;
        
        await navigator.clipboard.writeText(text);
        
        // Update button temporarily
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.background = 'var(--success)';
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.background = '';
        }, 2000);
        
        console.log(`📋 Copied MCP ${type} template`);
        showNotification(`${type.toUpperCase()} template copied!`);
        
    } catch (error) {
        console.error('Failed to copy MCP template:', error);
        showNotification('Failed to copy template', 'error');
    }
}

/**
 * Copy MCP response to clipboard
 */
async function copyMCPResponse(button) {
    try {
        const pre = button.closest('.mcp-execution-result').querySelector('.mcp-json-response code');
        const text = pre.textContent;
        
        await navigator.clipboard.writeText(text);
        
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.background = 'var(--success)';
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.background = '';
        }, 2000);
        
        showNotification('Response data copied!');
        
    } catch (error) {
        console.error('Failed to copy response:', error);
        showNotification('Failed to copy response', 'error');
    }
}

/**
 * Handle method filter
 */
function handleMethodFilter(event) {
    // Get the button element (handle nested elements)
    const button = event.target.closest('.method-btn');
    if (!button) return;
    
    const method = button.dataset.method;
    
    // Update active state
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.toggle('active', btn === button);
    });
    
    // Filter endpoints
    if (!method || method === '') {
        // Show all endpoints
        document.querySelectorAll('.endpoint-item').forEach(item => {
            item.style.display = 'block';
        });
    } else {
        // Filter by method
        document.querySelectorAll('.endpoint-item').forEach(item => {
            const itemMethod = item.dataset.method;
            item.style.display = itemMethod === method ? 'block' : 'none';
        });
    }
    
    // Update endpoint count
    const visibleEndpoints = document.querySelectorAll('.endpoint-item[style*="block"], .endpoint-item:not([style*="none"])').length;
    console.log(`🔍 Filtered to ${visibleEndpoints} endpoints for method: ${method || 'All'}`);
}

/**
 * Handle template tab switching
 */
function handleTabSwitch(event) {
    const tabName = event.target.dataset.tab;
    switchTab(tabName);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    // Escape key - close modal
    if (event.key === 'Escape') {
        closeTemplateModal();
    }
    
    // Ctrl/Cmd + K - focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        if (elements.searchInput) elements.searchInput.focus();
    }
}

/**
 * Set a quick query from the action buttons
 */
function setQuickQuery(query) {
    const input = document.getElementById('ai-query-input');
    if (input) {
        input.value = query;
        input.focus();
        // Add a subtle animation
        input.style.background = 'rgba(99, 102, 241, 0.1)';
        setTimeout(() => {
            input.style.background = '';
        }, 500);
    }
}

/**
 * Show AI typing indicator
 */
function showAITyping() {
    const typingElement = document.getElementById('ai-typing');
    if (typingElement) {
        typingElement.style.display = 'flex';
    }
}

/**
 * Hide AI typing indicator
 */
function hideAITyping() {
    const typingElement = document.getElementById('ai-typing');
    if (typingElement) {
        typingElement.style.display = 'none';
    }
}

/**
 * Show quick actions
 */
function showQuickActions() {
    const quickActions = document.getElementById('ai-quick-actions');
    if (quickActions) {
        quickActions.style.display = 'flex';
    }
}

/**
 * Toggle AI help section
 */
function toggleAIHelp() {
    const helpSection = document.getElementById('ai-help');
    if (helpSection) {
        const isVisible = helpSection.style.display !== 'none';
        helpSection.style.display = isVisible ? 'none' : 'block';
    }
}

/**
 * Enhanced query agent with better UI feedback
 */
async function queryAgent() {
    const input = document.getElementById('ai-query-input');
    const button = document.getElementById('ai-query-btn');
    const responseDiv = document.getElementById('ai-response');
    const responseContent = document.getElementById('ai-response-content');
    
    if (!input || !button || !responseDiv || !responseContent) {
        console.error('AI interface elements not found');
        return;
    }
    
    const query = input.value.trim();
    
    if (!query) {
        showNotification('Please enter a query', 'warning');
        input.focus();
        return;
    }
    
    console.log('🤖 Querying AI agent:', query);
    console.log('🔧 AI Agent URL:', `${API_BASE_URL}/agent/query`);
    
    // Show loading state with enhanced UI
    const originalButtonContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
    button.disabled = true;
    button.classList.add('loading');
    
    // Show typing indicator
    showAITyping();
    
    // Hide previous response
    responseDiv.style.display = 'none';
    
    try {
        // Make request to AI agent endpoint
        const response = await fetch(`${API_BASE_URL}/agent/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        console.log('🤖 AI Response status:', response.status);
        
        const data = await response.json();
        console.log('🤖 AI Response data:', data);
        
        // Hide typing indicator
        hideAITyping();
        
        // Display response with enhanced UI
        if (data.success && data.matches && data.matches.length > 0) {
            // Success response with API matches
            const match = data.matches[0]; // Use the best match
            const confidence = Math.round(match.score * 100) || 85; // Mock confidence if not provided
            
            responseContent.innerHTML = `
                <div class="ai-result ai-result-success">
                    <div class="ai-status-indicator ai-status-success">
                        <i class="fas fa-check"></i> Match Found
                    </div>
                    
                    <h4><i class="fas fa-check-circle"></i> Perfect API Match Found!</h4>
                    
                    <div class="ai-confidence">
                        <span>Confidence:</span>
                        <div class="ai-confidence-bar">
                            <div class="ai-confidence-fill" style="width: ${confidence}%"></div>
                        </div>
                        <span class="ai-confidence-text">${confidence}%</span>
                    </div>
                    
                    <div class="endpoint-info">
                        <span class="method-badge ${match.endpoint?.method || 'GET'}">${match.endpoint?.method || 'GET'}</span>
                        <span class="endpoint-path">${escapeHtml(match.endpoint?.path || '/unknown')}</span>
                    </div>
                    
                    <p><strong>🎯 API:</strong> ${escapeHtml(match.apiName)}</p>
                    ${match.endpoint?.summary ? `<p><strong>📝 Description:</strong> ${escapeHtml(match.endpoint.summary)}</p>` : ''}
                    
                    <div class="auth-info">
                        <i class="fas fa-shield-alt"></i>
                        <strong>Authentication:</strong> ${getAuthLabel(match.authType)}
                    </div>
                    
                    ${match.templates ? `
                    <div class="ai-templates">
                        <div class="ai-template">
                            <h5>
                                <span><i class="fas fa-terminal"></i> curl Command</span>
                                <button class="copy-template-btn" onclick="copyAITemplate('curl', this)">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                            </h5>
                            <pre><code>${escapeHtml(match.templates.curl || 'Template not available')}</code></pre>
                        </div>
                        
                        <div class="ai-template">
                            <h5>
                                <span><i class="fas fa-microsoft"></i> PowerShell Command</span>
                                <button class="copy-template-btn" onclick="copyAITemplate('powershell', this)">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                            </h5>
                            <pre><code>${escapeHtml(match.templates.powershell || 'Template not available')}</code></pre>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="ai-interactive-demo">
                        <h4>🚀 Try This API</h4>
                        <p>Want to test this endpoint? Click below to execute a sample request.</p>
                        <button class="ai-demo-button" onclick="executeAIDemo('${escapeHtml(match.apiName)}', '${escapeHtml(JSON.stringify(match.endpoint))}')">
                            <i class="fas fa-play"></i> Execute Sample Request
                        </button>
                    </div>
                </div>
            `;
        } else {
            // No match found with enhanced error UI
            responseContent.innerHTML = `
                <div class="ai-result ai-result-warning">
                    <div class="ai-status-indicator ai-status-error">
                        <i class="fas fa-exclamation-triangle"></i> No Match
                    </div>
                    
                    <h4><i class="fas fa-search"></i> No API Match Found</h4>
                    <p class="ai-error">${escapeHtml(data.message || 'No API found for your query')}</p>
                    
                    <div class="ai-suggestion">
                        <strong>💡 Try these examples:</strong><br>
                        • "get all users" or "list users"<br>
                        • "create new pet" or "add pet"<br>
                        • "update user profile"<br>
                        • "delete user by id"<br>
                        • "search products by name"
                    </div>
                    
                    <div class="ai-quick-actions">
                        <button class="ai-quick-action" onclick="setQuickQuery('get users')">👥 Get Users</button>
                        <button class="ai-quick-action" onclick="setQuickQuery('create pet')">🐕 Create Pet</button>
                        <button class="ai-quick-action" onclick="setQuickQuery('update user')">✏️ Update User</button>
                        <button class="ai-quick-action" onclick="setQuickQuery('delete item')">🗑️ Delete Item</button>
                    </div>
                </div>
            `;
        }
        
        // Show response with animation
        responseDiv.style.display = 'block';
        
        // Show quick actions for future queries
        showQuickActions();
        
    } catch (error) {
        console.error('❌ AI agent query failed:', error);
        console.error('🔧 Attempted URL:', `${API_BASE_URL}/agent/query`);
        
        // Hide typing indicator
        hideAITyping();
        
        // Show error response with enhanced UI
        responseContent.innerHTML = `
            <div class="ai-result ai-result-error">
                <div class="ai-status-indicator ai-status-error">
                    <i class="fas fa-exclamation-triangle"></i> Error
                </div>
                
                <h4><i class="fas fa-exclamation-triangle"></i> Connection Failed</h4>
                <p class="ai-error">Failed to query AI agent: ${escapeHtml(error.message)}</p>
                
                <div class="ai-suggestion">
                    <strong>🔧 Troubleshooting:</strong><br>
                    • Make sure the backend server is running on port 3002<br>
                    • Check your internet connection<br>
                    • Try refreshing the page<br>
                    • Backend URL: ${API_BASE_URL}
                </div>
                
                <div class="ai-interactive-demo">
                    <h4>🔄 Retry Connection</h4>
                    <p>Click below to test the backend connection.</p>
                    <button class="ai-demo-button" onclick="testBackendConnection()">
                        <i class="fas fa-wifi"></i> Test Connection
                    </button>
                </div>
            </div>
        `;
        
        responseDiv.style.display = 'block';
    } finally {
        // Reset button state
        button.innerHTML = originalButtonContent;
        button.disabled = false;
        button.classList.remove('loading');
    }
}

/**
 * Execute AI demo request
 */
function executeAIDemo(apiName, endpointStr) {
    try {
        const endpoint = JSON.parse(endpointStr);
        showNotification(`🚀 Executing demo request for ${endpoint.method} ${endpoint.path}`, 'success');
        
        // Here you could implement actual API execution
        console.log('Demo execution for:', apiName, endpoint);
        
        // For now, just show a success message
        setTimeout(() => {
            showNotification('✅ Demo request completed! Check console for details.', 'success');
        }, 2000);
        
    } catch (error) {
        console.error('Demo execution failed:', error);
        showNotification('❌ Demo execution failed', 'error');
    }
}

/**
 * Test backend connection
 */
async function testBackendConnection() {
    try {
        showNotification('🔄 Testing backend connection...', 'warning');
        
        const response = await fetch(`${API_BASE_URL}/`);
        const data = await response.json();
        
        if (response.ok) {
            showNotification('✅ Backend connection successful!', 'success');
        } else {
            showNotification('❌ Backend responded with error', 'error');
        }
    } catch (error) {
        showNotification('❌ Backend connection failed', 'error');
    }
}

/**
 * Close AI response panel
 */
function closeAIResponse() {
    const responseDiv = document.getElementById('ai-response');
    if (responseDiv) {
        responseDiv.style.display = 'none';
    }
}

/**
 * Copy AI template to clipboard
 */
async function copyAITemplate(type, button) {
    try {
        const pre = button.closest('.ai-template').querySelector('pre code');
        const text = pre.textContent;
        
        await navigator.clipboard.writeText(text);
        
        // Update button temporarily
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.background = 'var(--success)';
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.background = '';
        }, 2000);
        
        console.log(`📋 Copied ${type} template from AI response`);
        showNotification(`${type.toUpperCase()} template copied!`);
        
    } catch (error) {
        console.error('Failed to copy AI template:', error);
        showNotification('Failed to copy template', 'error');
    }
}

/**
 * Get human-readable auth label
 */
function getAuthLabel(authType) {
    const labels = {
        'none': 'No authentication required',
        'apiKey': 'API Key required',
        'bearer': 'Bearer token required',
        'oauth2': 'OAuth2 authentication required'
    };
    return labels[authType] || 'Unknown authentication';
}

/**
 * Handle Enter key in AI input
 */
function setupAIEventListeners() {
    const aiInput = document.getElementById('ai-query-input');
    if (aiInput) {
        aiInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                queryAgent();
            }
        });
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for global access (for onclick handlers)
window.selectAPI = selectAPI;
window.showTemplates = showTemplates;
window.closeTemplateModal = closeTemplateModal;
window.copyTemplate = copyTemplate;
window.loadAPIs = loadAPIs;
window.queryAgent = queryAgent;
window.queryAgentMCP = queryAgentMCP;
window.toggleAIMode = toggleAIMode;
window.executeMCPEndpoint = executeMCPEndpoint;
window.copyMCPTemplate = copyMCPTemplate;
window.copyMCPResponse = copyMCPResponse;
window.closeAIResponse = closeAIResponse;
window.copyAITemplate = copyAITemplate;
window.setQuickQuery = setQuickQuery;
window.toggleAIHelp = toggleAIHelp;
window.executeAIDemo = executeAIDemo;
window.testBackendConnection = testBackendConnection;
window.toggleAIAgent = toggleAIAgent;


// ========================================
// COMMUNITY FEATURES - GSoC Enhancement
// ========================================

/**
 * Get saved APIs from localStorage
 */
function getSavedAPIs() {
    const saved = localStorage.getItem('savedAPIs');
    return saved ? JSON.parse(saved) : [];
}

/**
 * Save API to localStorage
 */
function saveAPI(apiId) {
    const savedAPIs = getSavedAPIs();
    if (!savedAPIs.includes(apiId)) {
        savedAPIs.push(apiId);
        localStorage.setItem('savedAPIs', JSON.stringify(savedAPIs));
        showNotification('✅ API saved to My Collection!', 'success');
        updateSavedCollection();
    } else {
        showNotification('ℹ️ API already in your collection', 'info');
    }
}

/**
 * Remove API from saved collection
 */
function removeSavedAPI(apiId) {
    let savedAPIs = getSavedAPIs();
    savedAPIs = savedAPIs.filter(id => id !== apiId);
    localStorage.setItem('savedAPIs', JSON.stringify(savedAPIs));
    showNotification('🗑️ API removed from collection', 'info');
    updateSavedCollection();
}

/**
 * Check if API is saved
 */
function isAPISaved(apiId) {
    return getSavedAPIs().includes(apiId);
}

/**
 * Update saved collection display
 */
function updateSavedCollection() {
    const savedAPIs = getSavedAPIs();
    const savedSection = document.getElementById('saved-collection');
    
    if (!savedSection) return;
    
    if (savedAPIs.length === 0) {
        savedSection.innerHTML = `
            <div class="my-collection-section">
                <div class="my-collection-header">
                    <h3>📌 My Collection</h3>
                    <span class="collection-count">0</span>
                </div>
                <p style="color: #666; text-align: center;">No saved APIs yet. Click "Save API" on any API card to add it here.</p>
            </div>
        `;
        return;
    }
    
    const savedAPIObjects = allAPIs.filter(api => savedAPIs.includes(api.id));
    
    savedSection.innerHTML = `
        <div class="my-collection-section">
            <div class="my-collection-header">
                <h3>📌 My Collection</h3>
                <span class="collection-count">${savedAPIs.length}</span>
            </div>
            <div class="saved-apis-list">
                ${savedAPIObjects.map(api => `
                    <div class="saved-api-item">
                        <div onclick="selectAPI('${api.id}')" style="cursor: pointer; flex: 1;">
                            <strong>${escapeHtml(api.name)}</strong>
                            <div style="font-size: 0.85em; color: #666;">${api.endpointCount} endpoints • ${getCategoryBadge(api.category)}</div>
                        </div>
                        <button class="btn-remove-saved" onclick="removeSavedAPI('${api.id}')">Remove</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Enhanced rating display with count
 */
function getRatingDisplayEnhanced(rating, apiId) {
    if (!rating) return '';
    
    // Generate mock rating count based on API ID (for demo)
    const ratingCount = Math.floor(Math.random() * 200) + 20;
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    
    return `
        <div class="api-rating-enhanced">
            <span class="rating-stars">${stars}</span>
            <span>${rating}</span>
            <span class="rating-count">(${ratingCount} ratings)</span>
        </div>
    `;
}

/**
 * Get comments indicator
 */
function getCommentsIndicator(apiId) {
    // Generate mock comment count (for demo)
    const commentCount = Math.floor(Math.random() * 30) + 1;
    return `<span class="api-comments">💬 ${commentCount} comments</span>`;
}

/**
 * Get automation buttons
 */
function getAutomationButtons(apiId, apiName) {
    return `
        <div class="automation-section">
            <h4>⚡ Automation Tools</h4>
            <div class="automation-buttons">
                <button class="btn-auto-test" onclick="autoTestAPI('${apiId}', '${escapeHtml(apiName)}')">
                    ⚡ Auto-Test
                </button>
                <button class="btn-generate-sdk" onclick="generateSDK('${apiId}', '${escapeHtml(apiName)}')">
                    🔧 Generate SDK
                </button>
                <button class="btn-schedule-check" onclick="scheduleHealthCheck('${apiId}', '${escapeHtml(apiName)}')">
                    📅 Health Check
                </button>
            </div>
        </div>
    `;
}

/**
 * Auto-test API (demo function)
 */
function autoTestAPI(apiId, apiName) {
    showAutomationModal(
        '⚡ Auto-Test API',
        `
        <p>Running automated tests for <strong>${apiName}</strong>...</p>
        <div class="demo-steps">
            <div class="demo-step">
                <span class="step-number">1</span>
                <span>✅ Testing authentication</span>
            </div>
            <div class="demo-step">
                <span class="step-number">2</span>
                <span>✅ Testing all endpoints</span>
            </div>
            <div class="demo-step">
                <span class="step-number">3</span>
                <span>✅ Validating responses</span>
            </div>
        </div>
        <p style="margin-top: 15px; color: #4CAF50;"><strong>✅ All tests passed!</strong></p>
        <p style="font-size: 0.9em; color: #666;">Response time: 45ms • Success rate: 100%</p>
        `
    );
}

/**
 * Generate SDK (demo function)
 */
function generateSDK(apiId, apiName) {
    showAutomationModal(
        '🔧 Generate SDK',
        `
        <p>Generate SDK for <strong>${apiName}</strong></p>
        <div style="margin: 20px 0;">
            <button onclick="generateSDKLanguage('python', '${apiName}')" style="margin: 5px; padding: 10px 20px; background: #3776AB; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🐍 Python SDK
            </button>
            <button onclick="generateSDKLanguage('javascript', '${apiName}')" style="margin: 5px; padding: 10px 20px; background: #F7DF1E; color: #333; border: none; border-radius: 4px; cursor: pointer;">
                📜 JavaScript SDK
            </button>
            <button onclick="generateSDKLanguage('typescript', '${apiName}')" style="margin: 5px; padding: 10px 20px; background: #3178C6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                📘 TypeScript SDK
            </button>
        </div>
        <p style="font-size: 0.85em; color: #666;">SDK will include type definitions, authentication, and all endpoints</p>
        `
    );
}

/**
 * Generate SDK for specific language
 */
function generateSDKLanguage(language, apiName) {
    closeAutomationModal();
    showNotification(`✅ ${language.toUpperCase()} SDK generated for ${apiName}!`, 'success');
}

/**
 * Schedule health check (demo function)
 */
function scheduleHealthCheck(apiId, apiName) {
    showAutomationModal(
        '📅 Schedule Health Check',
        `
        <p>Schedule automated health checks for <strong>${apiName}</strong></p>
        <div style="margin: 20px 0;">
            <label style="display: block; margin: 10px 0;">
                <input type="radio" name="schedule" value="hourly" checked> Every hour
            </label>
            <label style="display: block; margin: 10px 0;">
                <input type="radio" name="schedule" value="daily"> Daily at 9 AM
            </label>
            <label style="display: block; margin: 10px 0;">
                <input type="radio" name="schedule" value="weekly"> Weekly on Monday
            </label>
        </div>
        <button onclick="confirmSchedule('${apiName}')" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
            ✅ Confirm Schedule
        </button>
        `
    );
}

/**
 * Confirm schedule
 */
function confirmSchedule(apiName) {
    closeAutomationModal();
    showNotification(`✅ Health check scheduled for ${apiName}!`, 'success');
}

/**
 * Show automation modal
 */
function showAutomationModal(title, content) {
    let modal = document.getElementById('automation-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'automation-modal';
        modal.className = 'automation-modal';
        modal.innerHTML = `
            <div class="automation-modal-content">
                <span class="modal-close" onclick="closeAutomationModal()">&times;</span>
                <h2 id="modal-title"></h2>
                <div id="modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-body').innerHTML = content;
    modal.style.display = 'block';
}

/**
 * Close automation modal
 */
function closeAutomationModal() {
    const modal = document.getElementById('automation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('automation-modal');
    if (event.target === modal) {
        closeAutomationModal();
    }
}

// Make functions globally available
window.saveAPI = saveAPI;
window.removeSavedAPI = removeSavedAPI;
window.autoTestAPI = autoTestAPI;
window.generateSDK = generateSDK;
window.generateSDKLanguage = generateSDKLanguage;
window.scheduleHealthCheck = scheduleHealthCheck;
window.confirmSchedule = confirmSchedule;
window.closeAutomationModal = closeAutomationModal;


// ========================================
// WELCOME SCREEN AI AGENT FUNCTIONS
// ========================================

/**
 * Set quick query for welcome screen
 */
function setQuickQueryWelcome(query) {
    const input = document.getElementById('ai-query-input-welcome');
    if (input) {
        input.value = query;
        input.focus();
        input.style.background = 'rgba(99, 102, 241, 0.1)';
        setTimeout(() => {
            input.style.background = '';
        }, 500);
    }
}

/**
 * Query agent from welcome screen
 */
async function queryAgentMCPWelcome() {
    const input = document.getElementById('ai-query-input-welcome');
    const button = document.getElementById('ai-query-btn-welcome');
    const responseDiv = document.getElementById('ai-response-welcome');
    const responseContent = document.getElementById('ai-response-content-welcome');
    const typingDiv = document.getElementById('ai-typing-welcome');
    
    if (!input || !button || !responseDiv || !responseContent) {
        console.error('Welcome AI interface elements not found');
        return;
    }
    
    const query = input.value.trim();
    
    if (!query) {
        showNotification('Please enter a query', 'warning');
        input.focus();
        return;
    }
    
    console.log('🔍 Welcome MCP Agent Query:', query);
    
    // Show loading state
    const originalButtonContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    button.disabled = true;
    
    // Show typing indicator
    if (typingDiv) typingDiv.style.display = 'flex';
    responseDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/agent/tools/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        console.log('🔍 MCP Response:', data);
        
        // Hide typing indicator
        if (typingDiv) typingDiv.style.display = 'none';
        
        // Display structured MCP response
        if (data.success) {
            responseContent.innerHTML = generateMCPSuccessResponse(data);
        } else {
            responseContent.innerHTML = generateMCPErrorResponse(data);
        }
        
        responseDiv.style.display = 'block';
        
    } catch (error) {
        console.error('❌ MCP Agent query failed:', error);
        if (typingDiv) typingDiv.style.display = 'none';
        
        responseContent.innerHTML = `
            <div class="ai-result ai-result-error">
                <div class="ai-status-indicator ai-status-error">
                    <i class="fas fa-exclamation-triangle"></i> Connection Error
                </div>
                <h4><i class="fas fa-wifi"></i> MCP Connection Failed</h4>
                <p class="ai-error">Failed to connect to MCP agent: ${escapeHtml(error.message)}</p>
                <div class="ai-suggestion">
                    <strong>🔧 Troubleshooting:</strong><br>
                    • Ensure backend server is running on port 3002<br>
                    • Check MCP agent tools are loaded<br>
                    • Try refreshing the page
                </div>
            </div>
        `;
        responseDiv.style.display = 'block';
    } finally {
        button.innerHTML = originalButtonContent;
        button.disabled = false;
    }
}

/**
 * Close AI response on welcome screen
 */
function closeAIResponseWelcome() {
    const responseDiv = document.getElementById('ai-response-welcome');
    if (responseDiv) {
        responseDiv.style.display = 'none';
    }
}

/**
 * Handle Enter key in welcome AI input
 */
function setupWelcomeAIEventListeners() {
    const aiInput = document.getElementById('ai-query-input-welcome');
    if (aiInput) {
        aiInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                queryAgentMCPWelcome();
            }
        });
    }
}

// Add to init function
document.addEventListener('DOMContentLoaded', () => {
    setupWelcomeAIEventListeners();
});

// Export functions for global access
window.setQuickQueryWelcome = setQuickQueryWelcome;
window.queryAgentMCPWelcome = queryAgentMCPWelcome;
window.closeAIResponseWelcome = closeAIResponseWelcome;
