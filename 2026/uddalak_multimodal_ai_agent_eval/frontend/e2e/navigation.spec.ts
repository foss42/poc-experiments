import { test, expect } from '@playwright/test';

/**
 * Navigation E2E tests
 * Verifies that all sidebar nav items are present and clicking each
 * one switches the main content area to the correct view.
 *
 * API calls are routed to stub fixtures so the backend is not required.
 */

test.beforeEach(async ({ page }) => {
  // Stub all API calls — trailing slash globs match /datasets/ and /results/
  await page.route('**/datasets**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ datasets: [] }) })
  );
  await page.route('**/results**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );
  await page.goto('/');
});

test('all sidebar nav items are visible on load', async ({ page }) => {
  // Only 3 working views — Datasets and Leaderboard removed (no implementation)
  await expect(page.getByText('Analytics', { exact: true })).toBeVisible();
  await expect(page.getByText('Forge Eval')).toBeVisible();
  await expect(page.getByText('MCP Apps')).toBeVisible();
  // Confirm removed items are NOT shown
  await expect(page.getByText('Datasets')).not.toBeVisible();
  await expect(page.getByText('Leaderboard')).not.toBeVisible();
});

test('clicking "Forge Eval" shows THE FORGE heading', async ({ page }) => {
  await page.getByText('Forge Eval').click();
  await expect(page.getByRole('heading', { name: 'THE FORGE' })).toBeVisible();
});

test('clicking "Analytics" shows ANALYTICS COMMAND heading', async ({ page }) => {
  // Navigate away first, then back
  await page.getByText('Forge Eval').click();
  await page.getByText('Analytics').click();
  await expect(page.getByRole('heading', { name: 'ANALYTICS COMMAND' })).toBeVisible();
});

test('clicking "MCP Apps" shows MCP APPS heading', async ({ page }) => {
  await page.getByText('MCP Apps').click();
  await expect(page.getByRole('heading', { name: 'MCP APPS' })).toBeVisible();
});

test('EVALFORGE brand is always visible in sidebar', async ({ page }) => {
  await expect(page.getByText('EVALFORGE')).toBeVisible();
});
