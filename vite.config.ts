import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Relative base so the same build works at
// https://<owner>.github.io/build-by-piece/ and at any custom domain.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
