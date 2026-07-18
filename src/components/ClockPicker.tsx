// ============================================================================
// ClockPicker — Dairesel (Analog) Saat Seçici
// ============================================================================
// Yuvarlak saat kadranı üzerinde saat ve dakika seçimi yapılır.
// Mobil dokunma hedeflerine ve hem mouse hem touch etkileşime uygundur.
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

interface ClockPickerProps {
  value: string;        // HH:mm formatında mevcut değer
  onChange: (time: string) => void;
  onClose: () => void;
}

/** Derece → radyan */
function toRad(deg: number): number { return (deg * Math.PI) / 180; }

/** Bir noktanın dairenin merkezine göre açısını hesaplar (derece, 0 = üst) */
function angleFromCenter(cx: number, cy: number, px: number, py: number): number {
  const dx = px - cx;
  const dy = py - cy;
  const rad = Math.atan2(dy, dx);
  let deg = (rad * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  return deg;
}

/** Saat numarasına göre kadrandaki açı */
function hourToAngle(hour: number): number {
  return (hour / 24) * 360;
}

/** Açıya en yakın saati bul (24 saat) */
function angleToHour(angle: number): number {
  return Math.round((angle / 360) * 24) % 24;
}

/** Açıya en yakın dakikayı bul (0, 15, 30, 45) */
function angleToMinute(angle: number): number {
  const mins = [0, 15, 30, 45];
  const idx = Math.round((angle / 360) * 4) % 4;
  return mins[idx];
}

// ============================================================================

export default function ClockPicker({ value, onChange, onClose }: ClockPickerProps) {
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    const h = parseInt(value.split(':')[0], 10);
    return isNaN(h) ? 9 : h;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    const m = parseInt(value.split(':')[1], 10);
    if (isNaN(m)) return 0;
    return [0, 15, 30, 45].reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a);
  });
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const SIZE = 280;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 110;
  const R_INNER = 70;
  const HAND_R = R - 16;

  // Seçimi onayla
  const confirm = useCallback(() => {
    onChange(`${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`);
    onClose();
  }, [selectedHour, selectedMinute, onChange, onClose]);

  // Escape kapat
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // SVG ref callback — mousedown/touchstart ile etkileşim
  const svgRef = useCallback((el: SVGSVGElement | null) => {
    if (!el) return;

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = el.getBoundingClientRect();
      const scaleX = SIZE / rect.width;
      const scaleY = SIZE / rect.height;
      let cx: number, cy: number;
      if ('touches' in e) {
        cx = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
        cy = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
    };

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      const angle = angleFromCenter(CX, CY, x, y);
      if (mode === 'hour') {
        setSelectedHour(angleToHour(angle));
      } else {
        setSelectedMinute(angleToMinute(angle));
      }
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handlePointer);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handlePointer);
      document.removeEventListener('touchend', handleUp);
    };

    const handleDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handlePointer(e);
      document.addEventListener('mousemove', handlePointer);
      document.addEventListener('mouseup', handleUp);
      document.addEventListener('touchmove', handlePointer, { passive: false });
      document.addEventListener('touchend', handleUp);
    };

    el.addEventListener('mousedown', handleDown);
    el.addEventListener('touchstart', handleDown, { passive: false });

    return () => {
      el.removeEventListener('mousedown', handleDown);
      el.removeEventListener('touchstart', handleDown);
      handleUp();
    };
  }, [mode, CX, CY]);

  // Saat ibresi ucu
  const hourAngleDeg = hourToAngle(selectedHour);
  const hourRad = toRad(hourAngleDeg - 90);
  const handX = CX + HAND_R * Math.cos(hourRad);
  const handY = CY + HAND_R * Math.sin(hourRad);

  // Saat işaretleri (24 saat)
  const hourMarkers = Array.from({ length: 24 }, (_, i) => {
    const angle = hourToAngle(i);
    const rad = toRad(angle - 90);
    const tx = CX + R * Math.cos(rad);
    const ty = CY + R * Math.sin(rad);
    const isSelected = i === selectedHour && mode === 'hour';
    return { i, tx, ty, isSelected };
  });

  // Dakika işaretleri
  const minuteMarkers = [0, 15, 30, 45].map((m, idx) => {
    const angle = (idx / 4) * 360;
    const rad = toRad(angle - 90);
    const tx = CX + R_INNER * Math.cos(rad);
    const ty = CY + R_INNER * Math.sin(rad);
    const isSelected = m === selectedMinute && mode === 'minute';
    return { m, tx, ty, isSelected };
  });

  return (
    <div
      className="clock-picker-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="circular-clock" role="dialog" aria-label="Saat seçici">
        <div className="circular-clock__header">
          <span>Saat Seç</span>
          <button className="circular-clock__close" onClick={onClose}>✕</button>
        </div>

        <div className="circular-clock__face">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            style={{ touchAction: 'none', cursor: 'pointer' }}
          >
            {/* Dış halka */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E5E7EB" strokeWidth="28" />
            {/* İç halka */}
            <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="#F3F4F6" strokeWidth="20" />

            {/* Saat rakamları */}
            {hourMarkers.map(({ i, tx, ty, isSelected }) => (
              <g key={`h-${i}`}>
                {isSelected && <circle cx={tx} cy={ty} r="18" fill="#2563EB" opacity="0.15" />}
                <text
                  x={tx} y={ty}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={i < 10 ? 12 : 11}
                  fontWeight={isSelected ? 700 : 400}
                  fill={isSelected ? '#2563EB' : '#6B7280'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {String(i).padStart(2, '0')}
                </text>
              </g>
            ))}

            {/* Dakika rakamları */}
            {minuteMarkers.map(({ m, tx, ty, isSelected }) => (
              <g key={`m-${m}`}>
                {isSelected && <circle cx={tx} cy={ty} r="16" fill="#2563EB" opacity="0.2" />}
                <text
                  x={tx} y={ty}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={14}
                  fontWeight={isSelected ? 700 : 500}
                  fill={isSelected ? '#2563EB' : '#9CA3AF'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {String(m).padStart(2, '0')}
                </text>
              </g>
            ))}

            {/* Merkez */}
            <circle cx={CX} cy={CY} r="38" fill="white" stroke="#E5E7EB" strokeWidth="1" />
            <text
              x={CX} y={CY - 5} textAnchor="middle" dominantBaseline="central"
              fontSize={20} fontWeight={700} fill="#1F2937"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
            </text>
            <text
              x={CX} y={CY + 15} textAnchor="middle" dominantBaseline="central"
              fontSize={10} fill="#9CA3AF"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {mode === 'hour' ? 'saat seç' : 'dakika seç'}
            </text>

            {/* İbre */}
            {mode === 'hour' && (
              <line x1={CX} y1={CY} x2={handX} y2={handY}
                stroke="#2563EB" strokeWidth="3" strokeLinecap="round"
                style={{ pointerEvents: 'none' }} />
            )}
          </svg>
        </div>

        {/* Mod butonları */}
        <div className="circular-clock__modes">
          <button
            className={`circular-clock__mode-btn${mode === 'hour' ? ' active' : ''}`}
            onClick={() => setMode('hour')}
          >Saat</button>
          <button
            className={`circular-clock__mode-btn${mode === 'minute' ? ' active' : ''}`}
            onClick={() => setMode('minute')}
          >Dakika</button>
        </div>

        <div className="circular-clock__footer">
          <button className="circular-clock__confirm" onClick={confirm}>Onayla</button>
        </div>
      </div>
    </div>
  );
}
