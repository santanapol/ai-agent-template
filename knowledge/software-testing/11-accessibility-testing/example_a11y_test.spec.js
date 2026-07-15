import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (a11y) Automated Checks', () => {
  
  test('Login page should pass WCAG AA standards', async ({ page }) => {
    await page.goto('/login');
    
    // ใช้ axe-core แสกนหาข้อบกพร่องด้านคนพิการ (เช่น contrast ต่ำ, ขาด aria-label)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) // อิงมาตรฐาน WCAG
      .disableRules(['color-contrast']) // ตัวอย่างการข้ามบาง rule ถ้า Designer ยืนยันสีแล้ว
      .analyze();
    
    // ตรวจสอบว่าต้องไม่มี Violation (ถ้ามี Playwright จะพังพร้อมบอกว่าพังตรงไหน)
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Navbar component should have proper ARIA landmarks', async ({ page }) => {
    await page.goto('/dashboard');

    // สแกนเฉพาะจุด (Component Testing for A11y)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('nav.navbar')
      .analyze();
      
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('Keyboard navigation works on the Commission Form', async ({ page }) => {
    await page.goto('/admin/commission/create');
    
    // จำลองคนตาบอดใช้ปุ่ม Tab บน Keyboard
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="campaignName"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="rate"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // จำลองการกด Enter ยืนยันฟอร์ม
    await page.keyboard.press('Enter');
    await expect(page.locator('.error-message')).toBeVisible(); // ตรวจว่ามี Error เพราะยังไม่กรอกข้อมูล
  });
});
