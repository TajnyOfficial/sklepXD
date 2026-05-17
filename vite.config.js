import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Dla produkcyjnych buildów per-app (np. vite build --mode kiosk)
  // dev server zawsze serwuje wszystkie punkty wejścia jednocześnie
  return {
    plugins: [react(), mkcert()],

    // Aliasy ułatwiające importy w całej aplikacji
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@contexts': resolve(__dirname, 'src/contexts'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@lib': resolve(__dirname, 'src/lib'),
        '@apps': resolve(__dirname, 'src/apps'),
      },
    },

    server: {
      https: true,
      host: true, // udostępnia serwer w sieci lokalnej
      proxy: {
        '/api-proxy/mf': {
          target: 'https://wl-api.mf.gov.pl/api/search/nip',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-proxy\/mf/, '')
        }
      }
    },

    build: {
      rollupOptions: {
        input: {
          // Aplikacja główna (zarządzanie, HR, finanse, magazyn, itp.)
          main: resolve(__dirname, 'index.html'),
          // Kiosk — terminal rejestracji czasu pracy (tablet przy wejściu)
          kiosk: resolve(__dirname, 'src/apps/kiosk/index.html'),
          // Kasa POS — sprzedaż, paragony, szuflada kasowa
          pos: resolve(__dirname, 'src/apps/pos/index.html'),
          // Mobile — skaner kodów, inwentaryzacja (telefon)
          mobile: resolve(__dirname, 'src/apps/mobile/index.html'),
        },
      },
    },
  };
});
