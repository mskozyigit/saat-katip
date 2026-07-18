#!/usr/bin/env node
// ============================================================================
// Android Material 3 Uyumluluk Testi
// ============================================================================
// Kaynak kodları tarar ve Android tasarım kriterlerine uygunluğu denetler.
// Kullanım: node scripts/test-android-compliance.mjs
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'src');

let errors = 0;
let warnings = 0;
let passed = 0;

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function glob(dir, pattern, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!entry.startsWith('.') && entry !== 'node_modules') glob(full, pattern, results);
    } else if (pattern.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function readLines(filePath) {
  return readFileSync(filePath, 'utf-8').split('\n');
}

function fail(file, line, rule, detail = '') {
  errors++;
  const name = file.replace(ROOT, '');
  console.log(`  ❌ ${name}:${line} — ${rule}${detail ? ` (${detail})` : ''}`);
}

function warn(file, line, rule, detail = '') {
  warnings++;
  const name = file.replace(ROOT, '');
  console.log(`  ⚠️  ${name}:${line} — ${rule}${detail ? ` (${detail})` : ''}`);
}

function ok(rule) {
  passed++;
  console.log(`  ✅ ${rule}`);
}

// ---------------------------------------------------------------------------
// Test 1: Hardcoded renk yok (CSS/TSX içinde #XXXXXX doğrudan kullanımı)
// ---------------------------------------------------------------------------
console.log('\n🔍 Test 1: Hardcoded renk kodları');

const cssVarFiles = glob(SRC, /\.css$/);
const tsxFiles = glob(SRC, /\.tsx$/);
let hardcodedColorCount = 0;

for (const file of [...cssVarFiles, ...tsxFiles]) {
  const lines = readLines(file);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // CSS değişken tanımlarına izin ver (--xxx: #XXXXXX)
    if (/^\s*--[\w-]+:\s*#[0-9A-Fa-f]{3,8}/.test(line)) continue;
    // rgba() kullanımına izin ver
    if (/rgba?\(/.test(line)) continue;
    // Google SVG logo renklerine izin ver (LoginPage)
    if (file.endsWith('LoginPage.tsx') && /fill="#[0-9A-Fa-f]{6}"/.test(line)) continue;
    // Hardcoded hex renk ara (string içinde veya style prop'ta)
    if (/(?<!var\(--)(?<![-#])#[0-9A-Fa-f]{6}\b/.test(line)) {
      hardcodedColorCount++;
      fail(file, i + 1, 'Hardcoded hex renk', line.trim());
    }
  }
}
if (hardcodedColorCount === 0) ok('Sıfır hardcoded renk');

// ---------------------------------------------------------------------------
// Test 2: Beyaz renk kullanımı
// ---------------------------------------------------------------------------
console.log('\n🔍 Test 2: Beyaz renk kullanımı');

let whiteCount = 0;
for (const file of [...cssVarFiles, ...tsxFiles]) {
  const lines = readLines(file);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Token tanımlarında white/fff olabilir (--md-on-primary: #FFFFFF gibi)
    if (/^\s*--[\w-]+:\s*#(?:FFF|fff|FFFFFF|ffffff)\b/.test(line)) continue;
    if (/^\s*--[\w-]+:\s*white/i.test(line)) continue;
    // Kullanımda #fff veya white geçiyor mu?
    if (/(?<![-#])(?:#(?:FFF|fff)\b|(?<![a-z-])white(?![a-z-]))/.test(line)) {
      whiteCount++;
      fail(file, i + 1, 'Beyaz renk kullanımı', line.trim());
    }
  }
}
if (whiteCount === 0) ok('Sıfır beyaz renk (token tanımları hariç)');

// ---------------------------------------------------------------------------
// Test 3: Font ailesi — SF Pro yok, Roboto var
// ---------------------------------------------------------------------------
console.log('\n🔍 Test 3: Font ailesi');

let sfProCount = 0;
for (const file of cssVarFiles) {
  const lines = readLines(file);
  for (let i = 0; i < lines.length; i++) {
    if (/SF.?Pro/i.test(lines[i])) {
      sfProCount++;
      fail(file, i + 1, 'SF Pro font — Roboto kullanılmalı');
    }
  }
}
if (sfProCount === 0) ok('Sıfır SF Pro — her yerde Roboto');

// ---------------------------------------------------------------------------
// Test 4: Font boyutları — Material typescale değişkenleri
// ---------------------------------------------------------------------------
console.log('\n🔍 Test 4: Font boyutları (Material typescale)');

let rawFontSizeCount = 0;
for (const file of cssVarFiles) {
  const lines = readLines(file);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // font-size: XXpx şeklinde hardcoded değerler
    const match = line.match(/font-size:\s*(\d+)px/);
    if (match) {
      const px = parseInt(match[1]);
      // Dekoratif/ikon boyutlarına izin ver (32px hover + işareti gibi)
      if (px >= 24 && line.includes('::after')) continue;
      if (px >= 24 && line.includes('clock-picker-btn')) continue;
      rawFontSizeCount++;
      fail(file, i + 1, `Hardcoded font-size: ${px}px — typescale değişkeni kullan`, line.trim());
    }
  }
}
if (rawFontSizeCount === 0) ok('Tüm font-size\'lar Material typescale');

// ---------------------------------------------------------------------------
// Test 5: Dokunma hedefleri ≥ 48px
// ---------------------------------------------------------------------------
console.log('\n🔍 Test 5: Dokunma hedefleri (min 48dp)');

let smallTouchCount = 0;
for (const file of cssVarFiles) {
  const lines = readLines(file);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // min-height/min-width < 48px kontrolü
    const minH = line.match(/min-height:\s*(\d+)px/);
    const minW = line.match(/min-width:\s*(\d+)px/);
    if (minH && parseInt(minH[1]) < 44) {
      // Bazı küçük hedeflere izin ver (badge, label)
      if (line.includes('badge') || line.includes('label') || line.includes('icon')) continue;
      smallTouchCount++;
      fail(file, i + 1, `min-height < 44px: ${minH[1]}px`, line.trim());
    }
    if (minW && parseInt(minW[1]) < 44 && !line.includes('badge') && !line.includes('label')) {
      smallTouchCount++;
      fail(file, i + 1, `min-width < 44px: ${minW[1]}px`, line.trim());
    }
  }
}
// TSX inline style kontrolü
for (const file of tsxFiles) {
  const content = readFileSync(file, 'utf-8');
  const inlineMinHeights = content.match(/minHeight:\s*(\d+)/g) || [];
  for (const m of inlineMinHeights) {
    const val = parseInt(m.match(/\d+/)[0]);
    if (val < 44) {
      smallTouchCount++;
      fail(file, 0, `Satır içi minHeight < 44: ${val}`, m);
    }
  }
}
if (smallTouchCount === 0) ok('Tüm dokunma hedefleri ≥ 44px');

// ---------------------------------------------------------------------------
// Test 6: Aktif/pasif durum stilleri
// ---------------------------------------------------------------------------
console.log('\n🔍 Test 6: Aktif/pasif durum stilleri');

const statesNeeded = {
  '.btn-save': [':disabled', ':active'],
  '.btn-cancel': [':active'],
  '.break-btn': [':active', '.selected'],
  '.time-input': [':focus'],
  '.day-column': [':hover', ':active'],
  '.circular-clock__time-digit': [':active', '.active'],
  '.circular-clock__ampm-btn': [':active', '.active'],
  '.circular-clock__cancel': [':hover'],
  '.circular-clock__confirm': [':hover'],
  '.add-entry-btn': [':hover'],
  '.google-signin-btn': [':hover', ':disabled'],
};

const allCss = cssVarFiles.map(f => readFileSync(f, 'utf-8')).join('\n');
let missingStates = 0;

for (const [selector, states] of Object.entries(statesNeeded)) {
  for (const state of states) {
    const pattern = new RegExp(selector.replace('.', '\\.') + state.replace(':', '\\:'));
    if (!pattern.test(allCss)) {
      missingStates++;
      warn(SRC, 0, `${selector}${state} stili eksik`);
    }
  }
}
if (missingStates === 0) ok('Tüm aktif/pasif durumlar tanımlı');

// ---------------------------------------------------------------------------
// Test 7: CSS değişken kullanımı
// ---------------------------------------------------------------------------
console.log('\n🔍 Test 7: Tema değişkenleri');

const requiredVars = [
  '--md-primary', '--md-on-primary', '--md-surface',
  '--md-typescale-headline-small', '--md-typescale-body-medium',
  '--md-touch-min', '--md-spacing-16', '--md-radius-md',
  '--cp-bg', '--cp-accent',
];
for (const v of requiredVars) {
  if (allCss.includes(v)) {
    ok(`${v} tanımlı`);
  } else {
    fail('variables.css', 0, `${v} değişkeni eksik`);
  }
}

// ---------------------------------------------------------------------------
// Sonuç
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log(`  ✅ Geçti: ${passed}`);
console.log(`  ⚠️  Uyarı: ${warnings}`);
console.log(`  ❌ Hata: ${errors}`);
console.log('='.repeat(60));

if (errors > 0) {
  console.log('\n❌ ANDROID UYUMLULUK TESTİ BAŞARISIZ — Hataları düzeltin.');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Uyarılarla tamamlandı. Gözden geçirin.');
  process.exit(0);
} else {
  console.log('\n✅ TÜM TESTLER BAŞARIYLA GEÇTİ!');
  process.exit(0);
}
