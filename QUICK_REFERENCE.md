# @fedex/ui - Quick Reference Card

## Import

```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';
```

## API

### loadCss(href: string): Promise<void>

Load a CSS file dynamically.

```typescript
await loadCss('https://example.com/styles.css');
```

### deriveCssUrl(jsUrl: string, options?: { removeHash?: boolean }): string

Convert JS URL to CSS URL.

```typescript
// Basic usage (preserves hash if present)
const cssUrl = deriveCssUrl('http://localhost:4200/mount.mjs');
// Returns: "http://localhost:4200/mount.css"

// Production with hash preserved
const cssUrl = deriveCssUrl('http://cdn.example.com/visibility-abc123.mjs');
// Returns: "http://cdn.example.com/visibility-abc123.css"

// Production with hash removed
const cssUrl = deriveCssUrl('http://cdn.example.com/visibility-abc123.mjs', { removeHash: true });
// Returns: "http://cdn.example.com/visibility.css"
```

## Common Patterns

### Load CSS in mount function

```typescript
export async function mount(el: HTMLElement, context: any) {
  // Load CSS first
  const cssUrl = new URL(/* @vite-ignore */ './app.css', import.meta.url).href;
  await loadCss(cssUrl).catch(console.warn);
  
  // Then render
  const root = createRoot(el);
  root.render(<App />);
}
```

### Load remote module with CSS

```typescript
export async function loadRemote(url: string) {
  // Load CSS
  const cssUrl = deriveCssUrl(url);
  await loadCss(cssUrl).catch(console.warn);
  
  // Load JS
  const mod = await import(/* @vite-ignore */ url);
  return mod;
}
```

## Vite Config

```typescript
export default defineConfig({
  build: {
    cssCodeSplit: false,  // ← Required!
    lib: {
      entry: './src/mount.tsx',
      formats: ['es'],
      fileName: 'mount',
    },
  },
});
```

## Commands

```bash
# Build the library
npx nx build ui

# Test the library
npx nx test ui

# Use in your app
import { loadCss } from '@fedex/ui';
```

## Features

✅ Prevents duplicate loading
✅ Async/await support
✅ Graceful error handling
✅ Handles query params & fragments
✅ Works with relative URLs
✅ TypeScript support
✅ 100% test coverage
✅ Production hash support

## Production Deployments

### Strategy 1: No hashing (default, recommended)
```typescript
// Build config: fileName: () => 'visibility.mjs'
// Files: visibility.mjs, visibility.css
loadCss(deriveCssUrl(import.meta.url));
```

### Strategy 2: Hash both JS and CSS
```typescript
// Build config: fileName: () => 'visibility-[hash].mjs', assetFileNames: 'visibility-[hash].[ext]'
// Files: visibility-abc123.mjs, visibility-abc123.css
loadCss(deriveCssUrl(import.meta.url));
```

### Strategy 3: Hash JS only
```typescript
// Build config: fileName: () => 'visibility-[hash].mjs', assetFileNames: 'visibility.[ext]'
// Files: visibility-abc123.mjs, visibility.css
loadCss(deriveCssUrl(import.meta.url, { removeHash: true }));
```

See [PRODUCTION_CSS_LOADING.md](PRODUCTION_CSS_LOADING.md) for complete deployment guide.

## Need Help?

- **Production deployments:** `PRODUCTION_CSS_LOADING.md`
- **API docs:** `packages/ui/README.md`
- **Architecture:** `ARCHITECTURE.md`
- **Implementation guide:** `SHARED_UI_LIBRARY.md`
- **Checklist:** `IMPLEMENTATION_CHECKLIST.md`

