import { defineConfig } from 'vitest/config';

// Common server/host setup for dev and preview
const hostSetup = {
  port: 4202,
  host: 'localhost',
  cors: true,
};

// Determine build mode: 'shared' (React externalized) or 'standalone' (React bundled)
const buildMode = (process.env.BUILD_MODE || 'shared') as 'shared' | 'standalone';

export default defineConfig({
  root: import.meta.dirname, // sets Vite project root
  cacheDir: '../../node_modules/.vite/apps/status', //path to Vite's cache directory
  server: hostSetup, // dev server options
  preview: hostSetup, // preview server options

  esbuild: {
    jsx: 'automatic', // uses the new React automatic JSX runtime. JSX is compiled to calls like jsx/jsxs instead of
    jsxImportSource: 'react', // tells the automatic runtime where to import the helper functions from (e.g., react/jsx-runtime)
  },

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
    cssCodeSplit: false, // Inline CSS into JS for module federation - CSS will be injected when the module loads
    target: 'esnext', // compilation target for output (esnext = modern browsers / native ES features).
    outDir: buildMode === 'standalone'
      ? '../../dist/apps/status-standalone'
      : '../../dist/apps/status', //output directory for the build
    emptyOutDir: true, // clear outDir before building.
    reportCompressedSize: true, // report gzipped/compressed sizes in the build output.
    commonjsOptions: {
      transformMixedEsModules: true, // allow transforming files that mix ESM and CJS so they can be bundled.
    },

    lib: {
      entry: './src/status.tsx', // library entry file
      formats: ['es'], // output formats (['es'] = ES module build).
      fileName: () => 'status.mjs', // function that determines emitted file name
    },

    rollupOptions: {
      // In 'shared' mode: externalize React (portal provides it)
      // In 'standalone' mode: bundle React into the module
      external: buildMode === 'shared'
        ? ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler']
        : [],
      output: { format: 'es' }, //final bundle format (es).
    },
  },

  test: {
    name: '@fedex/status', //test suite name
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
