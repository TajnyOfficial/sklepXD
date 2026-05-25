/**
 * Komponent skanera kodów kreskowych (Aparat + Klawiatura).
 * Umożliwia wykorzystanie sprzętowej kamery (np. smartfona, tabletu) do ciągłego
 * nasłuchiwania w poszukiwaniu kodów kreskowych 1D/2D przy użyciu biblioteki `@zxing/browser`.
 * Wyposażony w system `Fallback` — pozwala ręcznie wpisać kod w sytuacji krytycznej (brak kamery).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

// ── Animacja linii skanera wstrzykiwana do <head> raz ──────────────────────
const SCAN_ANIMATION_CSS = `
  @keyframes scanLine {
    0%   { top: 8%; }
    50%  { top: calc(92% - 2px); }
    100% { top: 8%; }
  }
`;

function injectScanAnimation() {
  if (document.getElementById('barcode-scanner-style')) return;
  const style = document.createElement('style');
  style.id = 'barcode-scanner-style';
  style.textContent = SCAN_ANIMATION_CSS;
  document.head.appendChild(style);
}

/* Główny komponent skanera kodów kreskowych zarządzający cyklem życia strumienia wideo z kamery urządzenia */
export default function BarcodeScanner({ onConfirm, title = 'Skanuj kod kreskowy', onClose }) {
  /* Stan przechowujący aktualnie zeskanowany lub wpisany kod kreskowy */
  const [code, setCode]               = useState('');
  
  /* Stan określający rodzaj błędu podczas inicjalizacji kamery (brak uprawnień, brak kamery, itp.) */
  const [cameraError, setCameraError] = useState(null);
  
  /* Flaga informująca, czy aktualnie trwa nasłuch obrazu i dekodowanie wideo w poszukiwaniu kodu */
  const [isScanning, setIsScanning]   = useState(false);
  
  /* Flaga określająca, czy w danej sesji udało się pomyślnie zdekodować kod kreskowy */
  const [scanned, setScanned]         = useState(false);
  
  /* Stan określający czy ręczne pole do wpisywania kodu posiada aktualnie focus użytkownika */
  const [inputFocused, setInputFocused] = useState(false);

  /* Referencja do elementu <video> w DOM służąca do wyświetlania obrazu na żywo z kamery */
  const videoRef  = useRef(null);
  
  /* Referencja do dekodera zXing przetwarzającego poszczególne klatki wideo na wartości tekstowe */
  const readerRef = useRef(null);
  
  /* Referencja do aktywnego strumienia multimedialnego (MediaStream), używana do jego zamykania przy wychodzeniu z komponentu */
  const streamRef = useRef(null);

  /* Funkcja zwalniająca i wyłączająca dostęp do kamery urządzenia (czyszczenie torów MediaStream) */
  const stopCamera = useCallback(() => {
    // 1. Zatrzymaj reader (pętla dekodowania)
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch (_) {}
      readerRef.current = null;
    }
    // 2. Zatrzymaj wszystkie tory MediaStream (wideo + ewentualne audio)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // 3. Odłącz strumień od elementu <video>
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  /* Funkcja asynchroniczna inicjująca dostęp do fizycznego aparatu oraz pętlę ciągłego skanowania w zXing */
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanned(false);
    setCode('');

    try {
      // Preferujemy tylną kamerę — kluczowe dla urządzeń mobilnych
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // tylna kamera
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Safari czasami wymaga ręcznego wywołania play() pomimo autoPlay
        videoRef.current.play().catch(e => console.warn('[BarcodeScanner] Autoplay zablokowany:', e));
      }

      setIsScanning(true);

      // Utwórz reader i uruchom ciągłe skanowanie w pętli
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      reader.decodeFromVideoElement(videoRef.current, (result, err) => {
        if (result) {
          // Odczytano kod — zatrzymaj kamerę, zapisz wartość
          const text = result.getText();
          setCode(text);
          setScanned(true);
          stopCamera();
        }
        // NotFoundException = brak kodu w kadrze, to normalny stan — ignorujemy
        if (err && !(err instanceof NotFoundException)) {
          console.warn('[BarcodeScanner] Błąd dekodera:', err.message);
        }
      }).catch(err => {
        // reset() odrzuca promise — to oczekiwane, nie traktujemy jako błąd
        if (!err?.message?.includes('reset') && !err?.message?.includes('Video')) {
          console.warn('[BarcodeScanner] Decoder zakończony:', err.message);
        }
      });

    } catch (err) {
      console.error('[BarcodeScanner] Błąd dostępu do kamery:', err.name, err.message);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('permission');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('not_found');
      } else if (err.name === 'NotReadableError') {
        setCameraError('in_use');
      } else {
        setCameraError('unknown');
      }
    }
  }, [stopCamera]);

  // ── Lifecycle: uruchom przy montowaniu, posprzątaj przy odmontowaniu ─────
  useEffect(() => {
    injectScanAnimation();

    // ── Polyfill i przygotowanie API dla Safari / starszych przeglądarek ──────
    const prepareMediaDevices = () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices === undefined) {
          // @ts-ignore
          navigator.mediaDevices = {};
        }

        if (typeof navigator !== 'undefined' && navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
          const legacyGetUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
          
          if (legacyGetUserMedia) {
            navigator.mediaDevices.getUserMedia = (constraints) => {
              return new Promise((resolve, reject) => {
                legacyGetUserMedia.call(navigator, constraints, resolve, reject);
              });
            };
          }
        }

        // Trick dla Safari: wywołanie enumerateDevices() czasem pomaga "obudzić" mediaDevices
        if (navigator.mediaDevices?.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices().catch(() => {});
        }
      } catch (e) {
        console.warn('[BarcodeScanner] Błąd podczas przygotowania mediaDevices:', e);
      }
    };

    prepareMediaDevices();

    // Sprawdzamy wsparcie, ale dajemy szansę startCamera() na rzucenie konkretnego błędu
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('not_supported');
    } else {
      startCamera();
    }

    // Cleanup — wywoływany przez React przy odmontowaniu komponentu
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  /* Funkcja obsługująca zmianę wartości w ręcznym polu wprowadzenia kodu EAN */
  function handleManualInput(e) {
    setCode(e.target.value);
    if (scanned) setScanned(false);
  }

  /* Funkcja resetująca stan udanego skanowania i uruchamiająca kamerę na nowo */
  function handleReset() {
    startCamera();
  }

  /* Funkcja zatwierdzająca zeskanowany lub wpisany kod, wyzwalająca przekazany callback onConfirm */
  function handleConfirm() {
    const trimmed = code.trim();
    if (!trimmed) return;
    onConfirm?.(trimmed);
  }

  // ── Obsługa Enter w polu tekstowym ───────────────────────────────────────
  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && code.trim()) handleConfirm();
  }

  // ── Komunikaty błędów ─────────────────────────────────────────────────────
  const ERROR_CONFIG = {
    permission:    { icon: '🚫', msg: 'Brak dostępu do kamery. Zezwól na dostęp w ustawieniach przeglądarki lub wpisz kod ręcznie.' },
    not_found:     { icon: '📷', msg: 'Nie znaleziono kamery. Upewnij się, że urządzenie ma podłączoną kamerę.' },
    in_use:        { icon: '⚠️', msg: 'Kamera jest używana przez inną aplikację.' },
    not_supported: { 
      icon: '🌐', 
      msg: window.isSecureContext 
        ? 'Twoja przeglądarka nie obsługuje dostępu do kamery. Użyj aktualnej wersji Chrome lub Safari.' 
        : 'Safari wymaga połączenia HTTPS (lub localhost) do działania kamery. Na połączeniach HTTP (np. przez adres IP) dostęp jest blokowany.' 
    },
    unknown:       { icon: '❌', msg: 'Nie można uruchomić kamery. Sprawdź ustawienia i spróbuj ponownie.' },
  };

  const errorInfo = cameraError ? ERROR_CONFIG[cameraError] : null;
  const hasCode   = code.trim().length > 0;

  // ── Style ─────────────────────────────────────────────────────────────────
  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    },
    container: {
      width: '100%', maxWidth: 440,
      background: '#0f172a',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f8fafc',
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid #1e293b',
    },
    videoWrap: {
      position: 'relative',
      width: '100%', aspectRatio: '4/3',
      background: '#020617',
      overflow: 'hidden',
    },
    video: {
      width: '100%', height: '100%',
      objectFit: 'cover', display: 'block',
      opacity: scanned ? 0.25 : 1,
      transition: 'opacity 0.4s',
    },
    frame: {
      position: 'absolute',
      top: '20%', left: '15%', right: '15%', bottom: '20%',
      border: '2px solid #6366f1',
      borderRadius: 10,
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
    },
    scanLine: {
      position: 'absolute',
      left: 0, right: 0, height: 2,
      background: 'linear-gradient(90deg, transparent 0%, #6366f1 50%, transparent 100%)',
      animation: 'scanLine 2s ease-in-out infinite',
    },
    successOverlay: {
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.7)',
      gap: 8,
    },
    errorBox: {
      margin: '12px 20px 0',
      padding: 14,
      background: '#1c1917',
      border: '1px solid #f59e0b',
      borderRadius: 12,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    },
    body: { padding: 20 },
    label: {
      display: 'block', fontSize: '0.7rem',
      color: '#64748b', letterSpacing: '0.06em',
      textTransform: 'uppercase', marginBottom: 6,
    },
    input: {
      width: '100%', padding: '11px 14px',
      background: '#1e293b',
      border: `1.5px solid ${inputFocused ? '#6366f1' : '#334155'}`,
      borderRadius: 10, color: '#f8fafc',
      fontSize: '1.05rem', letterSpacing: '0.05em',
      outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    },
    btnConfirm: {
      width: '100%', padding: '13px',
      marginTop: 12,
      background: hasCode
        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        : '#1e293b',
      border: hasCode ? 'none' : '1.5px solid #334155',
      borderRadius: 12,
      color: hasCode ? '#fff' : '#475569',
      fontSize: '0.95rem', fontWeight: 700,
      cursor: hasCode ? 'pointer' : 'not-allowed',
      transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    btnReset: {
      width: '100%', marginTop: 8,
      background: 'none', border: 'none',
      color: '#6366f1', fontSize: '0.8rem',
      cursor: 'pointer', padding: '4px 0',
      textDecoration: 'underline',
    },
    divider: {
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '14px 0 10px', color: '#475569', fontSize: '0.75rem',
    },
    divLine: { flex: 1, height: 1, background: '#1e293b' },
    statusRow: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 20px',
      fontSize: '0.72rem',
      color: scanned ? '#4ade80' : isScanning ? '#94a3b8' : '#64748b',
      borderTop: '1px solid #1e293b',
      transition: 'color 0.3s',
    },
    statusDot: {
      width: 7, height: 7, borderRadius: '50%',
      background: scanned ? '#4ade80' : isScanning ? '#6366f1' : '#334155',
      boxShadow: isScanning && !scanned ? '0 0 6px #6366f1' : 'none',
      transition: 'background 0.3s, box-shadow 0.3s',
    },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.container} onClick={e => e.stopPropagation()}>

        {/* Nagłówek */}
        <div style={s.header}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</span>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Podgląd kamery — ukrywamy przy błędzie */}
        {!cameraError && (
          <div style={s.videoWrap}>
            <video
              ref={videoRef}
              style={s.video}
              autoPlay
              playsInline   /* niezbędne na iOS — bez tego wideo nie autoPlay */
              muted         /* wymagane przez Chrome do autoPlay */
            />

            {/* Ramka skanera + animowana linia */}
            {isScanning && !scanned && (
              <div style={s.frame}>
                <div style={s.scanLine} />
              </div>
            )}

            {/* Overlay sukcesu */}
            {scanned && (
              <div style={s.successOverlay}>
                <span style={{ fontSize: '2.5rem' }}>✅</span>
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.9rem' }}>Kod odczytany!</span>
              </div>
            )}
          </div>
        )}

        {/* Komunikat błędu */}
        {errorInfo && (
          <div style={s.errorBox}>
            <span style={{ fontSize: '1.4rem' }}>{errorInfo.icon}</span>
            <p style={{ color: '#f59e0b', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              {errorInfo.msg}
            </p>
          </div>
        )}

        {/* Pasek statusu */}
        <div style={s.statusRow}>
          <div style={s.statusDot} />
          {scanned
            ? `Odczytano: ${code}`
            : isScanning
            ? 'Skaner aktywny — skieruj kamerę na kod kreskowy'
            : cameraError
            ? 'Kamera niedostępna — użyj pola poniżej'
            : 'Inicjalizacja...'}
        </div>

        {/* Sekcja ręczna */}
        <div style={s.body}>
          <div style={s.divider}>
            <div style={s.divLine} />
            <span>lub wpisz ręcznie</span>
            <div style={s.divLine} />
          </div>

          <label style={s.label} htmlFor="bs-manual-input">
            Kod kreskowy / EAN / QR
          </label>
          <input
            id="bs-manual-input"
            type="text"
            inputMode="numeric"
            style={s.input}
            value={code}
            onChange={handleManualInput}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={handleInputKeyDown}
            placeholder="np. 5901234567890"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Przycisk zatwierdź */}
          <button style={s.btnConfirm} disabled={!hasCode} onClick={handleConfirm}>
            {hasCode
              ? <><span>✓</span><span>Zatwierdź kod</span></>
              : <span>Zatwierdź</span>
            }
          </button>

          {/* Resetuj po odczycie */}
          {scanned && (
            <button style={s.btnReset} onClick={handleReset}>
              ↩ Skanuj inny kod
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
