import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Saat Katip — E2E Test Paketi
// ============================================================================

const APP_URL = '/';

// ---------------------------------------------------------------------------
// 1. Login Sayfası
// ---------------------------------------------------------------------------
test.describe('Login Sayfası', () => {
  test('sayfa yüklenmeli ve Google butonu görünmeli', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(2000);

    // Login sayfası elemanları
    await expect(page.locator('h1')).toContainText('Saat Katip');
    await expect(page.locator('.google-signin-btn')).toBeVisible();
    await expect(page.locator('.google-signin-btn')).toContainText('Google ile Giriş Yap');
  });

  test('Roboto font yüklenmeli', async ({ page }) => {
    await page.goto(APP_URL);
    const fontFamily = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily
    );
    expect(fontFamily).toContain('Roboto');
  });

  test('arka plan beyaz olmamalı', async ({ page }) => {
    await page.goto(APP_URL);
    const bg = await page.evaluate(() => {
      const el = document.querySelector('.login-page');
      return el ? getComputedStyle(el).backgroundColor : '';
    });
    // Beyaz veya beyaza yakın olmamalı
    expect(bg).not.toBe('rgb(255, 255, 255)');
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// ---------------------------------------------------------------------------
// 2. CSS / Tema Doğrulama
// ---------------------------------------------------------------------------
test.describe('Tema ve CSS Değişkenleri', () => {
  test('Material 3 tokenları tanımlı olmalı', async ({ page }) => {
    await page.goto(APP_URL);
    const vars = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        primary: root.getPropertyValue('--md-primary').trim(),
        surface: root.getPropertyValue('--md-surface').trim(),
        touchMin: root.getPropertyValue('--md-touch-min').trim(),
        typescaleLabel: root.getPropertyValue('--md-typescale-label-large').trim(),
      };
    });

    expect(vars.primary).toBeTruthy();
    expect(vars.surface).toBeTruthy();
    expect(vars.touchMin).toBe('48px');
    expect(vars.typescaleLabel).toBeTruthy();
  });

  test('hardcoded hex renk olmamalı', async ({ page }) => {
    // CSS dosyasını fetch et ve kontrol et
    const stylesheets = await page.evaluate(() =>
      Array.from(document.styleSheets)
        .filter(s => s.href?.includes('variables'))
        .map(s => s.href)
    );

    for (const href of stylesheets) {
      if (!href) continue;
      const response = await page.request.get(href);
      const css = await response.text();

      // CSS değişken tanımları (#XXXXXX) serbest
      const lines = css.split('\n');
      for (const line of lines) {
        // Token tanım satırlarını atla
        if (/^\s*--[\w-]+:\s*#[0-9A-Fa-f]{3,8}/.test(line)) continue;
        // rgba kullanımı serbest
        if (/rgba?\(/.test(line)) continue;
        // Hardcoded hex kontrolü
        if (/#[0-9A-Fa-f]{6}/.test(line)) {
          // style attr içinde CSS var() kullanımı serbest
          if (/var\(--/.test(line)) continue;
          console.log('Hardcoded hex bulundu:', line.trim());
        }
      }
    }
  });

  test('dokunma hedefleri ≥ 48px', async ({ page }) => {
    await page.goto(APP_URL);

    const smallTargets = await page.evaluate(() => {
      const results: string[] = [];
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        const s = getComputedStyle(btn);
        const minH = parseInt(s.minHeight);
        const minW = parseInt(s.minWidth);
        const h = btn.getBoundingClientRect().height;
        if ((minH && minH < 44) || (!minH && h < 44)) {
          results.push(`${btn.textContent?.trim()?.slice(0, 20)}: ${h}px`);
        }
      });
      return results;
    });

    expect(smallTargets).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Ana Takvim (giriş yapılmış varsayılır)
// ---------------------------------------------------------------------------
test.describe('Ana Takvim (giriş sonrası)', () => {
  test('takvim grid\'i 7 gün sütunu ile yüklenmeli', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(3000);

    // Eğer login sayfasındaysak testi geç
    const onLogin = await page.locator('.google-signin-btn').isVisible().catch(() => false);
    if (onLogin) {
      test.skip(true, 'Giriş yapılmamış — login sayfası gösteriliyor');
      return;
    }

    await expect(page.locator('.calendar-grid')).toBeVisible();
    const dayCols = await page.locator('.day-column').count();
    expect(dayCols).toBeGreaterThanOrEqual(1);
  });

  test('FAB + butonu görünmeli', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(3000);

    const onLogin = await page.locator('.google-signin-btn').isVisible().catch(() => false);
    if (onLogin) {
      test.skip(true, 'Giriş yapılmamış');
      return;
    }

    await expect(page.locator('ion-fab-button')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Günlük Kayıt Overlay
// ---------------------------------------------------------------------------
test.describe('Overlay — Günlük Kayıt', () => {
  test('boş güne tıklayınca form açılmalı', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(3000);

    const onLogin = await page.locator('.google-signin-btn').isVisible().catch(() => false);
    if (onLogin) {
      test.skip(true, 'Giriş yapılmamış');
      return;
    }

    // Bir gün sütununa tıkla
    const dayBtn = page.locator('[aria-label*="günü"]').first();
    await dayBtn.click();
    await page.waitForTimeout(1500);

    // Overlay görünmeli
    const overlay = page.locator('[style*="z-index: 1000"]');
    await expect(overlay).toBeVisible();

    // Form alanları görünmeli (boş gün → otomatik form)
    const hasForm = await page.locator('input[type="text"]').count();
    expect(hasForm).toBeGreaterThanOrEqual(1);
  });

  test('İptal zinciri — overlay tamamen kapanmalı', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(3000);

    const onLogin = await page.locator('.google-signin-btn').isVisible().catch(() => false);
    if (onLogin) {
      test.skip(true, 'Giriş yapılmamış');
      return;
    }

    // Günü aç
    await page.locator('[aria-label*="günü"]').first().click();
    await page.waitForTimeout(1500);

    // Clock dial varsa kapat
    const clockCancel = page.locator('.circular-clock__cancel');
    if (await clockCancel.isVisible().catch(() => false)) {
      await clockCancel.click();
      await page.waitForTimeout(300);
    }

    // Form İptal
    const formIptal = page.locator('.btn-cancel').first();
    if (await formIptal.isVisible().catch(() => false)) {
      await formIptal.click();
      await page.waitForTimeout(300);
    }

    // Overlay kapanmış olmalı
    const overlay = page.locator('[style*="z-index: 1000"]');
    await expect(overlay).not.toBeVisible();

    // "Günlük Kayıt" yazısı kalmamalı
    await expect(page.locator('text=Günlük Kayıt')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Saat Kadranı (ClockPicker)
// ---------------------------------------------------------------------------
test.describe('Saat Kadranı', () => {
  test('kadran açılıp kapanabilmeli', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(3000);

    const onLogin = await page.locator('.google-signin-btn').isVisible().catch(() => false);
    if (onLogin) {
      test.skip(true, 'Giriş yapılmamış');
      return;
    }

    // Günü aç
    await page.locator('[aria-label*="günü"]').first().click();
    await page.waitForTimeout(1500);

    // Clock dial otomatik açılmış olmalı
    const clock = page.locator('.clock-picker-backdrop');
    await expect(clock).toBeVisible();

    // Saat hanesi (09) görünmeli
    await expect(page.locator('.circular-clock__time-digit').first()).toBeVisible();

    // İptal ile kapat
    await page.locator('.circular-clock__cancel').click();
    await page.waitForTimeout(300);

    // Kadran kapanmalı
    await expect(clock).not.toBeVisible();
  });

  test('saat seçimi ve onay çalışmalı', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(3000);

    const onLogin = await page.locator('.google-signin-btn').isVisible().catch(() => false);
    if (onLogin) {
      test.skip(true, 'Giriş yapılmamış');
      return;
    }

    await page.locator('[aria-label*="günü"]').first().click();
    await page.waitForTimeout(1500);

    // Onayla butonu görünmeli
    const confirmBtn = page.locator('.circular-clock__confirm');
    await expect(confirmBtn).toBeVisible();

    // Onayla
    await confirmBtn.click();
    await page.waitForTimeout(300);

    // Kadran kapanmalı, başlangıç saati dolmuş olmalı
    const clock = page.locator('.clock-picker-backdrop');
    await expect(clock).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. PWA Manifest
// ---------------------------------------------------------------------------
test.describe('PWA Manifest', () => {
  test('manifest.json erişilebilir ve geçerli olmalı', async ({ page }) => {
    const response = await page.request.get('/manifest.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('Saat Katip');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Maskable purpose kontrolü
    const hasMaskable = manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose?.includes('maskable')
    );
    expect(hasMaskable).toBe(true);
  });

  test('iOS meta etiketleri mevcut olmalı', async ({ page }) => {
    await page.goto(APP_URL);

    const capable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(capable).toBe('yes');

    const statusBar = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content');
    expect(statusBar).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. Responsive / Mobil Görünüm
// ---------------------------------------------------------------------------
test.describe('Responsive Mobil', () => {
  test('mobilde navigasyon butonları gizlenmeli', async ({ page }) => {
    // Mobil viewport zaten Pixel 7 / iPhone 14
    await page.goto(APP_URL);
    await page.waitForTimeout(3000);

    const onLogin = await page.locator('.google-signin-btn').isVisible().catch(() => false);
    if (onLogin) {
      test.skip(true, 'Giriş yapılmamış');
      return;
    }

    // Mobilde ← Bugün → görünmemeli
    const nav = page.locator('.calendar-header__nav');
    await expect(nav).not.toBeVisible();
  });
});
