/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    sourcemap: true,
    // The app route is held to 350 KiB by scripts/check-bundle.mjs. The lazy
    // Three.js renderer has its own 700 KiB budget, so Vite should not warn on
    // that intentional deferred chunk.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
