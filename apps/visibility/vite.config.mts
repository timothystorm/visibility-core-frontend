import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const hostSetup = {
  port: 4201,
  host: 'localhost',
};
export default defineConfig({
  root: import.meta.dirname, // sets Vite project root
  cacheDir: '../../node_modules/.vite/apps/visibility', //path to Vite's cache directory
  server: hostSetup, // dev server options
  preview: hostSetup, // preview server options
  plugins: [react()], // Vite plugins to use; react() enables JSX transform, Fast Refresh/HMR and React-specific optimizations

  define: {
    // compile-time replacements injected into the bundle (e.g., process.env.NODE_ENV)
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
    process: '{}',
  },

  resolve: {
    // ensures these packages (React and related runtimes) are deduplicated so only one copy is resolved/imported, avoiding duplicate-React issues.
    dedupe: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'scheduler'],
  },

  build: {
    target: 'esnext', // compilation target for output (esnext = modern browsers / native ES features).
    outDir: '../../dist/apps/visibility', //output directory for the build
    emptyOutDir: true, // clear outDir before building.
    reportCompressedSize: true, // report gzipped/compressed sizes in the build output.
    commonjsOptions: {
      transformMixedEsModules: true, // allow transforming files that mix ESM and CJS so they can be bundled.
    },

    lib: {
      entry: './src/app/mount.tsx', // library entry file
      formats: ['es'], // output formats (['es'] = ES module build).
      fileName: () => 'mount.mjs', // function that determines emitted file name
    },

    rollupOptions: {
      //List of modules to treat as external (won't be bundled): React and related runtimes.
      external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'scheduler'],
      output: { format: 'es' }, //final bundle format (es).
    },
  },

  test: {
    name: '@fedex/visibility', //test suite name
    watch: false, // enable/disables watch mode
    globals: true, // injects Vitest globals (like describe, it) into globals.
    environment: 'jsdom', // simulates a browser DOM for tests.
    include: ['{src,tests}/**/*.{test,spec}.{js,ts,jsx,tsx}'], // which files to run
    reporters: ['default', 'dot'], // est reporters to use (['default'])
    coverage: {
      reportsDirectory: './test-output/vitest/coverage', // where coverage reports are written
      provider: 'v8', // coverage engine to use (v8 uses Node's built-in V8 coverage).
    },
  },
});
