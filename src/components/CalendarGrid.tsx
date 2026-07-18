// ============================================================================
// CalendarGrid — Google Ajanda Benzeri Grid Görünümü
// ============================================================================
// Dikey saat ekseni: 05:00–20:00 (görsel sınır, veri kısıtı DEĞİL).
// Saat çizgileri TIKLANAMAZ — sadece görsel referans.
// Gün sütununun tamamı tıklanabilir.
// ============================================================================

import { useState, useMemo } from 'react';
import type { CalendarViewMode, WorkEntry } from '../types';
import { useServerTime } from '../hooks/useServerTime';

interface CalendarGridProps {
  entries: WorkEntry[];
  onDayClick: (date: string) => void;
}

/** Tarihi ISO formatına çevirir (YYYY-MM-DD) */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Saat aralığını oluşturur (05:00–20:00) */
const HOUR_RANGE = Array.from({ length: 16 }, (_, i) => i + 5); // 5..20

/** Gün adları (Türkçe, kısa) */
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function CalendarGrid({ entries, onDayClick }: CalendarGridProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('7day');
  const [offset, setOffset] = useState(0); // bugünden kaç gün ileri/geri
  const { now: serverNow } = useServerTime(); // Clock Skew koruması

  const days = useMemo(() => {
    // Sunucu zamanını kullanarak "bugün"ü belirle (cihaz saati hatalı olabilir)
    const today = new Date(serverNow);
    today.setHours(0, 0, 0, 0);

    let dayCount = 7;
    if (viewMode === '1day') dayCount = 1;
    else if (viewMode === '3day') dayCount = 3;

    const start = new Date(today);
    start.setDate(start.getDate() + offset);

    return Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [viewMode, offset, serverNow]);

  /** Grid üzerinde entry bloğunun konumunu hesaplar */
  function getEntryBlockStyle(entry: WorkEntry): React.CSSProperties | null {
    const startDate = new Date(entry.start_time);
    const endDate = new Date(entry.end_time);

    // Yerel saat kullan (getHours/getMinutes) — kullanıcının saat dilimine göre
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const endHour = endDate.getHours() + endDate.getMinutes() / 60;

    // Görünür aralık: 05:00–20:00
    const visibleStart = Math.max(startHour, 5);
    const visibleEnd = Math.min(endHour, 20);

    if (visibleStart >= visibleEnd) return null; // tamamen görünür aralık dışında

    const top = (visibleStart - 5) * 60; // her saat = 60px
    const height = (visibleEnd - visibleStart) * 60;

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  }

  const todayStr = toISODate(serverNow);

  return (
    <div className="calendar-grid">
      {/* Üst navigasyon */}
      <div className="calendar-header">
        <div className="calendar-header__nav">
          <button
            onClick={() => setOffset((o) => o - (viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7))}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}
          >
            ←
          </button>
          <button
            onClick={() => { setOffset(0); }}
            style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', padding: '4px 8px', color: 'var(--color-primary)' }}
          >
            Bugün
          </button>
          <button
            onClick={() => setOffset((o) => o + (viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7))}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}
          >
            →
          </button>
        </div>
        <span className="calendar-header__date">
          {days.length === 1
            ? days[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
            : `${days[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} — ${days[days.length - 1].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </span>
        <div className="calendar-view-toggle">
          {(['1day', '3day', '7day'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              className={viewMode === mode ? 'active' : ''}
              onClick={() => setViewMode(mode)}
            >
              {mode === '1day' ? '1 Gün' : mode === '3day' ? '3 Gün' : '1 Hafta'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid gövdesi */}
      <div className="calendar-body">
        {/* Sol saat ekseni */}
        <div className="time-axis">
          {HOUR_RANGE.map((hour) => (
            <div key={hour} className="time-axis__label">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Gün sütunları */}
        <div className="day-columns">
          {days.map((day) => {
            const dateStr = toISODate(day);
            const isToday = dateStr === todayStr;
            const dayEntries = entries.filter((e) => e.logical_date === dateStr);

            return (
              <div
                key={dateStr}
                className={`day-column${isToday ? ' today' : ''}`}
                onClick={() => onDayClick(dateStr)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onDayClick(dateStr); }}
                aria-label={`${dateStr} günü kaydı`}
              >
                {/* Gün başlığı */}
                <div className="day-column__header">
                  <div style={{ fontWeight: isToday ? 700 : 400, fontSize: 13 }}>
                    {DAY_NAMES[(day.getDay() + 6) % 7]}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: isToday ? 700 : 400 }}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Saat çizgileri — tıklanamaz, sadece görsel */}
                {HOUR_RANGE.map((hour) => (
                  <div key={hour} className="day-column__hour-line" />
                ))}

                {/* Kayıtlı giriş blokları */}
                {dayEntries.map((entry) => {
                  const style = getEntryBlockStyle(entry);
                  if (!style) return null;
                  return (
                    <div
                      key={entry.id}
                      className="entry-block"
                      style={style}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
