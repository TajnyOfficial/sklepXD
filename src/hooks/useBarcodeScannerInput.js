/**
 * Niestandardowy Hook do globalnej obsługi sprzętowych skanerów kodów kreskowych (USB/Bluetooth).
 * 
 * Fizyczne skanery kodów funkcjonują w systemie operacyjnym jako symulatory niezwykle szybkiej klawiatury.
 * Wciskają serię klawiszy w ułamkach sekundy (< 50ms) i domyślnie zakańczają ją klawiszem "Enter".
 * 
 * Zadaniem tego hooka jest odseparowanie i zignorowanie wirtualnych naciśnięć pochodzących
 * z powolnego (naturalnego) pisania człowieka, a wyizolowanie i "złapanie" wyłącznie bardzo
 * szybkich ciągów znaków pochodzących prosto z optyki lasera sprzętowego skanera.
 * 
 * @param {Function} onScan - Wywołanie zwrotne (callback) uruchamiane z rozpoznanym kodem (string) jako parametrem
 * @param {Object} [options] - Opcje konfiguracyjne (czas tolerancji milisekund, flaga wyłączająca hook `disabled`)
 */
import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_OPTIONS = {
  minLength: 3,             // Minimalna długość kodu (filtry fałszywych wyzwoleń)
  scannerSpeedMs: 50,       // Próg prędkości [ms] — poniżej tej wartości to skaner, nie człowiek
  disabled: false,           // Wyłącz hook (np. gdy otwarty modal)
};

export function useBarcodeScannerInput(onScan, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Bufor znaków skanera i timestamp ostatniego klawisza
  const bufferRef      = useRef('');
  const lastKeyTimeRef = useRef(0);

  const handleScan = useCallback((code) => {
    if (code.length >= opts.minLength) {
      onScan?.(code);
    }
  }, [onScan, opts.minLength]);

  useEffect(() => {
    if (opts.disabled) return;

    function handleKeyDown(e) {
      const now = Date.now();
      const timeSinceLast = now - lastKeyTimeRef.current;

      if (e.key === 'Enter') {
        const buf = bufferRef.current;
        bufferRef.current = '';
        // Zatwierdź tylko jeśli Enter był następstwem szybkiego wpisywania (skaner)
        if (timeSinceLast < opts.scannerSpeedMs * 4 && buf.length > 0) {
          handleScan(buf);
        }
        return;
      }

      // Znaki jednobajtowe — buduj bufor
      if (e.key.length === 1) {
        // Przerwa między klawiszami > próg → to użytkownik, nie skaner → resetuj bufor
        if (timeSinceLast > opts.scannerSpeedMs * 2) {
          bufferRef.current = '';
        }
        bufferRef.current += e.key;
        lastKeyTimeRef.current = now;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opts.disabled, opts.scannerSpeedMs, handleScan]);
}
