// ============================================================================
// ClockPicker — Mobil uyumlu saat seçici bileşeni
// ============================================================================
// Kullanıcı saat ikonuna tıklayınca açılır, saat:dakika seçimi yapılır.
// Seçim yapılınca otomatik kapanır. Mobil dokunma hedeflerine uygundur.
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';

interface ClockPickerProps {
  value: string; // HH:mm formatında mevcut değer
  onChange: (time: string) => void; // HH:mm formatında yeni değer
  onClose: () => void;
}

export default function ClockPicker({ value, onChange, onClose }: ClockPickerProps) {
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    const parsed = parseInt(value.split(':')[0], 10);
    return isNaN(parsed) ? 9 : parsed;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    const parsed = parseInt(value.split(':')[1], 10);
    return isNaN(parsed) ? 0 : parsed;
  });

  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Seçili saate scroll'la
  useEffect(() => {
    if (hourScrollRef.current) {
      const item = hourScrollRef.current.children[selectedHour] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [selectedHour]);

  // Seçili dakikaya scroll'la (0, 15, 30, 45)
  useEffect(() => {
    if (minuteScrollRef.current) {
      const minuteIdx = Math.floor(selectedMinute / 15);
      const item = minuteScrollRef.current.children[minuteIdx] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [selectedMinute]);

  // Seçimi onayla
  const handleConfirm = useCallback(() => {
    const formatted = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(formatted);
    onClose();
  }, [selectedHour, selectedMinute, onChange, onClose]);

  // Backdrop tıklanınca kapat
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [onClose]);

  // Escape tuşu ile kapat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <div className="clock-picker-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="clock-picker" role="dialog" aria-label="Saat seçici">
        <div className="clock-picker__header">
          <span>Saat Seç</span>
          <button className="clock-picker__close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        <div className="clock-picker__body">
          {/* Saat sütunu */}
          <div className="clock-picker__column">
            <div className="clock-picker__column-label">Saat</div>
            <div className="clock-picker__scroll" ref={hourScrollRef}>
              {hours.map((h) => (
                <button
                  key={h}
                  className={`clock-picker__item${h === selectedHour ? ' selected' : ''}`}
                  onClick={() => setSelectedHour(h)}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* Ayırıcı */}
          <div className="clock-picker__separator">:</div>

          {/* Dakika sütunu */}
          <div className="clock-picker__column">
            <div className="clock-picker__column-label">Dakika</div>
            <div className="clock-picker__scroll" ref={minuteScrollRef}>
              {minutes.map((m) => (
                <button
                  key={m}
                  className={`clock-picker__item${m === selectedMinute ? ' selected' : ''}`}
                  onClick={() => setSelectedMinute(m)}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seçili değer önizleme + onay butonu */}
        <div className="clock-picker__footer">
          <div className="clock-picker__preview">
            {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
          </div>
          <button className="clock-picker__confirm" onClick={handleConfirm}>
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}
