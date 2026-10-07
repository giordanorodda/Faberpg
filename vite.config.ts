import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        bottega: resolve(import.meta.dirname, 'bottega.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
