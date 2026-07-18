// ============================================================================
// usePrediction — Öneri (Predictive Input) Algoritması
// ============================================================================
// Veri havuzu: Kullanıcının en son 5 kaydı.
// Hesaplama: Başlangıç, Bitiş ve Mola için ayrı ayrı istatistiksel MOD.
// Mola için 0 (mola girilmemiş) da bir aday değerdir.
// Tie-breaker (eşitlik): Kronolojik olarak en son girilen değer kazanır.
// Cold start: Hiç kayıt yoksa öneri üretilmez.
// ============================================================================

import { useState, useCallback } from 'react';
import type { WorkEntry, DailySuggestions } from '../types';
import { useWorkEntries } from './useWorkEntries';

/**
 * Bir dizi içindeki en sık tekrar eden değeri (mod) bulur.
 * Eşitlik durumunda en son görülen değeri döndürür.
 */
function findModeWithTiebreaker<T>(values: T[]): T | null {
  if (values.length === 0) return null;

  const freq = new Map<string, { value: T; count: number; lastIndex: number }>();

  values.forEach((val, index) => {
    const key = String(val);
    const existing = freq.get(key);
    if (existing) {
      existing.count++;
      existing.lastIndex = index; // en son görülme indeksini güncelle
    } else {
      freq.set(key, { value: val, count: 1, lastIndex: index });
    }
  });

  // En yüksek frekansı bul
  let best: { value: T; count: number; lastIndex: number } | null = null;
  for (const entry of freq.values()) {
    if (!best || entry.count > best.count || (entry.count === best.count && entry.lastIndex > best.lastIndex)) {
      best = entry;
    }
  }

  return best?.value ?? null;
}

/**
 * Zaman damgasından HH:mm formatında saat çıkarır.
 */
function extractTime(timestamp: string): string {
  const date = new Date(timestamp);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface UsePredictionReturn {
  suggestions: DailySuggestions | null;
  loading: boolean;
  generateSuggestions: () => Promise<DailySuggestions | null>;
  clearSuggestions: () => void;
}

export function usePrediction(): UsePredictionReturn {
  const [suggestions, setSuggestions] = useState<DailySuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const { getRecentEntries } = useWorkEntries();

  const generateSuggestions = useCallback(async (): Promise<DailySuggestions | null> => {
    setLoading(true);
    try {
      const records = await getRecentEntries(5);

      // Soğuk başlangıç: hiç kayıt yoksa öneri yok
      if (records.length === 0) {
        setSuggestions(null);
        return null;
      }

      // Başlangıç saatleri
      const startTimes = records.map((r: WorkEntry) => extractTime(r.start_time));
      const modeStart = findModeWithTiebreaker(startTimes);

      // Bitiş saatleri
      const endTimes = records.map((r: WorkEntry) => extractTime(r.end_time));
      const modeEnd = findModeWithTiebreaker(endTimes);

      // Mola süreleri (0 dahil)
      const breaks = records.map((r: WorkEntry) => r.break_minutes);
      const modeBreak = findModeWithTiebreaker(breaks);

      const result: DailySuggestions = {
        start: modeStart !== null ? { value: modeStart, status: 'suggestion' } : null,
        end: modeEnd !== null ? { value: modeEnd, status: 'suggestion' } : null,
        break: modeBreak !== null ? { value: modeBreak, status: 'suggestion' } : null,
      };

      setSuggestions(result);
      return result;
    } catch (error) {
      console.error('Öneri hesaplanamadı:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getRecentEntries]);

  const clearSuggestions = useCallback(() => {
    setSuggestions(null);
  }, []);

  return { suggestions, loading, generateSuggestions, clearSuggestions };
}
