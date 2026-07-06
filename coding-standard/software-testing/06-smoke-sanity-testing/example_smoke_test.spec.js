import { test, expect } from '@playwright/test';

test.describe('Smoke / Sanity Test Suite - Post Deployment', () => {
  
  test('1. Application should load successfully', async ({ page }) => {
    const response = await page.goto('/');
    
    // ตรวจสอบว่า Server ไม่ล่ม (ไม่คืน 5xx)
    expect(response?.status()).toBe(200);
    
    // ตรวจสอบว่าหน้าเว็บเรนเดอร์สำเร็จ (หา title เจอ)
    await expect(page).toHaveTitle(/Zero Platform/i);
  });

  test('2. Backend Health Check API should return OK', async ({ request }) => {
    // ตรวจสอบว่า Backend เชื่อมต่อ DB ได้ปกติหรือไม่
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toBe('UP');
    expect(body.database).toBe('CONNECTED');
    expect(body.redisCache).toBe('CONNECTED');
  });

  test('3. Admin can access the Login Page', async ({ page }) => {
    await page.goto('/admin/login');
    
    // ตรวจสอบว่าหน้าล็อกอินโหลดฟอร์มขึ้นมาครบถ้วน
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
