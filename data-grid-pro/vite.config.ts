/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

const entries = {
  index: resolve(__dirname, 'src/index.ts'),
  'sticky-table/index': resolve(__dirname, 'src/sticky-table/index.ts'),
  'expandable-table/index': resolve(__dirname, 'src/expandable-table/index.ts'),
  'column-visibility-table/index': resolve(__dirname, 'src/column-visibility-table/index.ts'),
  'filterable-table/index': resolve(__dirname, 'src/filterable-table/index.ts'),
  'editable-table/index': resolve(__dirname, 'src/editable-table/index.ts'),
  'grouped-table/index': resolve(__dirname, 'src/grouped-table/index.ts'),
  'context-menu-table/index': resolve(__dirname, 'src/context-menu-table/index.ts'),
  'infinite-table/index': resolve(__dirname, 'src/infinite-table/index.ts'),
  'calculated-table/index': resolve(__dirname, 'src/calculated-table/index.ts'),
  'header-filter-table/index': resolve(__dirname, 'src/header-filter-table/index.ts'),
  'tree-table/index': resolve(__dirname, 'src/tree-table/index.ts'),
  'advanced-filter-table/index': resolve(__dirname, 'src/advanced-filter-table/index.ts'),
  'common/index': resolve(__dirname, 'src/common/index.ts')
};

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts']
  },
  build: {
    lib: {
      entry: entries,
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            // Primary bundle CSS becomes styles.css; others keep hashed/named assets
            if (assetInfo.name === 'style.css' || assetInfo.name === 'index.css') {
              return 'styles.css';
            }
            return 'assets/[name][extname]';
          }
          return assetInfo.name || 'assets/[name][extname]';
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild',
    // Keep a single styles.css matching package.json "./styles.css" export
    cssCodeSplit: false
  },
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'tests/**'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false
    })
  ]
});
