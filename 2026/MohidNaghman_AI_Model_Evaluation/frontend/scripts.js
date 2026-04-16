// State
let evaluationResults = [];
const API_URL = 'http://localhost:8000/api/evaluate';

// File Upload Handling
const dropZone = document.getElementById('dropZone');
const csvFile = document.getElementById('csvFile');
const fileName = document.getElementById('fileName');

dropZone.addEventListener('click', () => csvFile.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        csvFile.files = e.dataTransfer.files;
        updateFileName();
    }
});

csvFile.addEventListener('change', updateFileName);

function updateFileName() {
    if (csvFile.files.length) {
        fileName.textContent = `✓ ${csvFile.files[0].name} (${formatFileSize(csvFile.files[0].size)})`;
        fileName.classList.add('show');
    } else {
        fileName.classList.remove('show');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Temperature Slider
const tempSlider = document.getElementById('temperature');
const tempValue = document.getElementById('tempValue');
tempSlider.addEventListener('input', (e) => {
    tempValue.textContent = parseFloat(e.target.value).toFixed(1);
});

// Form Submission
document.getElementById('evaluationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitEvaluation();
});

async function submitEvaluation() {
    try {
        // Validation
        if (!csvFile.files.length) {
            showStatus('Please select a CSV file', 'error');
            return;
        }

        const selectedModels = Array.from(document.querySelectorAll('input[name="models"]:checked'))
            .map(cb => cb.value);

        if (!selectedModels.length) {
            showStatus('Please select at least one model', 'error');
            return;
        }

        // Warn if Mistral not selected (helps understand why N/A shows)
        if (!selectedModels.includes('mistral')) {
            console.info('ℹ️ Mistral not selected - Mistral columns will show N/A');
        }

        // Show loading
        showLoading(true);
        hideStatus();

        // Prepare FormData
        const formData = new FormData();
        formData.append('file', csvFile.files[0]);
        formData.append('models', selectedModels.join(','));
        formData.append('temperature', tempSlider.value);

        // Make API call
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        const flatResults = data.results || [];
        
        // Transform flat results into grouped format (one row per prompt with all models)
        evaluationResults = transformResults(flatResults);

        // Display results
        displayResults();
        showStatus('✓ Evaluation completed successfully', 'success');

    } catch (error) {
        console.error('Error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Transform flat API results into grouped format
 * Flat: [{prompt, expected, model, output, bleu_score, exact_match}, ...]
 * Grouped: [{prompt, expected_answer, groq_output, gemini_output, metrics: {...}}, ...]
 */
function transformResults(flatResults) {
    const grouped = {};

    flatResults.forEach(result => {
        const key = result.prompt;
        if (!grouped[key]) {
            grouped[key] = {
                prompt: result.prompt,
                expected_answer: result.expected,
                groq_output: undefined,
                mistral_output: undefined,
                metrics: {
                    groq: null,
                    mistral: null
                }
            };
        }

        // Add output and metrics for this model
        if (result.model === 'groq') {
            grouped[key].groq_output = result.output;
            grouped[key].metrics.groq = {
                bleu: result.bleu_score,
                rouge: result.rouge_score,
                exact_match: result.exact_match
            };
        } else if (result.model === 'mistral') {
            grouped[key].mistral_output = result.output;
            grouped[key].metrics.mistral = {
                bleu: result.bleu_score,
                rouge: result.rouge_score,
                exact_match: result.exact_match
            };
        }
    });

    return Object.values(grouped);
}

function displayResults() {
    const tbody = document.getElementById('resultsBody');
    const summary = document.getElementById('resultsSummary');
    tbody.innerHTML = '';
    summary.innerHTML = '';

    if (!evaluationResults.length) {
        showStatus('No results to display', 'warning');
        return;
    }

    // Calculate statistics
    let totalPrompts = 0;
    let groqExactMatch = 0;
    let mistralExactMatch = 0;
    let avgGroqBleu = 0;
    let avgMistralBleu = 0;
    let avgGroqRouge = 0;
    let avgMistralRouge = 0;

    // Populate table
    evaluationResults.forEach(result => {
        totalPrompts++;
        const metrics = result.metrics || {};

        // Count exact matches
        if (metrics.groq?.exact_match) groqExactMatch++;
        if (metrics.mistral?.exact_match) mistralExactMatch++;

        // Accumulate metrics (BLEU and ROUGE)
        avgGroqBleu += metrics.groq?.bleu || 0;
        avgMistralBleu += metrics.mistral?.bleu || 0;
        avgGroqRouge += metrics.groq?.rouge || 0;
        avgMistralRouge += metrics.mistral?.rouge || 0;

        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${escapeHtml(result.prompt)}</td>
            <td>${escapeHtml(result.expected_answer)}</td>
            <td class="model-col">${escapeHtml(result.groq_output || 'N/A')}</td>
            <td>${getMetricClass(metrics.groq?.bleu)}</td>
            <td>${getMetricClass(metrics.groq?.rouge)}</td>
            <td>${getMatchBadge(metrics.groq?.exact_match)}</td>
            <td class="model-col">${escapeHtml(result.mistral_output || 'N/A')}</td>
            <td>${getMetricClass(metrics.mistral?.bleu)}</td>
            <td>${getMetricClass(metrics.mistral?.rouge)}</td>
            <td>${getMatchBadge(metrics.mistral?.exact_match)}</td>
        `;
    });

    // Display summary with ROUGE
    avgGroqBleu = (avgGroqBleu / totalPrompts).toFixed(2);
    avgMistralBleu = (avgMistralBleu / totalPrompts).toFixed(2);
    avgGroqRouge = (avgGroqRouge / totalPrompts).toFixed(2);
    avgMistralRouge = (avgMistralRouge / totalPrompts).toFixed(2);

    summary.innerHTML = `
        <div class="summary-card">
            <div class="summary-card-label">Total Prompts</div>
            <div class="summary-card-value">${totalPrompts}</div>
        </div>
        <div class="summary-card">
            <div class="summary-card-label">Groq Avg BLEU</div>
            <div class="summary-card-value" style="color: ${avgGroqBleu > 60 ? '#00ff88' : '#ffaa00'}">${avgGroqBleu}</div>
        </div>
        <div class="summary-card">
            <div class="summary-card-label">Groq Avg ROUGE-L</div>
            <div class="summary-card-value" style="color: ${avgGroqRouge > 60 ? '#00ff88' : '#ffaa00'}">${avgGroqRouge}</div>
        </div>
        <div class="summary-card">
            <div class="summary-card-label">Groq Exact Match</div>
            <div class="summary-card-value">${groqExactMatch}/${totalPrompts}</div>
        </div>
        <div class="summary-card">
            <div class="summary-card-label">Mistral Avg BLEU</div>
            <div class="summary-card-value" style="color: ${avgMistralBleu > 60 ? '#00ff88' : '#ffaa00'}">${avgMistralBleu}</div>
        </div>
        <div class="summary-card">
            <div class="summary-card-label">Mistral Avg ROUGE-L</div>
            <div class="summary-card-value" style="color: ${avgMistralRouge > 60 ? '#00ff88' : '#ffaa00'}">${avgMistralRouge}</div>
        </div>
        <div class="summary-card">
            <div class="summary-card-label">Mistral Exact Match</div>
            <div class="summary-card-value">${mistralExactMatch}/${totalPrompts}</div>
        </div>
    `;

    document.getElementById('resultsSection').classList.add('show');
}

function getMetricClass(value) {
    if (!value) return '<span style="color: #707080;">N/A</span>';
    const num = parseFloat(value);
    let className = '';
    if (num >= 70) className = 'metric-good';
    else if (num >= 40) className = 'metric-partial';
    else className = 'metric-bad';
    return `<span class="${className}">${value.toFixed(2)}</span>`;
}

function getMatchBadge(isMatch) {
    return isMatch ? '<span style="color: #00ff88;">✓ Yes</span>' : '<span style="color: #ff4444;">✗ No</span>';
}

function escapeHtml(text) {
    if (!text) return '-';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export CSV
document.getElementById('exportBtn').addEventListener('click', exportResults);

function exportResults() {
    if (!evaluationResults.length) {
        showStatus('No results to export', 'warning');
        return;
    }

    const headers = ['Prompt', 'Expected', 'Groq Output', 'Groq BLEU', 'Groq ROUGE-L', 'Groq Match', 'Mistral Output', 'Mistral BLEU', 'Mistral ROUGE-L', 'Mistral Match'];
    const rows = evaluationResults.map(result => {
        const metrics = result.metrics || {};
        return [
            `"${(result.prompt || '').replace(/"/g, '\"\"')}"`,
            `"${(result.expected_answer || '').replace(/"/g, '\"\"')}"`,
            `"${(result.groq_output || '').replace(/"/g, '\"\"')}"`,
            metrics.groq?.bleu || 0,
            metrics.groq?.rouge || 0,
            metrics.groq?.exact_match ? 'Yes' : 'No',
            `"${(result.mistral_output || '').replace(/"/g, '\"\"')}"`,
            metrics.mistral?.bleu || 0,
            metrics.mistral?.rouge || 0,
            metrics.mistral?.exact_match ? 'Yes' : 'No'
        ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showStatus('✓ Results exported successfully', 'success');
}

// Utilities
function showLoading(show) {
    document.getElementById('loadingSpinner').classList.toggle('show', show);
    document.getElementById('submitBtn').disabled = show;
}

function showStatus(message, type) {
    const el = document.getElementById('statusMessage');
    el.textContent = message;
    el.className = `status-message show ${type}`;
}

function hideStatus() {
    document.getElementById('statusMessage').classList.remove('show');
}