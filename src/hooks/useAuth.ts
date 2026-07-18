// ============================================================================
// useAuth — Kimlik doğrulama hook'u
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, signInWithGoogle, signOut } from '../services/supabase';

interface UseAuthReturn {
  session: Session | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde mevcut session'ı kontrol et
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    // Auth durum değişikliklerini dinle
    // 🟢 Memory leak önlemi: cleanup'ta unsubscribe çağrılır
    const unsubscribe = onAuthStateChange((newSession) => {
      setSession(newSession as Session | null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Redirect olacağı için buradan sonrası çalışmaz
    } catch (error) {
      console.error('Giriş hatası:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setSession(null);
    } catch (error) {
      console.error('Çıkış hatası:', error);
      throw error;
    }
  }, []);

  return { session, loading, login, logout };
}
