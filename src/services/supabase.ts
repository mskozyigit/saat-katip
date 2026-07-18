// ============================================================================
// Saat Katip — Supabase İstemci Servisi
// ============================================================================
// Bu dosya, Supabase SDK'sı üzerinden tüm veritabanı ve auth işlemlerini
// yönetir. GitHub Pages statik barındırma yaptığı için ayrı bir backend
// API katmanı YOKTUR — tüm işlemler doğrudan Supabase istemcisinden yapılır.
//
// GÜVENLİK NOTU:
//   - VITE_SUPABASE_ANON_KEY tasarım gereği GİZLİ DEĞİLDİR, istemcide bulunur.
//   - Veri izolasyonu TAMAMEN Row Level Security (RLS) politikalarına bağlıdır.
//   - service_role anahtarı ASLA istemci koduna gömülmez.
// ============================================================================

/// <reference types="vite/client" />

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WorkEntry, WorkEntryInput } from '../types';

// ---------------------------------------------------------------------------
// İstemci oluşturma (singleton)
// ---------------------------------------------------------------------------

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase yapılandırması eksik. Lütfen .env dosyasında ' +
    'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlayın.'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Oturum localStorage'da saklanır, sayfa yenilense bile korunur
    persistSession: true,
    // Token yenileme otomatik yapılır (Doze Mode sonrası recovery için kritik)
    autoRefreshToken: true,
    // Supabase Auth UI'da popup yerine redirect kullan (mobil uyumlu)
    // PKCE akışı varsayılan olarak aktiftir
  },
});

// ---------------------------------------------------------------------------
// Auth işlemleri
// ---------------------------------------------------------------------------

/**
 * Google OAuth ile giriş yapar.
 * Web: redirect URI üzerinden döner.
 * Mobil: Capacitor deep link / custom URL scheme üzerinden döner.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = import.meta.env.PROD
    ? 'https://mskozyigit.github.io/' // TODO: gerçek URL ile değiştir
    : window.location.origin;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
}

/** Çıkış yapar */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Mevcut oturumu döndürür (sayfa yenilendiğinde session recovery) */
export async function getSession() {
  return supabase.auth.getSession();
}

/**
 * Auth durum değişikliklerini dinler.
 * ÖNEMLİ: Bileşen unmount olduğunda unsubscribe() çağrılmalı (memory leak önlemi).
 */
export function onAuthStateChange(callback: (session: unknown) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription.unsubscribe;
}

// ---------------------------------------------------------------------------
// Sunucu Zamanı (Clock Skew Koruması)
// ---------------------------------------------------------------------------

/**
 * 🔴 KRİTİK: Sunucu zamanını alır.
 * Kullanıcının cihaz saati hatalı olsa bile doğru zamanı verir.
 * Clock Skew (zaman sapması) koruması için TÜM tarih hesaplamalarında
 * istemci saati (new Date()) yerine BU fonksiyon kullanılmalıdır.
 */
export async function getServerTime(): Promise<Date> {
  const { data, error } = await supabase.rpc('get_server_time');
  if (error) {
    console.warn('Sunucu zamanı alınamadı, istemci saati kullanılıyor:', error);
    return new Date(); // fallback
  }
  return new Date(data as string);
}

// ---------------------------------------------------------------------------
// Work Entries CRUD
// ---------------------------------------------------------------------------

/**
 * Belirli bir tarih aralığındaki kayıtları getirir.
 * RLS sayesinde sadece auth.uid() = user_id olan kayıtlar döner.
 */
export async function fetchWorkEntries(
  startDate: string,
  endDate: string
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from('work_entries')
    .select('*')
    .gte('logical_date', startDate)
    .lte('logical_date', endDate)
    .order('logical_date', { ascending: true });

  if (error) throw error;
  return data as WorkEntry[];
}

/**
 * Kullanıcının en son N kaydını getirir (öneri algoritması için).
 */
export async function fetchRecentEntries(
  limit: number = 5
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from('work_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as WorkEntry[]).reverse(); // kronolojik sıraya çevir
}

/**
 * Yeni kayit olusturur (INSERT).
 * Coklu kayit destegi — ayni gune birden fazla kayit yapilabilir.
 */
export async function insertWorkEntry(input: WorkEntryInput): Promise<WorkEntry> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Kullanici giris yapmamis.');

  const { data, error } = await supabase
    .from('work_entries')
    .insert({
      user_id: userId,
      logical_date: input.logical_date,
      start_time: input.start_time,
      end_time: input.end_time,
      break_minutes: input.break_minutes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as WorkEntry;
}

/**
 * Mevcut kaydi gunceller (UPDATE).
 * id zorunlu — hangi kaydin guncellenecegini belirtir.
 */
export async function updateWorkEntry(input: WorkEntryInput): Promise<WorkEntry> {
  if (!input.id) throw new Error('Guncelleme icin id zorunlu.');

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Kullanici giris yapmamis.');

  const { data, error } = await supabase
    .from('work_entries')
    .update({
      logical_date: input.logical_date,
      start_time: input.start_time,
      end_time: input.end_time,
      break_minutes: input.break_minutes,
    })
    .eq('id', input.id)
    .eq('user_id', userId)  // RLS ek guvenlik
    .select()
    .single();

  if (error) throw error;
  return data as WorkEntry;
}

/**
 * Kayit olusturur veya gunceller.
 * id varsa → UPDATE, yoksa → INSERT.
 */
export async function saveWorkEntry(input: WorkEntryInput): Promise<WorkEntry> {
  if (input.id) {
    return updateWorkEntry(input);
  }
  return insertWorkEntry(input);
}

/**
 * Kaydi siler.
 */
export async function deleteWorkEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('work_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Bir gune ait TUM kayitlari getirir (coklu kayit destegi).
 */
export async function fetchEntriesByDate(
  logicalDate: string
): Promise<WorkEntry[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('work_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('logical_date', logicalDate)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data as WorkEntry[];
}
