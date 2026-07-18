// ============================================================================
// DailyEntryCard — Gunluk Kayit Karti (Coklu Kayit Destegi)
// ============================================================================
// Bir gune ait TUM kayitlari listeler. Yeni kayit ekleme, duzenleme, silme.
// Oneri algoritmasi sadece YENI kayit eklerken calisir.
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import type { WorkEntry, DailySuggestions, FieldSuggestion, WorkEntryInput } from '../types';
import { usePrediction } from '../hooks/usePrediction';
import ClockPicker from './ClockPicker';

interface DailyEntryCardProps {
  date: string;
  entries: WorkEntry[];
  onSave: (input: WorkEntryInput) => Promise<WorkEntry>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function parseTime(timeStr: string): { hh: number; mm: number } | null {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function calcTotal(startTime: string, endTime: string, breakMin: number, date: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (!start || !end) return 0;
  const startDate = new Date(`${date}T${String(start.hh).padStart(2, '0')}:${String(start.mm).padStart(2, '0')}:00`);
  const endTotalMin = end.hh * 60 + end.mm;
  const startTotalMin = start.hh * 60 + start.mm;
  const isNextDay = endTotalMin <= startTotalMin;
  const endDateStr = isNextDay
    ? (() => { const n = new Date(startDate); n.setDate(n.getDate() + 1); return n.toISOString().slice(0, 10); })()
    : date;
  const endDate = new Date(`${endDateStr}T${String(end.hh).padStart(2, '0')}:${String(end.mm).padStart(2, '0')}:00`);
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 60000) - breakMin);
}

