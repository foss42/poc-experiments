/**
 * API Explorer Frontend - Interactive JavaScript
 * Handles API data fetching, UI interactions, and template management
 */

// Global state
let allAPIs = [];
let currentAPI = null;
let currentEndpoints = [];
let currentEndpoint = null;
let lastResponse = null;

// Configuration
const API_BASE_URL = 'http://localhost:3001';

// DOM Elements
const elements = {
    apiList: document.getElementById('api-list'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    welcomeScreen: document.getElementById('welcome-screen'),
    apiDetails: document.getElementById('api-details'),
    searchInput: document.getElementById('search-input'),
    authFilter: document.getElementById('auth-filter'),
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
    
    // Response Modal elements
    responseModal: document.getElementById('response-modal'),
    responseMethod: document.getElementById('response-method'),
    responsePath: document.getElementById('response-path'),
    responseStatus: document.getElementById('response-status'),
    responseTime: document.getElementById('response-time'),
    responseBodyContent: document.getElementById('response-body-content'),
    
    copyNotification: document.getElementById('copy-notification')
};

/**
 * Initialize the application
 */
function init() {
    console.log('🚀 Initializing API Explorer...');
    
    // Set up event listeners
    setupEventListeners();
    
    // Load APIs from backend
    loadAPIs();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Search functionality
    elements.searchInput.addEventListener('input', handleSearch);
    
    // Auth filter
    elements.authFilter.addEventListener('change', handleAuthFilter);
    
    // Method filter buttons
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', handleMethodFilter);
    });
    
    // Template tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
    
    // Modal close on background click
    elements.templateModal.addEventListener('click', (e) => {
        if (e.target === elements.templateModal) {
            closeTemplateModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Load APIs from the backend
 */
async function loadAPIs() {
    console.log('📡 Loading APIs from backend...');
    
    try {
        // Show loading state
        elements.loading.style.display = 'block';
        elements.errorMessage.style.display = 'none';
        elements.apiList.innerHTML = '';
        
        // Fetch APIs from backend
        const response = await fetch(`${API_BASE_URL}/apis`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        allAPIs = data.apis || [];
        
        console.log(`✅ Loaded ${allAPIs.length} APIs`);
        
        // Update UI
        updateStats();
        renderAPIList(allAPIs);
        
        // Hide loading state
        elements.loading.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Failed to load APIs:', error);
        
        // Show error state
        elements.loading.style.display = 'none';
        elements.errorMessage.style.display = 'block';
        
        // Update error message with specific details
        const errorText = elements.errorMessage.querySelector('p');
        if (error.message.includes('Failed to fetch')) {
            errorText.textContent = 'Backend server not running. Please start the server on port 3000.';
        } else {
            errorText.textContent = `Failed to load APIs: ${error.message}`;
        }
    }
}

/**
 * Update header statistics
 */
function updateStats() {
    const totalEndpoints = allAPIs.reduce((sum, api) => sum + (api.endpoints?.length || 0), 0);
    
    elements.apiCount.textContent = `${allAPIs.length} API${allAPIs.length !== 1 ? 's' : ''}`;
    elements.endpointCount.textContent = `${totalEndpoints} Endpoint${totalEndpoints !== 1 ? 's' : ''}`;
}

/**
 * Render the API list in the sidebar with duplicate handling
 */
function renderAPIList(apis) {
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
    
    // Group APIs by name to handle duplicates
    const groupedAPIs = groupAPIsByName(apis);
    
    elements.apiList.innerHTML = Object.entries(groupedAPIs).map(([name, apiGroup]) => {
        if (apiGroup.length === 1) {
            // Single API
            const api = apiGroup[0];
            return renderSingleAPI(api);
        } else {
            // Multiple APIs with same name
            return renderGroupedAPI(name, apiGroup);
        }
    }).join('');
}

/**
 * Group APIs by name for duplicate handling
 */
function groupAPIsByName(apis) {
    const groups = {};
    apis.forEach(api => {
        const name = api.name || 'Unknown API';
        if (!groups[name]) {
            groups[name] = [];
        }
        groups[name].push(api);
    });
    return groups;
}

/**
 * Render a single API item
 */
function renderSingleAPI(api) {
    return `
        <div class="api-item" onclick="selectAPI('${api.id}')" data-api-id="${api.id}">
            <div class="api-item-header">
                <h3>${escapeHtml(api.name)}</h3>
                ${getEnhancedAuthBadge(api.authType)}
            </div>
            <div class="api-item-info">
                <div>${api.baseUrl ? `<code>${escapeHtml(api.baseUrl)}</code>` : '<em class="no-base-url">No base URL specified</em>'}</div>
            </div>
            <div class="api-item-stats">
                <i class="fas fa-link"></i> ${api.endpoints?.length || 0} endpoint${(api.endpoints?.length || 0) !== 1 ? 's' : ''}
            </div>
        </div>
    `;
}

/**
 * Render grouped APIs with same name
 */
function renderGroupedAPI(name, apiGroup) {
    const totalEndpoints = apiGroup.reduce((sum, api) => sum + (api.endpoints?.length || 0), 0);
    
    return `
        <div class="api-group">
            <div class="api-group-header">
                <h3>${escapeHtml(name)}</h3>
                <span class="api-count-badge">${apiGroup.length} versions</span>
            </div>
            <div class="api-group-items">
                ${apiGroup.map(api => `
                    <div class="api-subitem" onclick="selectAPI('${api.id}')" data-api-id="${api.id}">
                        <div class="api-subitem-header">
                            <code class="base-url">${api.baseUrl || 'No URL'}</code>
                            ${getEnhancedAuthBadge(api.authType, true)}
                        </div>
                        <div class="api-subitem-stats">
                            <i class="fas fa-link"></i> ${api.endpoints?.length || 0} endpoints
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="api-group-stats">
                <i class="fas fa-chart-bar"></i> ${totalEndpoints} total endpoints
            </div>
        </div>
    `;
}

/**
 * Get enhanced auth badge with icon and label
 */
function getEnhancedAuthBadge(authType, mini = false) {
    const authConfig = {
        'none': { icon: 'fas fa-unlock', label: 'Public', class: 'none' },
        'apiKey': { icon: 'fas fa-key', label: 'API Key', class: 'apiKey' },
        'bearer': { icon: 'fas fa-shield-alt', label: 'Bearer Token', class: 'bearer' },
        'oauth2': { icon: 'fas fa-user-shield', label: 'OAuth2', class: 'oauth2' }
    };
    
    const config = authConfig[authType] || authConfig['none'];
    const sizeClass = mini ? '' : 'enhanced';
    
    return `
        <span class="auth-badge ${config.class} ${sizeClass}">
            <i class="${config.icon}"></i>
            <span>${config.label}</span>
        </span>
    `;
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
    elements.welcomeScreen.style.display = 'none';
    elements.apiDetails.style.display = 'block';
    
    // Populate API details
    elements.apiName.textContent = currentAPI.name;
    
    // Enhanced auth badge
    const authConfig = {
        'none': { icon: 'fas fa-unlock', label: 'Public', class: 'none' },
        'apiKey': { icon: 'fas fa-key', label: 'API Key', class: 'apiKey' },
        'bearer': { icon: 'fas fa-shield-alt', label: 'Bearer Token', class: 'bearer' },
        'oauth2': { icon: 'fas fa-user-shield', label: 'OAuth2', class: 'oauth2' }
    };
    
    const authInfo = authConfig[currentAPI.authType] || authConfig['none'];
    elements.apiAuthBadge.className = `auth-badge enhanced ${authInfo.class}`;
    elements.apiAuthBadge.innerHTML = `<i class="${authInfo.icon}"></i><span>${authInfo.label}</span>`;
    
    // Handle base URL display
    if (currentAPI.baseUrl) {
        elements.apiBaseUrl.textContent = currentAPI.baseUrl;
        elements.apiBaseUrlDisplay.style.display = 'block';
        elements.baseUrlWarning.style.display = 'none';
    } else {
        elements.apiBaseUrlDisplay.style.display = 'none';
        elements.baseUrlWarning.style.display = 'flex';
    }
    
    elements.apiEndpointCount.textContent = currentAPI.endpoints?.length || 0;
    
    // Reset method filter
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === '');
    });
    
    // Render endpoints
    currentEndpoints = currentAPI.endpoints || [];
    renderEndpoints(currentEndpoints);
}

/**
 * Render endpoints list
 */
function renderEndpoints(endpoints) {
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
                <button class="try-api-btn" onclick="tryAPI(${index})">
                    <i class="fas fa-play"></i>
                    Try API
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
    if (!endpoint || !endpoint.templates) {
        console.error('No templates found for endpoint:', endpoint);
        showNotification('No templates available for this endpoint', 'error');
        return;
    }
    
    console.log('📋 Showing templates for:', endpoint.method, endpoint.path);
    
    currentEndpoint = endpoint;
    
    // Update modal title and endpoint info
    elements.modalTitle.textContent = 'Request Templates';
    elements.modalMethod.textContent = endpoint.method;
    elements.modalMethod.className = `method-badge ${endpoint.method}`;
    elements.modalPath.textContent = endpoint.path;
    
    // Populate templates
    const curlTemplate = endpoint.templates.curl || 'No curl template available';
    const powershellTemplate = endpoint.templates.powershell || 'No PowerShell template available';
    
    // Format templates for display (convert \\n to actual newlines)
    elements.curlCode.textContent = curlTemplate.replace(/\\n/g, '\n');
    elements.powershellCode.textContent = powershellTemplate.replace(/\\n/g, '\n');
    
    // Show modal
    elements.templateModal.style.display = 'flex';
    
    // Reset to curl tab
    switchTab('curl');
}

/**
 * Try API endpoint with real request
 */
async function tryAPI(endpointIndex) {
    const endpoint = currentEndpoints[endpointIndex];
    if (!endpoint) {
        console.error('Endpoint not found:', endpointIndex);
        return;
    }
    
    console.log('🚀 Trying API:', endpoint.method, endpoint.path);
    
    const button = document.querySelector(`[onclick="tryAPI(${endpointIndex})"]`);
    const originalContent = button.innerHTML;
    
    try {
        // Show loading state
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Trying...';
        button.classList.add('loading');
        button.disabled = true;
        
        // Build request URL
        const baseUrl = currentAPI.baseUrl || 'https://api.example.com';
        const fullUrl = baseUrl + endpoint.path.replace(/\{[^}]+\}/g, '123'); // Replace path params
        
        // Prepare request options
        const requestOptions = {
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Add authentication headers
        addAuthHeaders(requestOptions.headers, endpoint.authType || currentAPI.authType);
        
        // Add body for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            requestOptions.body = JSON.stringify(generateSampleBody(endpoint.path));
        }
        
        // Make the request
        const startTime = Date.now();
        const response = await fetch(fullUrl, requestOptions);
        const endTime = Date.now();
        
        // Get response data
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }
        
        // Store response for copying
        lastResponse = {
            status: response.status,
            statusText: response.statusText,
            time: endTime - startTime,
            data: responseData,
            endpoint: endpoint
        };
        
        // Show response modal
        showResponseModal(lastResponse);
        
    } catch (error) {
        console.error('API request failed:', error);
        
        // Show error response
        lastResponse = {
            status: 0,
            statusText: 'Network Error',
            time: 0,
            data: { error: error.message },
            endpoint: endpoint
        };
        
        showResponseModal(lastResponse);
        
    } finally {
        // Reset button state
        button.innerHTML = originalContent;
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Add authentication headers based on auth type
 */
function addAuthHeaders(headers, authType) {
    switch (authType) {
        case 'apiKey':
            const keyName = currentAPI.authDetails?.name || 'X-API-Key';
            headers[keyName] = 'YOUR_API_KEY';
            break;
        case 'bearer':
        case 'http':
            headers['Authorization'] = 'Bearer YOUR_TOKEN';
            break;
        case 'oauth2':
            headers['Authorization'] = 'Bearer YOUR_OAUTH_TOKEN';
            break;
        // 'none' - no headers added
    }
}

/**
 * Generate sample request body based on endpoint path
 */
function generateSampleBody(path) {
    if (path.includes('user')) {
        return { name: 'John Doe', email: 'john@example.com' };
    } else if (path.includes('pet')) {
        return { name: 'Fluffy', species: 'cat', age: 3 };
    } else if (path.includes('product')) {
        return { name: 'Sample Product', price: 29.99, category: 'electronics' };
    } else {
        return { key: 'value', data: 'sample_data' };
    }
}

/**
 * Show API response modal
 */
function showResponseModal(responseData) {
    // Update modal content
    elements.responseMethod.textContent = responseData.endpoint.method;
    elements.responseMethod.className = `method-badge ${responseData.endpoint.method}`;
    elements.responsePath.textContent = responseData.endpoint.path;
    
    // Update status
    elements.responseStatus.textContent = `${responseData.status} ${responseData.statusText}`;
    elements.responseStatus.className = `status-badge ${responseData.status >= 200 && responseData.status < 300 ? 'success' : 'error'}`;
    
    // Update timing
    elements.responseTime.textContent = `${responseData.time}ms`;
    
    // Update response body
    const formattedData = typeof responseData.data === 'string' 
        ? responseData.data 
        : JSON.stringify(responseData.data, null, 2);
    
    elements.responseBodyContent.textContent = formattedData;
    
    // Show modal
    elements.responseModal.style.display = 'flex';
}

/**
 * Close response modal
 */
function closeResponseModal() {
    elements.responseModal.style.display = 'none';
}

/**
 * Copy API response to clipboard
 */
async function copyResponse() {
    if (!lastResponse) {
        showNotification('No response to copy', 'error');
        return;
    }
    
    try {
        const responseText = elements.responseBodyContent.textContent;
        await navigator.clipboard.writeText(responseText);
        showNotification('Response copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy response:', error);
        showNotification('Failed to copy response', 'error');
    }
}

/**
 * Close templates modal
 */
function closeTemplateModal() {
    elements.templateModal.style.display = 'none';
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
        const text = codeElement.textContent;
        
        await navigator.clipboard.writeText(text);
        
        console.log(`📋 Copied ${templateType} template to clipboard`);
        showNotification(`${templateType.toUpperCase()} template copied to clipboard!`);
        
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        
        // Fallback: select text
        const codeElement = templateType === 'curl' ? elements.curlCode : elements.powershellCode;
        const range = document.createRange();
        range.selectNodeContents(codeElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        showNotification('Template selected - press Ctrl+C to copy', 'warning');
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'success') {
    const notification = elements.copyNotification;
    const icon = notification.querySelector('i');
    const text = notification.querySelector('span');
    
    // Update content
    text.textContent = message;
    
    // Update icon based on type
    icon.className = type === 'error' ? 'fas fa-exclamation-triangle' : 
                    type === 'warning' ? 'fas fa-exclamation-circle' : 
                    'fas fa-check';
    
    // Update color based on type
    notification.style.backgroundColor = type === 'error' ? 'var(--accent-red)' : 
                                       type === 'warning' ? 'var(--accent-orange)' : 
                                       'var(--accent-green)';
    
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
 * Handle method filter
 */
function handleMethodFilter(event) {
    const button = event.target;
    const method = button.dataset.method;
    
    // Update active state
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.toggle('active', btn === button);
    });
    
    // Filter endpoints
    if (!method) {
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
        elements.searchInput.focus();
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Utility function to format numbers
 */
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for global access (for onclick handlers)
window.selectAPI = selectAPI;
window.showTemplates = showTemplates;
window.tryAPI = tryAPI;
window.closeTemplateModal = closeTemplateModal;
window.closeResponseModal = closeResponseModal;
window.copyTemplate = copyTemplate;
window.copyResponse = copyResponse;
window.loadAPIs = loadAPIs;