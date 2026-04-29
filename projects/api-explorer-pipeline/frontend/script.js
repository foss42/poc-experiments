/**
 * API Explorer Frontend - Production Ready & Optimized
 * Plain HTML/CSS/JavaScript - NO build tools, NO Node.js
 * Browser-compatible configuration only
 */

// ========================================
// CONFIGURATION - BROWSER SAFE ONLY
// ========================================

// Detect environment based on hostname
const BASE_URL = (function() {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    return isLocalhost ? 'http://localhost:3002' : 'https://gsoc-api-explorer.onrender.com';
})();

const API_BASE_URL = BASE_URL;

// ========================================
// GLOBAL STATE
// ========================================

let allAPIs = [];
let currentAPI = null;
let currentEndpoints = [];
let currentEndpoint = null;
let elements = {};
let apiCache = {}; // Cache for API details
let categoryCache = null; // Cache for categories

// ========================================
// DOM INITIALIZATION
// ========================================

function initializeDOMElements() {
    elements = {
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
        apiName: document.getElementById('api-name'),
        apiAuthBadge: document.getElementById('api-auth-badge'),
        apiBaseUrl: document.getElementById('api-base-url'),
        apiEndpointCount: document.getElementById('api-endpoint-count'),
        endpointsList: document.getElementById('endpoints-list'),
        templateModal: document.getElementById('template-modal'),
        modalTitle: document.getElementById('modal-title'),
        curlCode: document.getElementById('curl-code'),
        powershellCode: document.getElementById('powershell-code'),
        copyNotification: document.getElementById('copy-notification')
    };
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
    initializeDOMElements();
    setupEventListeners();
    loadAPIs();
}

function setupEventListeners() {
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
    }
    if (elements.authFilter) {
        elements.authFilter.addEventListener('change', handleAuthFilter);
    }
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', handleCategoryFilter);
    }
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', handleMethodFilter);
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
    if (elements.templateModal) {
        elements.templateModal.addEventListener('click', (e) => {
            if (e.target === elements.templateModal) closeTemplateModal();
        });
    }
}

// ========================================
// API LOADING
// ========================================

async function loadAPIs() {
    try {
        if (elements.loading) elements.loading.style.display = 'block';
        if (elements.errorMessage) elements.errorMessage.style.display = 'none';
        
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const url = categoryFilter 
            ? `${API_BASE_URL}/apis?category=${encodeURIComponent(categoryFilter)}` 
            : `${API_BASE_URL}/apis`;
        
        // Create abort controller with timeout fallback
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        allAPIs = data.apis || [];
        categoryCache = data.categories || [];
        
        updateCategoryFilter(categoryCache);
        updateStats(data.count, data.totalCount);
        renderAPIList(allAPIs);
        
        if (elements.loading) elements.loading.style.display = 'none';
    } catch (error) {
        if (elements.loading) elements.loading.style.display = 'none';
        if (elements.errorMessage) elements.errorMessage.style.display = 'block';
        
        const errorText = elements.errorMessage?.querySelector('p');
        if (errorText) {
            if (error.message.includes('Failed to fetch') || error.name === 'AbortError') {
                errorText.innerHTML = `
                    <strong>⏳ Backend is starting...</strong><br>
                    Render free tier may take 30-60 seconds to wake up.<br>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Retry</button>
                `;
            } else {
                errorText.textContent = `Failed to load APIs: ${error.message}`;
            }
        }
    }
}

// ========================================
// UI UPDATES
// ========================================

function updateStats(displayedCount = null, totalCount = null) {
    const count = displayedCount !== null ? displayedCount : allAPIs.length;
    const total = totalCount !== null ? totalCount : allAPIs.length;
    const totalEndpoints = allAPIs.reduce((sum, api) => sum + (api.endpointCount || 0), 0);
    
    if (elements.apiCount) {
        elements.apiCount.textContent = `${count} API${count !== 1 ? 's' : ''}`;
    }
    if (elements.endpointCount) {
        elements.endpointCount.textContent = `${totalEndpoints} Endpoint${totalEndpoints !== 1 ? 's' : ''}`;
    }
}

