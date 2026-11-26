
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  base: '/VR-AgriExplore/',
  plugins: [mkcert()],
  server: {
    host: '0.0.0.0',
    https: true
  }
});
