// ============================================================================
// HomePage — Ana Sayfa (Ajanda + Günlük Kayıt Kartı)
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import { logOutOutline } from 'ionicons/icons';
import CalendarGrid from '../components/CalendarGrid';
import DailyEntryCard from '../components/DailyEntryCard';
import ErrorBoundary from '../components/ErrorBoundary';
import { useWorkEntries } from '../hooks/useWorkEntries';
import { useAuth } from '../hooks/useAuth';
import { useServerTime } from '../hooks/useServerTime';
import type { WorkEntry, WorkEntryInput } from '../types';

/** Bugünden itibaren bir haftalık aralık döndürür */
function getDefaultRange(today: Date): { start: string; end: string } {
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() + 1); // Pazartesi
  const end = new Date(start);
  end.setDate(end.getDate() + 13); // 2 hafta göster

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function HomePage() {
  const { logout } = useAuth();
  const { entries, loading, loadEntries, getEntriesByDate, saveEntry } = useWorkEntries();
  const { now: serverNow } = useServerTime(); // Clock Skew koruması

  // Modal durumu
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEntries, setDayEntries] = useState<WorkEntry[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // İlk yükleme
  useEffect(() => {
    const range = getDefaultRange(serverNow);
    loadEntries(range.start, range.end);
  }, [loadEntries, serverNow]);

  // Gün sütununa tıklandığında
  const handleDayClick = useCallback(async (date: string) => {
    setSelectedDate(date);
    setModalLoading(true);
    try {
      const dayData = await getEntriesByDate(date);
      setDayEntries(dayData);
    } catch {
      setDayEntries([]);
    } finally {
      setModalLoading(false);
    }
  }, [getEntriesByDate]);

  // Kaydet (yeni veya guncelleme)
  const handleSave = useCallback(async (input: WorkEntryInput) => {
    const result = await saveEntry(input);
    // Gunun listesini yenile
    if (selectedDate) {
      const updated = await getEntriesByDate(selectedDate);
      setDayEntries(updated);
    }
    return result;
  }, [saveEntry, getEntriesByDate, selectedDate]);

  // Modal kapat
  const handleCloseModal = useCallback(() => {
    setSelectedDate(null);
    setDayEntries([]);
  }, []);

  // Android geri tuşu: overlay açıkken kapat, ana ekranda çift basınca çık
  const backPressRef = useRef(0);
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  useEffect(() => {
    // Overlay açılınca history'e state ekle
    if (selectedDate !== null) {
      window.history.pushState({ overlay: selectedDate }, '');
    }

    const handlePopState = () => {
      if (selectedDateRef.current !== null) {
        // Overlay açık → kapat
        setSelectedDate(null);
        setDayEntries([]);
      } else {
        // Ana ekran → çift basınca çık
        const now = Date.now();
        if (now - backPressRef.current < 800) {
          window.history.back(); // uygulamadan çık
        } else {
          backPressRef.current = now;
          window.history.pushState({ main: true }, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedDate]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Saat Katip</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={logout}>
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <IonSpinner />
          </div>
        ) : (
          <CalendarGrid entries={entries} onDayClick={handleDayClick} />
        )}

        {/* Çalışma Ekle butonu (FAB) — özel stil */}
        <button
          className="fab-custom"
          onClick={() => handleDayClick(serverNow.toISOString().slice(0, 10))}
          aria-label="Çalışma ekle"
        >
          <span className="fab-custom__plus">+</span>
        </button>
      </IonContent>

      {/* Günlük Kayıt — React overlay (Ionic modal değil, tam kontrol) */}
      {selectedDate !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          {/* Backdrop tıklama ile kapatma */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={handleCloseModal} />
          
          {/* İçerik kartı — bottom sheet */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 600, maxHeight: '90vh',
            background: 'var(--md-surface-container-lowest)',
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--md-outline-variant)',
              textAlign: 'center', fontSize: 'var(--md-typescale-title-large)',
              fontWeight: 500, color: 'var(--md-on-surface)',
              background: 'var(--md-surface-container-lowest)',
            }}>
              Günlük Kayıt {dayEntries.length > 0 ? `(${dayEntries.length})` : ''}
            </div>

            {/* İçerik */}
            <div style={{
              flex: 1, overflow: 'auto',
              background: 'var(--md-surface-container-lowest)',
            }}>
              {modalLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <IonSpinner />
                </div>
              ) : (
                <ErrorBoundary>
                  <DailyEntryCard
                    date={selectedDate}
                    entries={dayEntries}
                    onSave={handleSave}
                    onClose={handleCloseModal}
                  />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </div>
      )}
    </IonPage>
  );
}
