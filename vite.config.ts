import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        bottega: resolve(import.meta.dirname, 'bottega.html'),
        stile: resolve(import.meta.dirname, 'stile.html'),
        bottegaCartoon: resolve(import.meta.dirname, 'bottega-cartoon.html'),
        casa: resolve(import.meta.dirname, 'casa.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
