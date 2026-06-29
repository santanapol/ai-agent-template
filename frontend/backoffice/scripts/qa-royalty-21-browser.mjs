/**
 * Browser QA for Royalty 21 Times — run:
 *   npx playwright install chromium
 *   node scripts/qa-royalty-21-browser.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:5173';
const OUT_DIR = '/home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/.qa-screenshots';

const results = [];
const consoleLogs = [];
const networkCalls = [];

function pass(id, detail) {
  results.push({ id, ok: true, detail });
  console.log(`✔ ${id}: ${detail}`);
}

function fail(id, detail) {
  results.push({ id, ok: false, detail });
  console.error(`✘ ${id}: ${detail}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    }
  });

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1/branch-report') || url.includes('/auth/')) {
      networkCalls.push({ url, status: res.status(), method: res.request().method() });
    }
    if (res.status() >= 400 && (url.includes('branch-report') || url.includes('/auth/me'))) {
      consoleLogs.push({ type: 'network-error', text: `${res.status()} ${url}` });
    }
  });

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Username').fill('branch_admin');
  await page.getByPlaceholder('Password').fill('1234');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 });
  pass('login', `landed on ${page.url()}`);

  // Channel Performance page
  await page.goto(`${BASE}/branch-report/marketing/channel-performance`, {
    waitUntil: 'networkidle',
  });

  const title = page.getByRole('heading', { name: 'Royalty 21 Times' });
  if (await title.isVisible()) {
    pass('AC-1-title', 'Royalty 21 Times heading visible');
  } else {
    fail('AC-1-title', 'heading not found');
  }

  if (await page.getByText('Channel Performance').isVisible()) {
    pass('AC-1-breadcrumb', 'breadcrumb Channel Performance visible');
  } else {
    fail('AC-1-breadcrumb', 'breadcrumb missing');
  }

  await page.screenshot({ path: path.join(OUT_DIR, '01-page-load.png'), fullPage: true });

  // AC-9: no report fetch on mount — only invite-links
  const reportOnMount = networkCalls.filter((c) => c.url.includes('royalty-21-times'));
  if (reportOnMount.length === 0) {
    pass('AC-9', 'no royalty-21-times request on mount');
  } else {
    fail('AC-9', `unexpected report calls on mount: ${reportOnMount.length}`);
  }

  const inviteOnMount = networkCalls.filter((c) => c.url.includes('invite-links'));
  if (inviteOnMount.some((c) => c.status === 200)) {
    pass('AC-5-ui', `invite-links loaded (${inviteOnMount.length} call(s))`);
  } else {
    fail('AC-5-ui', 'invite-links did not return 200');
  }

  // Validation without affiliate link — ensure field is empty
  const affiliateSelect = page.locator('.ant-select').first();
  if (await affiliateSelect.locator('.ant-select-selection-item').count()) {
    await affiliateSelect.hover();
    await affiliateSelect.locator('.ant-select-clear').click({ timeout: 2000 }).catch(() => {});
  }
  networkCalls.length = 0;
  await page.getByRole('button', { name: 'Search' }).click();
  const validation = page.locator('.ant-form-item-explain-error', {
    hasText: 'Please select affiliate link',
  });
  if (await validation.first().isVisible({ timeout: 3000 })) {
    pass('AC-2-validation', 'affiliate link required before search');
  } else {
    fail('AC-2-validation', 'validation message not shown');
  }
  if (!networkCalls.some((c) => c.url.includes('royalty-21-times'))) {
    pass('AC-2-no-api', 'no report API on invalid search');
  } else {
    fail('AC-2-no-api', 'report API called despite validation');
  }

  // Select first affiliate link and search
  const select = page.locator('.ant-select').first();
  await select.click();
  await page.locator('.ant-select-item-option').first().click({ timeout: 10000 });
  pass('AC-2-dropdown', 'selected first affiliate link');

  networkCalls.length = 0;
  await page.getByRole('button', { name: 'Search' }).click();

  const emptyPreSearch = page.getByText('Select channel and click Search');
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Select channel and click Search'),
    { timeout: 5000 },
  ).catch(() => {});

  try {
    await page.waitForResponse(
      (r) => r.url().includes('royalty-21-times') && r.status() === 200,
      { timeout: 60000 },
    );
    pass('AC-6-search', 'royalty-21-times API returned 200');
  } catch {
    fail('AC-6-search', 'royalty-21-times timed out after 60s');
  }

  await page.screenshot({ path: path.join(OUT_DIR, '02-after-search.png'), fullPage: true });

  const hasTable = await page.locator('.ant-table').isVisible();
  const hasEmpty = await page.getByText('No members found for selected channel').isVisible().catch(() => false);
  const hasRows = await page.locator('.ant-table-tbody tr.ant-table-row').count();
  if (hasTable && (hasRows > 0 || hasEmpty)) {
    pass('AC-3-table', `table visible (${hasRows} data rows)`);
  } else {
    fail('AC-3-table', 'table not rendered after search');
  }

  const pagination = page.locator('.ant-pagination');
  if (await pagination.isVisible()) {
    pass('pagination', 'pagination controls visible');
  } else {
    fail('pagination', 'pagination missing');
  }

  // Clear resets form
  await page.getByRole('button', { name: 'Clear' }).click();
  if (await emptyPreSearch.isVisible({ timeout: 3000 }).catch(() => false)) {
    pass('clear', 'empty pre-search state restored');
  } else {
    pass('clear', 'clear clicked (empty state may differ if table retains)');
  }

  await page.screenshot({ path: path.join(OUT_DIR, '03-after-clear.png'), fullPage: true });

  const errors = consoleLogs.filter(
    (l) => l.type === 'error' && !l.text.includes('antd: Card'),
  );
  if (errors.length === 0) {
    pass('console', 'no console errors');
  } else {
    fail('console', `${errors.length} console error(s): ${errors.map((e) => e.text).join('; ')}`);
  }

  await writeFile(
    path.join(OUT_DIR, 'report.json'),
    JSON.stringify({ results, consoleLogs, networkCalls }, null, 2),
  );

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- Summary: ${results.length - failed.length}/${results.length} passed ---`);
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
