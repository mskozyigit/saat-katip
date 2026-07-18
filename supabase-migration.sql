-- ============================================================================
-- Saat Katip — Supabase Veritabanı Migrasyonu
-- ============================================================================
-- Bu SQL, Supabase SQL Editor'da çalıştırılmalıdır.
-- Sırasıyla: tablo → indeks → RLS → politikalar → yardımcı fonksiyonlar
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. work_entries TABLOSU
-- --------------------------------------------------------------------------

create table if not exists public.work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Kullanıcının ajandada TIKLADIĞI gün sütunu.
  -- Grid'de kaydın yerleştiği ve liste/gruplama işlemlerinde kullanılan
  -- "mantıksal gün"dür.
  logical_date date not null,

  start_time timestamptz not null,
  end_time timestamptz not null,

  -- Mola süresi (dakika). 0 veya 15/30/45/60.
  break_minutes integer not null default 0 check (break_minutes >= 0),

  -- Otomatik hesaplanan toplam çalışma süresi (dakika).
  -- Gece yarısını geçen vardiyalarda da doğru hesaplanır
  -- çünkü timestamp farkı üzerinden gider.
  total_minutes integer generated always as (
    greatest(0, (extract(epoch from (end_time - start_time)) / 60)::integer - break_minutes)
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Bitiş, başlangıçtan sonra olmalı
  constraint end_after_start check (end_time > start_time)

  -- NOT: unique_day_per_user kaldirildi — coklu kayit (bolunmus vardiya) destegi.
  -- Ayni gun icin birden fazla kayit yapilabilir.
);

-- --------------------------------------------------------------------------
-- 2. İNDEKSLER
-- --------------------------------------------------------------------------

-- Kullanıcının kayıtlarını tarihe göre hızlı sorgulamak için
create index if not exists idx_work_entries_user_date
  on public.work_entries (user_id, logical_date desc);

-- Son kayıtları hızlı çekmek için (öneri algoritması)
create index if not exists idx_work_entries_user_created
  on public.work_entries (user_id, created_at desc);

-- --------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (ZORUNLU)
-- --------------------------------------------------------------------------
-- GitHub Pages statik barındırma yaptığı için istemci kodu anon key ile
-- bağlanır. VERİ İZOLASYONU TAMAMEN RLS POLİTİKALARINA BAĞLIDIR.
-- RLS kurulmadan bu mimari GÜVENLİ DEĞİLDİR.

alter table public.work_entries enable row level security;

-- Kullanıcı sadece kendi kayıtlarını görebilir
create policy "select_own" on public.work_entries
  for select using (auth.uid() = user_id);

-- Kullanıcı sadece kendi kayıtlarını oluşturabilir
-- user_id, istemciden auth.uid() ile otomatik doldurulur
create policy "insert_own" on public.work_entries
  for insert with check (auth.uid() = user_id);

-- Kullanıcı sadece kendi kayıtlarını güncelleyebilir
create policy "update_own" on public.work_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Kullanıcı sadece kendi kayıtlarını silebilir
create policy "delete_own" on public.work_entries
  for delete using (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 4. OTOMATİK updated_at TETİKLEYİCİSİ
-- --------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger: her güncellemede updated_at otomatik yenilenir
create trigger set_updated_at
  before update on public.work_entries
  for each row
  execute function public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- 5. YARDIMCI RPC FONKSİYONLARI
-- --------------------------------------------------------------------------

-- 🔴 CLOCK SKEW KORUMASI: Sunucu zamanını döndüren RPC fonksiyonu.
-- İstemci, tarih/saat hesaplamalarında cihaz saati yerine BU fonksiyonu
-- kullanmalıdır. Cihaz saati hatalı olsa bile doğru zamanı verir.
create or replace function public.get_server_time()
returns timestamptz as $$
begin
  return now();
end;
$$ language plpgsql;
