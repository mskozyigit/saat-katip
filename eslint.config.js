// ============================================================================
// ESLint Flat Config (v9+) — Saat Katip
// ============================================================================
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Temel JS/TS kuralları
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Tüm TS/TSX dosyaları için
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks kuralları
      ...reactHooks.configs.recommended.rules,

      // React Refresh için export kontrolü
      'react-refresh/only-export-components': 'warn',

      // Kullanılmayan değişkenler (warning — hataya dönüşmez)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Konsol log'larına izin ver ama uyar
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Any tipi kullanımına izin ver ama uyar
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Test dosyaları ve config dosyaları için daha esnek kurallar
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,ts}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // Ignore edilenler
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      '*.config.{js,ts}',
    ],
  }
);
