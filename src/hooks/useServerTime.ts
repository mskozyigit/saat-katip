// ============================================================================
// useServerTime — Clock Skew (Zaman Sapması) Koruması
// ============================================================================
// Kullanıcının cihaz saati hatalı olsa bile, sunucu zamanına göre
// doğru "bugün" tespiti yapar. Supabase'den server time alır,
// istemci-sunucu arasındaki farkı (offset) hesaplar ve saklar.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { getServerTime } from '../services/supabase';

interface UseServerTimeReturn {
  /** Sunucu saatine göre düzeltilmiş şimdiki zaman */
  now: Date;
  /** Sunucu zamanı yüklenene kadar true */
  loading: boolean;
  /** Offset dakika cinsinden (pozitif: istemci ileride, negatif: istemci geride) */
  offsetMinutes: number;
  /** Sunucu zamanını manuel yenile */
  refresh: () => Promise<void>;
}

/**
 * Sunucu zamanını alır ve istemci-sunucu offset'ini hesaplar.
 * Uygulama başlangıcında bir kere çağrılır, periyodik yenileme yapmaz.
 */
export function useServerTime(): UseServerTimeReturn {
  const [serverNow, setServerNow] = useState<Date>(() => new Date());
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const clientBefore = Date.now();
      const serverTime = await getServerTime();
      const clientAfter = Date.now();

      // Ağ gecikmesini dengelemek için ortalama al
      const clientNow = new Date((clientBefore + clientAfter) / 2);
      const offsetMs = clientNow.getTime() - serverTime.getTime();
      const offsetMin = Math.round(offsetMs / 60000);

      setOffsetMinutes(offsetMin);
      setServerNow(serverTime);
    } catch {
      // Sunucuya ulaşılamazsa istemci saatini kullan (fallback)
      console.warn('Sunucu zamanı alınamadı, istemci saati kullanılıyor.');
      setServerNow(new Date());
      setOffsetMinutes(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // İlk mount'ta sunucu zamanını bir kere çek
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      refresh();
    }
  }, [refresh]);

  return { now: serverNow, loading, offsetMinutes, refresh };
}
