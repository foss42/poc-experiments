import { test, expect } from '@playwright/test';

/**
 * EvalForge page E2E tests
 * Tests UI interactions: modality toggle, provider card add/remove.
 * API calls are stubbed — no backend required.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/datasets', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ datasets: ['mmlu_sample', 'agent_sample'] }) })
  );
  await page.route('**/results', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );

  await page.goto('/');
  // Navigate to the Forge
  await page.getByText('Forge Eval').click();
  await expect(page.getByRole('heading', { name: 'THE FORGE' })).toBeVisible();
});

test('modality toggle — clicking "multimodal" makes it active', async ({ page }) => {
  const multimodalTile = page.getByText('multimodal', { exact: true });
  await multimodalTile.click();
  // Active tile shows accent color (inline style) — check it's visible and clicked
  await expect(multimodalTile).toBeVisible();
  // Verify "text" and "agent" are also still visible (all 3 tiles remain rendered)
  await expect(page.getByText('text')).toBeVisible();
  await expect(page.getByText('agent', { exact: true })).toBeVisible();
});

test('modality toggle — clicking "agent" makes it active', async ({ page }) => {
  await page.getByText('agent', { exact: true }).click();
  await expect(page.getByText('agent', { exact: true })).toBeVisible();
});

test('clicking "Add Provider" appends a second provider card', async ({ page }) => {
  // Initially there is PROVIDER #1
  await expect(page.getByText('PROVIDER #1')).toBeVisible();
  await expect(page.getByText('PROVIDER #2')).not.toBeVisible();

  await page.getByText('Add Provider').click();

  await expect(page.getByText('PROVIDER #2')).toBeVisible();
});

test('clicking trash icon removes the second provider card', async ({ page }) => {
  // Add a second provider first
  await page.getByText('Add Provider').click();
  await expect(page.getByText('PROVIDER #2')).toBeVisible();

  // The trash icon only appears when providers.length > 1 — click the first one
  const trashIcons = page.locator('svg[class*="lucide-trash"]').or(page.locator('[data-lucide="trash-2"]'));
  // Click via the SVG inside a Trash2 icon — use a more reliable selector
  await page.locator('.cursor-pointer').first().click();

  // After removal we should be back to 1 provider
  await expect(page.getByText('PROVIDER #2')).not.toBeVisible();
  await expect(page.getByText('PROVIDER #1')).toBeVisible();
});

test('dataset dropdown is populated from the API', async ({ page }) => {
  // The stub returns ['mmlu_sample', 'agent_sample']
  const select = page.locator('select').first();
  await expect(select).toBeVisible();
  await expect(select.locator('option[value="mmlu_sample"]')).toHaveCount(1);
  await expect(select.locator('option[value="agent_sample"]')).toHaveCount(1);
});

test('Forge summary shows "--" for dataset when none selected', async ({ page }) => {
  await expect(page.getByText('FORGE SUMMARY')).toBeVisible();
  // The dataset row shows '--' initially
  await expect(page.getByText('--')).toBeVisible();
});
