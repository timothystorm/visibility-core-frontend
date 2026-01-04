# @fedex/ui

Shared UI utilities for module federation applications.

## Features

- **CSS Loading Utilities**: Dynamically load CSS files for federated modules

## Installation

This package is part of the monorepo and is imported using the `@fedex/ui` alias.

```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';
```

## API

### `loadCss(href: string): Promise<void>`

Dynamically loads a CSS file by creating a `<link>` tag and appending it to the document head.

**Features:**
- Prevents duplicate loading (checks if CSS already loaded)
- Returns a Promise for async/await support
- Handles loading errors gracefully

**Example:**
```typescript
import { loadCss } from '@fedex/ui';

try {
  await loadCss('https://example.com/styles.css');
  console.log('CSS loaded successfully');
} catch (error) {
  console.error('Failed to load CSS:', error);
}
```

### `deriveCssUrl(jsUrl: string, options?: { removeHash?: boolean }): string`

Derives the CSS filename from a JS module URL by replacing the extension.

**Features:**
- Handles absolute URLs with query parameters and hash fragments
- Handles relative URLs
- Converts `.mjs` or `.js` extensions to `.css`
- Optionally removes content hashes from filenames

**Parameters:**
- `jsUrl` - The URL of the JS module
- `options.removeHash` - If `true`, removes the hash from the filename (e.g., `"mount-abc123.mjs"` → `"mount.css"`)

**Example:**
```typescript
import { deriveCssUrl } from '@fedex/ui';

// Basic usage (preserves hash)
const cssUrl = deriveCssUrl('http://localhost:4200/mount.mjs');
// Returns: "http://localhost:4200/mount.css"

// With content hash preserved (default)
const cssUrl = deriveCssUrl('http://example.com/visibility-abc123.mjs');
// Returns: "http://example.com/visibility-abc123.css"

// With content hash removed
const cssUrl = deriveCssUrl('http://example.com/visibility-abc123.mjs', { removeHash: true });
// Returns: "http://example.com/visibility.css"

// With query parameters
const cssUrlWithQuery = deriveCssUrl('http://localhost:4200/mount.mjs?v=123');
// Returns: "http://localhost:4200/mount.css?v=123"
```

**Production Usage:**

In production, your build process may hash JS filenames (e.g., `visibility-abc123.mjs`). Choose the appropriate approach:

1. **Same hash for CSS and JS** (default): Both files get the same hash
   ```typescript
   // JS: visibility-abc123.mjs
   // CSS: visibility-abc123.css
   loadCss(deriveCssUrl(import.meta.url));
   ```

2. **No hash for CSS** (use `removeHash: true`): CSS files deployed without hash
   ```typescript
   // JS: visibility-abc123.mjs
   // CSS: visibility.css
   loadCss(deriveCssUrl(import.meta.url, { removeHash: true }));
   ```

## Usage in Module Federation

### Host Application

```typescript
import { loadCss } from '@fedex/ui';

export async function mount(el: HTMLElement, context: any) {
  // Load host CSS
  const baseUrl = new URL(/* @vite-ignore */ '.', import.meta.url).href;
  const cssUrl = new URL(/* @vite-ignore */ './app.css', baseUrl).href;
  
  await loadCss(cssUrl).catch(console.warn);
  
  // Render app
  // ...
}
```

### Remote Module Loader

```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function loadRemote(url: string) {
  // Load CSS for remote
  const cssUrl = deriveCssUrl(url);
  
  try {
    await loadCss(cssUrl);
    console.log('Remote CSS loaded:', cssUrl);
  } catch (err) {
    console.warn('CSS not found:', cssUrl);
  }
  
  // Load JS module
  const mod = await import(/* @vite-ignore */ url);
  return mod;
}
```

## Testing

Run tests with:
```bash
npx nx test ui
```

## Building

Build the library with:
```bash
npx nx build ui
```

## Why This Library?

In Vite-based module federation:
1. CSS is extracted to separate files in library mode
2. Dynamic `import()` only loads JavaScript, not CSS
3. CSS must be manually loaded via `<link>` tags

This library provides the utilities to solve this problem in a reusable way.

## Dependencies

- No runtime dependencies (uses standard browser APIs)
- TypeScript support included
- Works with any module federation setup

## Browser Support

Works in all modern browsers that support:
- ES Modules
- `document.createElement()`
- `Promise`
- `URL` API
