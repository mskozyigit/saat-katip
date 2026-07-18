import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  workers: 2,

  use: {
    // Base URL GitHub Pages k├Âk├╝ (path'ler /saat-katip/ ile ba┼člar)
    baseURL: process.env.CI
      ? 'https://mskozyigit.github.io'
      : 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'Android Chrome',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  // Lokal geli┼čtirme i├ğin dev server (CI'da kullan─▒lmaz)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: true,
      },
});
