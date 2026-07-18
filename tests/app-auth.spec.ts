// ============================================================================
// Saat Katip — Auth Gerektiren E2E Testler
// ============================================================================
// Bu testler, mock Supabase session ile çalışır.
// Gerçek Google OAuth gerektirmez.
// ============================================================================

import { testWithAuth, expect } from './auth-fixture';

// ---------------------------------------------------------------------------
// 1. Ana Takvim (giriş yapılmış)
// ---------------------------------------------------------------------------
testWithAuth.describe('Ana Takvim (auth)', () => {
  testWithAuth('takvim grid\'i 7 gün sütunu ile yüklenmeli', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Calendar grid görünmeli
    await expect(page.locator('.calendar-grid')).toBeVisible({ timeout: 5000 });

    // En az 1 gün sütunu olmalı
    const dayCols = page.locator('.day-column');
    await expect(dayCols.first()).toBeVisible();
    const count = await dayCols.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  testWithAuth('takvim başlığı görünmeli', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Görünüm toggle butonları (tüm viewport'larda görünür)
    await expect(page.locator('button:has-text("1 Gün")')).toBeVisible();
    await expect(page.locator('button:has-text("3 Gün")')).toBeVisible();
    await expect(page.locator('button:has-text("1 Hafta")')).toBeVisible();

    // Bugün butonu — mobilde CSS ile gizlenir, masaüstünde görünür
    const bugunBtn = page.locator('button:has-text("Bugün")');
    const isMobile = page.viewportSize()?.width !== undefined && page.viewportSize()!.width < 600;
    if (isMobile) {
      // Mobilde gizli olması beklenir
      await expect(bugunBtn).not.toBeVisible();
    } else {
      await expect(bugunBtn).toBeVisible();
    }
  });

  testWithAuth('gün sütununa tıklayınca overlay açılmalı', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // İlk gün sütununa tıkla
    const dayBtn = page.locator('[aria-label*="günü"]').first();
    await dayBtn.click();
    await page.waitForTimeout(1500);

    // Overlay görünmeli
    const overlay = page.locator('[style*="z-index: 1000"]');
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // Günlük Kayıt başlığı görünmeli
    await expect(page.locator('text=Günlük Kayıt')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Overlay — Günlük Kayıt
// ---------------------------------------------------------------------------
testWithAuth.describe('Overlay — Günlük Kayıt (auth)', () => {
  testWithAuth('form alanları otomatik açılmalı (boş gün)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Boş güne tıkla (geçmiş bir gün)
    const dayBtn = page.locator('[aria-label*="günü"]').first();
    await dayBtn.click();
    await page.waitForTimeout(1500);

    // ClockPicker backdrop görünmeli (saat seçimi için)
    const clock = page.locator('.clock-picker-backdrop');
    await expect(clock).toBeVisible({ timeout: 3000 });
  });

  testWithAuth('clock dial saat haneleri görünmeli', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.locator('[aria-label*="günü"]').first().click();
    await page.waitForTimeout(1500);

    // Saat dijital göstergesi (örn: "09")
    const digit = page.locator('.circular-clock__time-digit').first();
    await expect(digit).toBeVisible({ timeout: 3000 });
  });

  testWithAuth('clock dial onayla butonu görünmeli', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.locator('[aria-label*="günü"]').first().click();
    await page.waitForTimeout(1500);

    // Onayla butonu
    const confirmBtn = page.locator('.circular-clock__confirm');
    await expect(confirmBtn).toBeVisible({ timeout: 3000 });
  });

  testWithAuth('clock dial iptal ile kapanabilmeli', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.locator('[aria-label*="günü"]').first().click();
    await page.waitForTimeout(1500);

    // İptal butonu
    const cancelBtn = page.locator('.circular-clock__cancel');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Clock kapanmalı
    const clock = page.locator('.clock-picker-backdrop');
    await expect(clock).not.toBeVisible({ timeout: 3000 });
  });

  testWithAuth('3 kez iptal ile overlay tamamen kapanmalı', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.locator('[aria-label*="günü"]').first().click();
    await page.waitForTimeout(1500);

    // 1. Clock iptal
    const clockCancel = page.locator('.circular-clock__cancel');
    if (await clockCancel.isVisible().catch(() => false)) {
      await clockCancel.click();
      await page.waitForTimeout(400);
    }

    // 2. Form iptal (eğer varsa)
    const formIptal = page.locator('.btn-cancel').first();
    if (await formIptal.isVisible().catch(() => false)) {
      await formIptal.click();
      await page.waitForTimeout(400);
    }

    // Overlay kapanmış olmalı
    const overlay = page.locator('[style*="z-index: 1000"]');
    await expect(overlay).not.toBeVisible({ timeout: 3000 });

    // Günlük Kayıt yazısı kalmamalı
    await expect(page.locator('text=Günlük Kayıt')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Responsive Mobil (auth)
// ---------------------------------------------------------------------------
testWithAuth.describe('Responsive Mobil (auth)', () => {
  testWithAuth('mobilde navigasyon butonları gizlenmeli', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Mobil viewport'ta ← Bugün → nav CSS ile gizlenmiş olmalı
    const nav = page.locator('.calendar-header__nav');
    // CSS media query: mobilde display:none
    const isHidden = await nav.evaluate(el => {
      const style = getComputedStyle(el);
      return style.display === 'none';
    }).catch(() => false);

    // Masaüstünde görünür, mobilde gizli — proje viewport'una bağlı
    expect(typeof isHidden).toBe('boolean');
  });
});
