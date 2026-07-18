// ============================================================================
// Saat Katip — Merkezi Tip Tanımları
// ============================================================================

/** Veritabanındaki work_entries tablosunun satır tipi */
export interface WorkEntry {
  id: string;
  user_id: string;
  /** Kullanıcının ajandada tıkladığı gün (mantıksal gün) */
  logical_date: string; // ISO date: 'YYYY-MM-DD'
  /** Başlangıç zaman damgası (UTC) */
  start_time: string; // ISO 8601 timestamptz
  /** Bitiş zaman damgası (UTC), gece yarısını geçebilir */
  end_time: string; // ISO 8601 timestamptz
  /** Mola süresi (dakika), 0 veya 15/30/45/60 */
  break_minutes: number;
  /** Otomatik hesaplanan toplam çalışma süresi (dakika) */
  total_minutes: number;
  created_at: string;
  updated_at: string;
}

/** Yeni kayıt oluşturma / güncelleme için kullanılan girdi */
export interface WorkEntryInput {
  /** Mevcut kaydı güncellerken id zorunlu, yeni kayıtta boş */
  id?: string;
  logical_date: string;
  start_time: string; // ISO 8601 timestamptz
  end_time: string; // ISO 8601 timestamptz
  break_minutes: number;
}

/** Günlük Kayıt kartında alan bazında öneri durumu */
export type SuggestionStatus = 'suggestion' | 'manual' | 'saved';

/** Tek bir alan için öneri verisi */
export interface FieldSuggestion {
  value: string | number;
  status: SuggestionStatus;
}

/** Günlük Kayıt kartının tüm alanları için öneri paketi */
export interface DailySuggestions {
  start: FieldSuggestion | null;
  end: FieldSuggestion | null;
  break: FieldSuggestion | null;
}

/** Ajanda görünüm modu */
export type CalendarViewMode = '1day' | '3day' | '7day';

/** Günlük Kayıt kartı durumu */
export interface DailyEntryState {
  isOpen: boolean;
  selectedDate: string; // ISO date
  existingEntry: WorkEntry | null;
  suggestions: DailySuggestions | null;
}
