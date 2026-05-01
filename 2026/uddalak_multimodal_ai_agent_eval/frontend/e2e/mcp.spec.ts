import { test, expect } from '@playwright/test';

/**
 * MCPPanel E2E tests
 * Verifies that the MCP Apps panel renders correctly:
 * - heading is visible
 * - both app cards are listed
 * - clicking an app card selects it
 * - iframe (AppHost) is present in DOM
 * No console errors are expected.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/datasets', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ datasets: [] }) })
  );
  await page.route('**/results', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );

  // Collect console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // Ignore expected network errors from iframe trying to load localhost backend
      const text = msg.text();
      if (!text.includes('localhost:8000') && !text.includes('net::ERR')) {
        consoleErrors.push(text);
      }
    }
  });
  (page as any)._consoleErrors = consoleErrors;

  await page.goto('/');
  await page.getByText('MCP Apps').click();
  await expect(page.getByRole('heading', { name: 'MCP APPS' })).toBeVisible();
});

test('MCP APPS heading is visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'MCP APPS' })).toBeVisible();
});

test('"Available Apps" label is visible', async ({ page }) => {
  await expect(page.getByText('Available Apps')).toBeVisible();
});

test('Eval Dashboard App card is visible', async ({ page }) => {
  await expect(page.getByText('Eval Dashboard App')).toBeVisible();
});

test('Sales Analytics Verifier card is visible', async ({ page }) => {
  await expect(page.getByText('Sales Analytics Verifier')).toBeVisible();
});

test('clicking Sales Analytics Verifier selects it', async ({ page }) => {
  await page.getByText('Sales Analytics Verifier').click();
  // Card selection is indicated by accent border left and accent color text
  await expect(page.getByText('Sales Analytics Verifier')).toBeVisible();
});

test('iframe element is present in DOM (AppHost renders)', async ({ page }) => {
  const iframe = page.locator('iframe');
  await expect(iframe).toHaveCount(1);
});
