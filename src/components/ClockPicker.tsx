// ============================================================================
// ClockPicker — Dairesel (Analog) Saat Seçici (Clock Dial)
// ============================================================================
// Koyu tema, 12 saat + 60 dakika çemberi, otomatik saat→dakika geçişi.
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';

interface ClockPickerProps {
  value: string;        // HH:mm formatında mevcut değer (24 saat)
  onChange: (time: string) => void;
  onClose: () => void;
}

/** Derece → radyan */
function toRad(deg: number): number { return (deg * Math.PI) / 180; }

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
// Renk sabitleri (koyu tema)
// ============================================================================
const CLR = {
  bg:           '#2D2F33',
  topBg:        '#252729',
  faceBg:       '#2D2F33',
  ring:         '#3D4045',
  text:         '#E8EAED',
  textDim:      '#9AA0A6',
  accent:       '#8AB4F8',
  accentBg:     '#8AB4F8',
  accentText:   '#1A1A1D',
  hand:         '#8AB4F8',
  centerDot:    '#8AB4F8',
  btnCancel:    '#3D4045',
  btnOk:        '#8AB4F8',
  btnOkText:    '#1A1A1D',
};

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

  // Auto-switch: saat seçimi tamamlanınca dakikaya geç
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const autoSwitchRef = useRef(false);

  const isPM = selectedHour24 >= 12;
  const selectedHour12 = to12h(selectedHour24);

  const SIZE = 280;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 108;
  const HAND_R = R - 24;

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
      const currentMode = modeRef.current;
      if (currentMode === 'hour') {
        const h12 = angleTo12Hour(angle);
        setSelectedHour24(to24h(h12, isPM));
        autoSwitchRef.current = true; // işaretle: saat değişti
      } else {
        setSelectedMinute(angleToMinute(angle));
      }
    };

    const handleUp = () => {
      // Saat modundaysak ve değişiklik yapıldıysa → dakikaya geç
      if (modeRef.current === 'hour' && autoSwitchRef.current) {
        autoSwitchRef.current = false;
        setMode('minute');
      }
      document.removeEventListener('mousemove', handlePointer);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handlePointer);
      document.removeEventListener('touchend', handleUp);
    };

    const handleDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      autoSwitchRef.current = false;
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
  }, [isPM, CX, CY]);

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
    const rStart = isMajor ? R - 14 : R - 6;
    const rEnd = R;
    const x1 = CX + rStart * Math.cos(rad);
    const y1 = CY + rStart * Math.sin(rad);
    const x2 = CX + rEnd * Math.cos(rad);
    const y2 = CY + rEnd * Math.sin(rad);
    const lr = R - 24;
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
            <div className="circular-clock__time-digits">
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
              >AM</button>
              <button
                className={`circular-clock__ampm-btn${isPM ? ' active' : ''}`}
                onClick={() => setSelectedHour24(to24h(selectedHour12, true))}
              >PM</button>
            </div>
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
            {/* Halka arkaplanı */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={CLR.ring} strokeWidth="28" />

            {mode === 'hour' ? (
              /* ---- SAAT MODU: 12 rakam ---- */
              <>
                {hourMarkers.map(({ label, tx, ty, isSelected }) => (
                  <g key={`h-${label}`}>
                    {isSelected && (
                      <circle cx={tx} cy={ty} r="20" fill={CLR.accentBg} />
                    )}
                    <text
                      x={tx} y={ty}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={18}
                      fontWeight={isSelected ? 600 : 400}
                      fill={isSelected ? CLR.accentText : CLR.textDim}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {label}
                    </text>
                  </g>
                ))}
              </>
            ) : (
              /* ---- DAKİKA MODU: 60 çizgi ---- */
              <>
                {minuteMarkers.map(({ m, x1, y1, x2, y2, lx, ly, isMajor, isSelected }) => (
                  <g key={`m-${m}`}>
                    {isSelected && (
                      <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="20" fill={CLR.accentBg} />
                    )}
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isSelected ? CLR.accentText : isMajor ? CLR.textDim : '#555960'}
                      strokeWidth={isSelected ? 3 : isMajor ? 2 : 1}
                      strokeLinecap="round"
                      style={{ pointerEvents: 'none' }}
                    />
                    {isMajor && !isSelected && (
                      <text
                        x={lx} y={ly}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={11} fontWeight={500} fill={CLR.textDim}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {String(m).padStart(2, '0')}
                      </text>
                    )}
                  </g>
                ))}
              </>
            )}

            {/* İbre */}
            <line
              x1={CX} y1={CY}
              x2={handX} y2={handY}
              stroke={CLR.hand} strokeWidth="2" strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
            {/* Merkez nokta */}
            <circle cx={CX} cy={CY} r="5" fill={CLR.centerDot} style={{ pointerEvents: 'none' }} />
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
