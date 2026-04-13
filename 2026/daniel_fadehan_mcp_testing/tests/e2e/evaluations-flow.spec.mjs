import { test, expect } from '@playwright/test';

const SAMPLE_SERVER_URL = process.env.FORGE_SAMPLE_MCP_URL || 'http://localhost:3000/mcp';
const GEMINI_KEY = process.env.FORGE_GEMINI_API_KEY || '';

async function seedSettings(page) {
  await page.addInitScript(({ geminiKey }) => {
    localStorage.clear();
    localStorage.setItem('forge-settings', JSON.stringify({
      state: {
        geminiApiKey: geminiKey || 'fake-key',
        openaiApiKey: '',
        anthropicApiKey: '',
      },
      version: 0,
    }));
  }, { geminiKey: GEMINI_KEY });
}

async function openTestMode(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Test' }).click();
}

async function connectSampleServer(page) {
  const urlInput = page.getByPlaceholder(/localhost:8080\/mcp|server-everything/);
  await urlInput.fill(SAMPLE_SERVER_URL);
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.getByText(/Establishing connection/i)).toHaveCount(0);
  await expect(page.getByTestId('evaluations-tab-button')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await seedSettings(page);
});

test('generates and persists evaluation scenarios by scope', async ({ page }) => {
  await openTestMode(page);
  await connectSampleServer(page);

  await expect(page.getByTestId('evaluations-generation-badge')).toContainText('6 new');

  await page.getByTestId('evaluations-tab-button').click();
  const scenarioList = page.getByTestId('evaluation-scenario-list');
  await expect(scenarioList).toBeVisible();
  await expect(scenarioList.locator('[data-testid^="evaluation-scenario-item-"]')).toHaveCount(6);
  await expect(scenarioList.getByText('Fetch revenue data for specific states').first()).toBeVisible();
  await expect(scenarioList.getByText('Casual conversation about states and periods').first()).toBeVisible();
  await expect(page.getByTestId('evaluation-negative-badge').first()).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Test' }).click();
  await connectSampleServer(page);
  await page.getByTestId('evaluations-tab-button').click();
  await expect(page.getByTestId('evaluation-scenario-list').locator('[data-testid^="evaluation-scenario-item-"]')).toHaveCount(6);
});

test('runs an evaluation and renders the trace workspace', async ({ page }) => {
  test.skip(!GEMINI_KEY, 'Set FORGE_GEMINI_API_KEY to run the end-to-end evaluation execution flow.');

  await openTestMode(page);
  await connectSampleServer(page);

  await expect(page.getByTestId('evaluations-generation-badge')).toContainText('6 new');
  await page.getByTestId('evaluations-tab-button').click();

  await page.getByText('Fetch revenue data for specific states').click();
  await expect(page.getByText('Scenario')).toBeVisible();
  await expect(page.getByText('User Prompt')).toBeVisible();
  await expect(page.getByText('Expected Tool Path')).toBeVisible();
  await expect(page.getByText('Expected Output')).toBeVisible();

  await page.getByTestId('evaluation-run-button').click();
  await expect(page.getByTestId('evaluation-trajectory-score-chip')).toBeVisible({ timeout: 60_000 });

  await expect(page.getByText(/tool calls/i)).toBeVisible();
  await expect(page.getByText(/tokens/i)).toBeVisible();
  await expect(page.getByText(/Path score/i)).toBeVisible();

  await page.getByTestId('evaluation-trace-tab-timeline').click();
  await expect(page.getByText('User prompt')).toBeVisible();
  const firstToolRow = page.getByText(/Tool ·/).first();
  await firstToolRow.hover();
  await expect(page.getByTestId('evaluation-trace-hover-preview')).toBeVisible();
  await firstToolRow.click();
  await expect(page.getByTestId('evaluation-selected-trace-row')).toBeVisible();
  await expect(page.getByTestId('evaluation-reveal-in-chat')).toBeVisible();

  await page.getByTestId('evaluation-trace-tab-chat').click();
  await expect(page.getByText(/Fetch revenue data for specific states|Get me the revenue data/i)).toBeVisible();

  await page.getByTestId('evaluation-trace-tab-raw').click();
  await expect(page.getByText(/Run payload/i)).toBeVisible();

  await page.getByTestId('evaluation-trace-tab-tools').click();
  await expect(page.getByText(/Expected args/i)).toBeVisible();
});
