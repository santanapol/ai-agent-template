import { test, expect } from '@playwright/test';

// ตัวอย่างการเขียน E2E Test แบบจำลองพฤติกรรมจริงของผู้ใช้ (User Journey)
test.describe('E2E: Full Rolling Commission Lifecycle', () => {

  test.beforeEach(async ({ context }) => {
    // Clear cookies before each test
    await context.clearCookies();
  });

  test('Admin creates campaign and User claims it', async ({ browser }) => {
    // ---------------------------------------------------------
    // ACT 1: Admin Journey (เปิดหน้าต่างใหม่สำหรับแอดมิน)
    // ---------------------------------------------------------
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    await adminPage.goto('/admin/login');
    await adminPage.fill('input[name="username"]', 'superadmin');
    await adminPage.fill('input[name="password"]', 'Admin@1234!');
    await adminPage.click('button[type="submit"]');

    // นำทางไปยังเมนูและสร้าง Commission
    await adminPage.click('text="Promotion Management"');
    await adminPage.click('text="Rolling Commission"');
    await adminPage.click('button:has-text("Create New")');
    
    await adminPage.fill('input[name="campaignName"]', 'Monthly Bonus E2E Test');
    await adminPage.fill('input[name="rate"]', '5');
    await adminPage.click('button:has-text("Publish")');
    
    // ยืนยันว่าสร้างสำเร็จ
    await expect(adminPage.locator('.toast-success')).toContainText('Created successfully');
    await adminContext.close(); // ปิดหน้าแอดมิน

    // ---------------------------------------------------------
    // ACT 2: User Journey (เปิดหน้าต่างใหม่สำหรับลูกค้า)
    // ---------------------------------------------------------
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    await userPage.goto('/login');
    await userPage.fill('#user', 'testcustomer1');
    await userPage.fill('#pass', 'CusPass!23');
    await userPage.click('button:has-text("Login")');

    // ลูกค้ากดเข้าไปดูโปรโมชั่นและรับยอด
    await userPage.click('text="My Promotions"');
    
    // ตรวจสอบว่าแคมเปญใหม่โผล่มาให้ลูกค้าเห็น
    const campaignCard = userPage.locator('.campaign-card', { hasText: 'Monthly Bonus E2E Test' });
    await expect(campaignCard).toBeVisible();

    // กดรับโบนัส
    await campaignCard.locator('button:has-text("Claim Bonus")').click();
    await expect(userPage.locator('.alert-success')).toBeVisible();
    
    // เช็คยอดเงินอัปเดตใน Navbar
    await expect(userPage.locator('#wallet-balance')).not.toHaveText('0.00');
    
    await userContext.close();
  });
});
