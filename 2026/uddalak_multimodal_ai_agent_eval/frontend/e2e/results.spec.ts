import { test, expect } from '@playwright/test';

/**
 * ResultsDashboard E2E tests
 * Verifies metric cards, chart containers, and the empty state message render.
 */

test.beforeEach(async ({ page }) => {
  // Match both with and without trailing slash since axios follows redirects
  await page.route('**/datasets**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ datasets: [] }) })
  );
  await page.route('**/results**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );

  await page.goto('/');
  // Default view is Analytics (ResultsDashboard)
  await expect(page.getByRole('heading', { name: 'ANALYTICS COMMAND' })).toBeVisible();
});

test('ANALYTICS COMMAND heading is visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'ANALYTICS COMMAND' })).toBeVisible();
});

test('four metric cards are visible with labels', async ({ page }) => {
  await expect(page.getByText('AVG ACCURACY')).toBeVisible();
  await expect(page.getByText('AVG LATENCY')).toBeVisible();
  await expect(page.getByText('TOTAL TOKENS')).toBeVisible();
  await expect(page.getByText('TOTAL COST')).toBeVisible();
});

test('empty state message shown when no results', async ({ page }) => {
  await expect(page.getByText('No evaluations recorded yet. Visit the Forge to start.')).toBeVisible();
});

test('accuracy chart section label is visible', async ({ page }) => {
  await expect(page.getByText('Accuracy Per Run')).toBeVisible();
});

test('latency chart section label is visible', async ({ page }) => {
  await expect(page.getByText('Latency by Provider (MS)')).toBeVisible();
});