function updateCategoryFilter(categories) {
    if (!elements.categoryFilter) return;
    const currentValue = elements.categoryFilter.value;
    elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        if (category === currentValue) option.selected = true;
        elements.categoryFilter.appendChild(option);
    });
}

function handleCategoryFilter() {
    loadAPIs();
}

function renderAPIList(apis) {
    if (!elements.apiList) return;
    if (!apis || apis.length === 0) {
        elements.apiList.innerHTML = '<div class="empty-state"><p>No APIs found</p></div>';
        return;
    }
    
    // Use innerHTML for speed (faster than DocumentFragment for large lists)
    let html = '';
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        html += `<div class="api-item" data-api-id="${api.id}" onclick="selectAPI('${api.id}')" style="cursor: pointer;">
            <div class="api-item-header">
                <h3>${escapeHtml(api.name)}</h3>
                ${getAuthBadge(api.authType)}
            </div>
            <div class="api-item-info">
                ${api.baseUrl ? `<code>${escapeHtml(api.baseUrl)}</code>` : '<em>No base URL</em>'}
            </div>
            <div class="api-item-meta">
                <i class="fas fa-link"></i> ${api.endpointCount || 0} endpoint${(api.endpointCount || 0) !== 1 ? 's' : ''}
            </div>
        </div>`;
    }
    elements.apiList.innerHTML = html;
}

function getAuthBadge(authType) {
    const config = {
        'none': { label: 'Public', class: 'none' },
        'apiKey': { label: 'API Key', class: 'apiKey' },
        'bearer': { label: 'Bearer', class: 'bearer' },
        'oauth2': { label: 'OAuth2', class: 'oauth2' }
    };
    const auth = config[authType] || config['none'];
    return `<span class="auth-badge ${auth.class}">${auth.label}</span>`;
}

// ========================================
// API SELECTION
// ========================================

async function selectAPI(apiId) {
    currentAPI = allAPIs.find(api => api.id === apiId);
    if (!currentAPI) return;
    
    document.querySelectorAll('.api-item').forEach(item => {
        item.classList.toggle('active', item.dataset.apiId === apiId);
    });
    
    if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'none';
    if (elements.apiDetails) elements.apiDetails.style.display = 'block';
    if (elements.apiName) elements.apiName.textContent = currentAPI.name;
    if (elements.apiEndpointCount) elements.apiEndpointCount.textContent = currentAPI.endpointCount || 0;
    
    // Use cache if available
    if (apiCache[apiId]) {
        currentEndpoints = apiCache[apiId];
        renderEndpoints(currentEndpoints);
        return;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${API_BASE_URL}/apis/${apiId}/details`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        currentEndpoints = data.endpoints || [];
        apiCache[apiId] = currentEndpoints; // Cache for future use
        renderEndpoints(currentEndpoints);
    } catch (error) {
        currentEndpoints = [];
    }
}

function renderEndpoints(endpoints) {
    if (!elements.endpointsList) return;
    if (!endpoints || endpoints.length === 0) {
        elements.endpointsList.innerHTML = '<div class="empty-state"><p>No endpoints found</p></div>';
        return;
    }
    
    // Use innerHTML for speed
    let html = '';
    for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        html += `<div class="endpoint-item" data-method="${endpoint.method}">
            <div class="endpoint-header">
                <span class="method-badge ${endpoint.method}">${endpoint.method}</span>
                <span class="endpoint-path">${escapeHtml(endpoint.path)}</span>
            </div>
            ${endpoint.summary ? `<div class="endpoint-description">${escapeHtml(endpoint.summary)}</div>` : ''}
            <div class="endpoint-actions">
                <button class="template-btn" onclick="showTemplates(${i})">
                    <i class="fas fa-code"></i> View Templates
                </button>
            </div>
        </div>`;
    }
    elements.endpointsList.innerHTML = html;
}

// ========================================
// TEMPLATES
// ========================================

async function showTemplates(endpointIndex) {
    const endpoint = currentEndpoints[endpointIndex];
    if (!endpoint) return;
    
    currentEndpoint = endpoint;
    if (elements.modalTitle) elements.modalTitle.textContent = 'Request Templates';
    if (elements.modalMethod) {
        elements.modalMethod.textContent = endpoint.method;
        elements.modalMethod.className = `method-badge ${endpoint.method}`;
    }
    if (elements.modalPath) elements.modalPath.textContent = endpoint.path;
    if (elements.curlCode) elements.curlCode.textContent = 'Generating...';
    if (elements.powershellCode) elements.powershellCode.textContent = 'Generating...';
    if (elements.templateModal) elements.templateModal.style.display = 'flex';
    switchTab('curl');
    
    try {
        const baseUrl = currentAPI.baseUrl || 'https://api.example.com';
        if (elements.curlCode) {
            elements.curlCode.textContent = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}" -H "Content-Type: application/json"`;
        }
        if (elements.powershellCode) {
            elements.powershellCode.textContent = `Invoke-RestMethod -Uri "${baseUrl}${endpoint.path}" -Method ${endpoint.method}`;
        }
    } catch (error) {
        console.error('❌ Failed to generate templates:', error);
    }
}

