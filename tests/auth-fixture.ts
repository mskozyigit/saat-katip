// ============================================================================
// Auth Fixture — Supabase session mock for Playwright tests
// ============================================================================
// Supabase Auth API çağrılarını mock'layarak gerçek Google OAuth olmadan
// giriş yapılmış gibi test yazmayı sağlar.
// ============================================================================

import { test as base, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock session ve user verileri
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'test-user-0001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@saatkatip.local',
  phone: '',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {
    avatar_url: 'https://lh3.googleusercontent.com/a/test',
    email: 'test@saatkatip.local',
    email_verified: true,
    full_name: 'Test Kullanıcı',
    name: 'Test Kullanıcı',
    picture: 'https://lh3.googleusercontent.com/a/test',
    provider_id: '123456789',
    sub: '123456789',
  },
  identities: [
    {
      id: '123456789',
      user_id: 'test-user-0001',
      identity_data: {
        email: 'test@saatkatip.local',
        email_verified: true,
        full_name: 'Test Kullanıcı',
        name: 'Test Kullanıcı',
        picture: 'https://lh3.googleusercontent.com/a/test',
        provider_id: '123456789',
        sub: '123456789',
      },
      provider: 'google',
      last_sign_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
};

const MOCK_SESSION = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-test-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: MOCK_USER,
};

const SUPABASE_PROJECT = 'ecroilzrroylanlmexdk';
const LS_KEY = `sb-${SUPABASE_PROJECT}-auth-token`;

// ---------------------------------------------------------------------------
// Auth mock kurulumu
// ---------------------------------------------------------------------------

/**
 * Sayfayı mock auth ile yükler.
 * Supabase'in /auth/v1/user ve /auth/v1/token endpoint'lerini mock'lar,
 * localStorage'a geçerli bir session yerleştirir.
 */
export async function setupAuthMock(page: Page, appUrl: string = '/'): Promise<void> {
  // 1. Supabase Auth API mock — /auth/v1/user
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    });
  });

  // 2. Supabase Auth API mock — /auth/v1/token (refresh denenirse)
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...MOCK_SESSION,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    });
  });

  // 3. localStorage'a session'ı yerleştir (her sayfa yüklemede çalışır)
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: LS_KEY, session: MOCK_SESSION }
  );

  // 4. Sayfaya git
  await page.goto(appUrl);
  // Auth durumunun çözülmesini bekle
  await page.waitForTimeout(2500);
}

/**
 * Test'te auth kullanılıp kullanılmayacağını belirten extended fixture.
 * `useAuth: true` ile test başlatılırsa mock session kurulur.
 */
export type AuthFixture = {
  authenticatedPage: Page;
};

/**
 * Auth fixture'li test. Kullanımı:
 *   test('örnek', async ({ authenticatedPage }) => { ... })
 */
export const testWithAuth = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const base = process.env.CI ? '/saat-katip' : '';
    await setupAuthMock(page, `${base}/`);
    await use(page);
  },
});

export { expect } from '@playwright/test';
