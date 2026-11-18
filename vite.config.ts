import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // HTTPS on the LAN: the Screen Wake Lock API only works in a secure context
  plugins: [react(), tailwindcss(), basicSsl()],
  server: { host: true },
});
