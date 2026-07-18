// ============================================================================
// ClockPicker — Dairesel (Analog) Saat Seçici (Clock Dial)
// ============================================================================
// 12 saatlik çember + 60 dakikalık çember.
// Mobil dokunma / mouse sürükleme ile seçim yapılır.
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

interface ClockPickerProps {
  value: string;        // HH:mm formatında mevcut değer (24 saat)
  onChange: (time: string) => void;
  onClose: () => void;
}

/** Derece → radyan */
function toRad(deg: number): number { return (deg * Math.PI) / 180; }

/** Bir noktanın dairenin merkezine göre açısı (derece, 0 = üst, saat yönü) */
function angleFromCenter(cx: number, cy: number, px: number, py: number): number {
  const dx = px - cx;
  const dy = py - cy;
  const rad = Math.atan2(dy, dx);
  let deg = (rad * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  return deg;
}

function to12h(h24: number): number {
  const h = h24 % 12;
  return h === 0 ? 12 : h;
}

function to24h(h12: number, isPM: boolean): number {
  if (h12 === 12) return isPM ? 12 : 0;
  return isPM ? h12 + 12 : h12;
}

function hourToAngle(h12: number): number {
  return ((h12 % 12) / 12) * 360;
}

function angleTo12Hour(angle: number): number {
  const h = Math.round((angle / 360) * 12) % 12;
  return h === 0 ? 12 : h;
}

function minuteToAngle(min: number): number {
  return (min / 60) * 360;
}

function angleToMinute(angle: number): number {
  return Math.round((angle / 360) * 60) % 60;
}

// ============================================================================

export default function ClockPicker({ value, onChange, onClose }: ClockPickerProps) {
  const initialH24 = (() => {
    const h = parseInt(value.split(':')[0], 10);
    return isNaN(h) ? 9 : h;
  })();
  const initialM = (() => {
    const m = parseInt(value.split(':')[1], 10);
    return isNaN(m) ? 0 : m;
  })();

  const [selectedHour24, setSelectedHour24] = useState(initialH24);
  const [selectedMinute, setSelectedMinute] = useState(initialM);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const isPM = selectedHour24 >= 12;
  const selectedHour12 = to12h(selectedHour24);

  const SIZE = 280;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 110;
  const HAND_R = R - 20;

  const confirm = useCallback(() => {
    onChange(`${String(selectedHour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`);
    onClose();
  }, [selectedHour24, selectedMinute, onChange, onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // SVG etkileşim
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
        const h12 = angleTo12Hour(angle);
        setSelectedHour24(to24h(h12, isPM));
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
  }, [mode, isPM, CX, CY]);

  // --- İbre ---
  const ibreAngle = mode === 'hour'
    ? hourToAngle(selectedHour12)
    : minuteToAngle(selectedMinute);
  const ibreRad = toRad(ibreAngle - 90);
  const handX = CX + HAND_R * Math.cos(ibreRad);
  const handY = CY + HAND_R * Math.sin(ibreRad);

  // --- Saat işaretleri (12 adet) ---
  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const h12 = i === 0 ? 12 : i;
    const angle = hourToAngle(h12);
    const rad = toRad(angle - 90);
    const tx = CX + R * Math.cos(rad);
    const ty = CY + R * Math.sin(rad);
    const isSelected = mode === 'hour' && h12 === selectedHour12;
    return { label: String(h12), tx, ty, isSelected };
  });

  // --- Dakika işaretleri (60 adet) ---
  const minuteMarkers = Array.from({ length: 60 }, (_, m) => {
    const angle = minuteToAngle(m);
    const rad = toRad(angle - 90);
    const isMajor = m % 5 === 0;
    const rStart = isMajor ? R - 10 : R - 4;
    const rEnd = R;
    const x1 = CX + rStart * Math.cos(rad);
    const y1 = CY + rStart * Math.sin(rad);
    const x2 = CX + rEnd * Math.cos(rad);
    const y2 = CY + rEnd * Math.sin(rad);
    const lr = R - 18;
    const lx = CX + lr * Math.cos(rad);
    const ly = CY + lr * Math.sin(rad);
    const isSelected = mode === 'minute' && m === selectedMinute;
    return { m, x1, y1, x2, y2, lx, ly, isMajor, isSelected };
  });

  const hh = String(selectedHour24).padStart(2, '0');
  const mm = String(selectedMinute).padStart(2, '0');

  return (
    <div
      className="clock-picker-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="circular-clock" role="dialog" aria-label="Saat seçici">
        {/* --- Üst: Büyük zaman göstergesi + AM/PM --- */}
        <div className="circular-clock__top">
          <div className="circular-clock__time-display">
            <button
              className={`circular-clock__time-digit${mode === 'hour' ? ' active' : ''}`}
              onClick={() => setMode('hour')}
            >
              {hh}
            </button>
            <span className="circular-clock__time-colon">:</span>
            <button
              className={`circular-clock__time-digit${mode === 'minute' ? ' active' : ''}`}
              onClick={() => setMode('minute')}
            >
              {mm}
            </button>
          </div>
          <div className="circular-clock__ampm">
            <button
              className={`circular-clock__ampm-btn${!isPM ? ' active' : ''}`}
              onClick={() => setSelectedHour24(to24h(selectedHour12, false))}
            >ÖÖ</button>
            <button
              className={`circular-clock__ampm-btn${isPM ? ' active' : ''}`}
              onClick={() => setSelectedHour24(to24h(selectedHour12, true))}
            >ÖS</button>
          </div>
        </div>

        {/* --- Saat kadranı --- */}
        <div className="circular-clock__face">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            style={{ touchAction: 'none', cursor: 'pointer', display: 'block' }}
          >
            {/* Halka */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E5E7EB" strokeWidth="28" />

            {mode === 'hour' ? (
              /* ---- SAAT MODU ---- */
              <>
                {hourMarkers.map(({ label, tx, ty, isSelected }) => (
                  <g key={`h-${label}`}>
                    {isSelected && (
                      <circle cx={tx} cy={ty} r="22" fill="#2563EB" />
                    )}
                    <text
                      x={tx} y={ty}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={18}
                      fontWeight={500}
                      fill={isSelected ? '#ffffff' : '#374151'}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {label}
                    </text>
                  </g>
                ))}
              </>
            ) : (
              /* ---- DAKİKA MODU ---- */
              <>
                {minuteMarkers.map(({ m, x1, y1, x2, y2, lx, ly, isMajor, isSelected }) => (
                  <g key={`m-${m}`}>
                    {isSelected && (
                      <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="22" fill="#2563EB" />
                    )}
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isSelected ? '#ffffff' : isMajor ? '#9CA3AF' : '#D1D5DB'}
                      strokeWidth={isSelected ? 3 : isMajor ? 2 : 1}
                      strokeLinecap="round"
                      style={{ pointerEvents: 'none' }}
                    />
                    {isMajor && !isSelected && (
                      <text
                        x={lx} y={ly}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={11} fontWeight={500} fill="#6B7280"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {String(m).padStart(2, '0')}
                      </text>
                    )}
                  </g>
                ))}
              </>
            )}

            {/* İbre çizgisi */}
            <line
              x1={CX} y1={CY}
              x2={handX} y2={handY}
              stroke="#2563EB" strokeWidth="2" strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
            {/* Merkez nokta */}
            <circle cx={CX} cy={CY} r="6" fill="#2563EB" style={{ pointerEvents: 'none' }} />
          </svg>
        </div>

        {/* --- Alt: İptal / Onayla --- */}
        <div className="circular-clock__footer">
          <button className="circular-clock__cancel" onClick={onClose}>İptal</button>
          <button className="circular-clock__confirm" onClick={confirm}>Onayla</button>
        </div>
      </div>
    </div>
  );
}
