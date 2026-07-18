// ============================================================================
// HomePage — Ana Sayfa (Ajanda + Günlük Kayıt Kartı)
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonModal,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonFab,
  IonFabButton,
} from '@ionic/react';
import { logOutOutline, addOutline } from 'ionicons/icons';
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
  const { entries, loading, loadEntries, getEntriesByDate, saveEntry, removeEntry } = useWorkEntries();
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

  // Sil
  const handleDelete = useCallback(async (id: string) => {
    await removeEntry(id);
    if (selectedDate) {
      const updated = await getEntriesByDate(selectedDate);
      setDayEntries(updated);
    }
  }, [removeEntry, getEntriesByDate, selectedDate]);

  // Modal kapat
  const handleCloseModal = useCallback(() => {
    setSelectedDate(null);
    setDayEntries([]);
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle style={{ fontWeight: 500, letterSpacing: '0.5px', fontSize: 20 }}>Saat Katip</IonTitle>
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

        {/* Çalışma Ekle butonu (FAB) */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => handleDayClick(serverNow.toISOString().slice(0, 10))}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      {/* Günlük Kayıt Modalı */}
      <IonModal isOpen={selectedDate !== null} onDidDismiss={handleCloseModal}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              Günlük Kayıt {dayEntries.length > 0 ? `(${dayEntries.length})` : ''}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleCloseModal}>Kapat</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <div style={{
          flex: 1,
          overflow: 'auto',
          background: '#ffffff',
        }}>
          {modalLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <IonSpinner />
            </div>
          ) : (
            <ErrorBoundary>
              <DailyEntryCard
                date={selectedDate!}
                entries={dayEntries}
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={handleCloseModal}
              />
            </ErrorBoundary>
          )}
        </div>
      </IonModal>
    </IonPage>
  );
}
