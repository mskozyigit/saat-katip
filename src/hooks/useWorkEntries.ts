// ============================================================================
// useWorkEntries — Çalışma kayıtları veri hook'u
// ============================================================================

import { useState, useCallback } from 'react';
import type { WorkEntry, WorkEntryInput } from '../types';
import {
  fetchWorkEntries,
  fetchEntriesByDate,
  fetchRecentEntries,
  saveWorkEntry,
  deleteWorkEntry,
} from '../services/supabase';

interface UseWorkEntriesReturn {
  entries: WorkEntry[];
  loading: boolean;
  loadEntries: (start: string, end: string) => Promise<void>;
  getEntriesByDate: (date: string) => Promise<WorkEntry[]>;
  saveEntry: (input: WorkEntryInput) => Promise<WorkEntry>;
  removeEntry: (id: string) => Promise<void>;
  getRecentEntries: (limit?: number) => Promise<WorkEntry[]>;
}

export function useWorkEntries(): UseWorkEntriesReturn {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEntries = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const data = await fetchWorkEntries(startDate, endDate);
      setEntries(data);
    } catch (error) {
      console.error('Kayıtlar yüklenemedi:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEntriesByDate = useCallback(async (date: string): Promise<WorkEntry[]> => {
    try {
      return await fetchEntriesByDate(date);
    } catch (error) {
      console.error('Gunluk kayitlar alinamadi:', error);
      return [];
    }
  }, []);

  const saveEntry = useCallback(async (input: WorkEntryInput): Promise<WorkEntry> => {
    try {
      const result = await saveWorkEntry(input);
      // Yerel state'i guncelle
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === result.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = result;
          return updated;
        }
        return [...prev, result];
      });
      return result;
    } catch (error) {
      console.error('Kayit kaydedilemedi:', error);
      throw error;
    }
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    try {
      await deleteWorkEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Kayit silinemedi:', error);
      throw error;
    }
  }, []);

  const getRecentEntries = useCallback(async (limit: number = 5) => {
    try {
      return await fetchRecentEntries(limit);
    } catch (error) {
      console.error('Son kayıtlar alınamadı:', error);
      return [];
    }
  }, []);

  return { entries, loading, loadEntries, getEntriesByDate, saveEntry, removeEntry, getRecentEntries };
}