function closeTemplateModal() {
    if (elements.templateModal) elements.templateModal.style.display = 'none';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.template-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}-template`);
    });
}

async function copyTemplate(templateType) {
    try {
        const codeElement = templateType === 'curl' ? elements.curlCode : elements.powershellCode;
        if (!codeElement) return;
        await navigator.clipboard.writeText(codeElement.textContent);
        showNotification(`${templateType.toUpperCase()} copied!`);
    } catch (error) {
        console.error('Failed to copy:', error);
        showNotification('Failed to copy', 'error');
    }
}

function showNotification(message, type = 'success') {
    if (!elements.copyNotification) return;
    const text = elements.copyNotification.querySelector('span');
    if (text) text.textContent = message;
    elements.copyNotification.classList.add('show');
    setTimeout(() => {
        elements.copyNotification.classList.remove('show');
    }, 3000);
}

// ========================================
// SEARCH & FILTERS
// ========================================

function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    if (!query) {
        renderAPIList(allAPIs);
        return;
    }
    // Debounce search for better performance
    clearTimeout(handleSearch.timeout);
    handleSearch.timeout = setTimeout(() => {
        const filtered = allAPIs.filter(api => 
            api.name.toLowerCase().includes(query) ||
            (api.baseUrl && api.baseUrl.toLowerCase().includes(query))
        );
        renderAPIList(filtered);
    }, 300);
}

function handleAuthFilter(event) {
    const authType = event.target.value;
    if (!authType) {
        renderAPIList(allAPIs);
        return;
    }
    const filtered = allAPIs.filter(api => api.authType === authType);
    renderAPIList(filtered);
}

function handleMethodFilter(event) {
    const method = event.target.dataset.method;
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    if (elements.endpointsList) {
        document.querySelectorAll('.endpoint-item').forEach(item => {
            if (!method) {
                item.style.display = 'block';
            } else {
                item.style.display = item.dataset.method === method ? 'block' : 'none';
            }
        });
    }
}

function handleKeyboardShortcuts(event) {
    if (event.key === 'Escape') {
        closeTemplateModal();
    }
}

// ========================================
// UTILITIES
// ========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// GLOBAL EXPORTS
// ========================================

window.selectAPI = selectAPI;
window.showTemplates = showTemplates;
window.closeTemplateModal = closeTemplateModal;
window.copyTemplate = copyTemplate;
window.loadAPIs = loadAPIs;
window.handleSearch = handleSearch;
window.handleAuthFilter = handleAuthFilter;
window.handleMethodFilter = handleMethodFilter;
window.handleKeyboardShortcuts = handleKeyboardShortcuts;
window.handleCategoryFilter = handleCategoryFilter;
window.switchTab = switchTab;

// ========================================
// START APPLICATION
// ========================================

// Start immediately since script is loaded at end of body
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