function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} dk`;
  return `${h} sa ${m} dk`;
}

function extractTime(entry: WorkEntry): { start: string; end: string; isNextDay: boolean } {
  const sd = new Date(entry.start_time);
  const ed = new Date(entry.end_time);
  const start = `${String(sd.getUTCHours()).padStart(2, '0')}:${String(sd.getUTCMinutes()).padStart(2, '0')}`;
  const end = `${String(ed.getUTCHours()).padStart(2, '0')}:${String(ed.getUTCMinutes()).padStart(2, '0')}`;
  const isNextDay = ed.getUTCDate() !== sd.getUTCDate() || ed.getUTCMonth() !== sd.getUTCMonth() || ed.getUTCFullYear() !== sd.getUTCFullYear();
  const sm = sd.getUTCHours() * 60 + sd.getUTCMinutes();
  const em = ed.getUTCHours() * 60 + ed.getUTCMinutes();
  return { start, end, isNextDay: isNextDay || em <= sm };
}

// ============================================================================
// EntryForm — Tek kayit formu (yeni veya duzenleme)
// ============================================================================
function EntryForm({ date, entry, suggestions, onSave, onCancel, saving }: {
  date: string;
  entry: WorkEntry | null;
  suggestions: DailySuggestions | null;
  onSave: (input: WorkEntryInput) => Promise<WorkEntry>;
  onCancel: () => void;
  saving: boolean;
}) {
  const isNew = !entry;
  const et = entry ? extractTime(entry) : null;

  const [startTime, setStartTime] = useState(() =>
    et ? et.start : suggestions?.start?.value as string ?? '');
  const [endTime, setEndTime] = useState(() =>
    et ? et.end : suggestions?.end?.value as string ?? '');
  const [breakMinutes, setBreakMinutes] = useState(() =>
    entry ? entry.break_minutes : suggestions?.break?.value as number ?? 0);
  const [cpField, setCpField] = useState<'start' | 'end' | null>(null);
  const [touched, setTouched] = useState<Set<string>>(() =>
    entry ? new Set(['start', 'end', 'break']) : new Set());

  const ht = (f: string) => setTouched(p => new Set(p).add(f));

  const isNextDay = useMemo(() => {
    if (!startTime || !endTime) return false;
    const s = parseTime(startTime), e = parseTime(endTime);
    return !!(s && e && (e.hh * 60 + e.mm) <= (s.hh * 60 + s.mm));
  }, [startTime, endTime]);

  const total = useMemo(() =>
    startTime && endTime ? calcTotal(startTime, endTime, breakMinutes, date) : 0,
    [startTime, endTime, breakMinutes, date]);

  function isSugg(field: string, val: string | number): boolean {
    if (!isNew || touched.has(field) || !suggestions) return false;
    const s = suggestions[field as keyof DailySuggestions] as FieldSuggestion | null;
    return !!(s && s.status === 'suggestion' && String(s.value) === String(val));
  }

  const handleSave = async () => {
    if (!startTime || !endTime) return;
    const s = parseTime(startTime), e = parseTime(endTime);
    if (!s || !e) return;
    const startISO = `${date}T${String(s.hh).padStart(2, '0')}:${String(s.mm).padStart(2, '0')}:00+03:00`;
    const etm = e.hh * 60 + e.mm, stm = s.hh * 60 + s.mm;
    const ed = etm <= stm ? (() => { const n = new Date(date + 'T00:00:00'); n.setDate(n.getDate() + 1); return n.toISOString().slice(0, 10); })() : date;
    const endISO = `${ed}T${String(e.hh).padStart(2, '0')}:${String(e.mm).padStart(2, '0')}:00+03:00`;
    await onSave({ id: entry?.id, logical_date: date, start_time: startISO, end_time: endISO, break_minutes: breakMinutes });
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: isNew ? '#2563EB' : '#1F2937' }}>
        {isNew ? '🆕 Yeni Kayıt' : '✏️ Kaydı Düzenle'}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="field-label">Başlangıç {isSugg('start', startTime) && <span className="suggestion-icon">💡 Öneri</span>}</div>
        <div className="time-input-row">
          <input className={`time-input${isSugg('start', startTime) ? ' suggestion' : ''}`}
            type="text" inputMode="numeric" placeholder="SS:DD" value={startTime}
            onChange={e => { ht('start'); setStartTime(formatTimeInput(e.target.value)); }}
            onFocus={() => ht('start')} maxLength={5} />
          <button className="clock-picker-btn" onClick={() => { ht('start'); setCpField('start'); }}>🕐</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="field-label">Mola {isSugg('break', breakMinutes) && <span className="suggestion-icon">💡 Öneri</span>}</div>
        <div className="break-buttons">
          {[15, 30, 45, 60].map(min => {
            const sel = breakMinutes === min;
            const sg = isSugg('break', breakMinutes) && sel;
            return <button key={min} className={`break-btn${sel && !sg ? ' selected' : ''}${sg ? ' suggestion-selected' : ''}`}
              onClick={() => { ht('break'); setBreakMinutes(sel ? 0 : min); }}>{min} dk</button>;
          })}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div className="field-label">
          Bitiş {isSugg('end', endTime) && <span className="suggestion-icon">💡 Öneri</span>}
          {isNextDay && startTime && endTime && <span className="next-day-badge">+1 gün</span>}
        </div>
        <div className="time-input-row">
          <input className={`time-input${isSugg('end', endTime) ? ' suggestion' : ''}`}
            type="text" inputMode="numeric" placeholder="SS:DD" value={endTime}
            onChange={e => { ht('end'); setEndTime(formatTimeInput(e.target.value)); }}
            onFocus={() => ht('end')} maxLength={5} />
          <button className="clock-picker-btn" onClick={() => { ht('end'); setCpField('end'); }}>🕐</button>
        </div>
      </div>

      <div className="total-display" style={{ fontSize: 16, padding: '8px 12px', marginTop: 8 }}>
        Toplam: {formatMinutes(total)}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-cancel" onClick={onCancel} style={{ flex: 1 }}>İptal</button>
        <button className="btn-save" onClick={handleSave} disabled={saving || !startTime || !endTime} style={{ flex: 1 }}>
          {saving ? '...' : 'Kaydet'}
        </button>
      </div>

      {cpField && <ClockPicker value={cpField === 'start' ? startTime : endTime}
        onChange={t => cpField === 'start' ? setStartTime(t) : setEndTime(t)}
        onClose={() => setCpField(null)} />}
    </div>
  );
}

// ============================================================================
// Ana Bilesen
// ============================================================================
export default function DailyEntryCard({ date, entries, onSave, onDelete, onClose }: DailyEntryCardProps) {
  const { generateSuggestions } = usePrediction();
  const [suggestions, setSuggestions] = useState<DailySuggestions | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Onerileri asenkron yukle (mount'ta bir kere)
  useEffect(() => {
    if (!loaded) {
      generateSuggestions()
        .then(s => { if (s) setSuggestions(s); })
        .catch(() => { /* cold start veya hata - oneri yok */ })
        .finally(() => setLoaded(true));
    }
  }, [loaded, generateSuggestions]);

  const handleSave = async (input: WorkEntryInput): Promise<WorkEntry> => {
    setSaving(true);
    try {
      const result = await onSave(input);
      setAddingNew(false);
      setEditingId(null);
      return result;
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydi silmek istediginize emin misiniz?')) return;
    await onDelete(id);
  };

  const dateDisplay = new Date(date + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="daily-entry-card">
      <h3>{dateDisplay}</h3>

      {entries.map(entry => {
        const t = extractTime(entry);
        if (editingId === entry.id) {
          return <EntryForm key={entry.id} date={date} entry={entry} suggestions={null}
            onSave={handleSave} onCancel={() => setEditingId(null)} saving={saving} />;
        }
        return (
          <div key={entry.id} style={{
            border: '1px solid #E5E7EB', borderRadius: 10, padding: 14, marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {t.start} → {t.end} {t.isNextDay && <span className="next-day-badge">+1 gün</span>}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Mola: {entry.break_minutes} dk · Toplam: {formatMinutes(entry.total_minutes)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditingId(entry.id)}
                style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>✏️</button>
              <button onClick={() => handleDelete(entry.id)}
                style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>🗑️</button>
            </div>
          </div>
        );
      })}

      {addingNew && loaded && <EntryForm key="new-form" date={date} entry={null} suggestions={suggestions}
        onSave={handleSave} onCancel={() => setAddingNew(false)} saving={saving} />}

      {!addingNew && (
        <button onClick={() => setAddingNew(true)} style={{
          width: '100%', padding: 14, border: '2px dashed #D1D5DB', borderRadius: 10,
          background: 'transparent', fontSize: 15, fontWeight: 600, color: '#2563EB', cursor: 'pointer', marginTop: 8,
        }}>+ Yeni Kayıt Ekle</button>
      )}

      <div className="card-actions" style={{ marginTop: 16 }}>
        <button className="btn-cancel" onClick={onClose}>Kapat</button>
      </div>
    </div>
  );
}
