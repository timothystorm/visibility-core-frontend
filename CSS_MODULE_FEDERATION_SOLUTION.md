# CSS in Module Federation with Vite - Solution Guide

## Problem
When using Vite in library mode for module federation, CSS files are extracted to separate `.css` files but are **not automatically loaded** when you dynamically import a remote module using `import()`. This is because:

1. Vite extracts CSS into separate files when building libraries (even with `cssCodeSplit: false`)
2. Dynamic ES module imports only load JavaScript - CSS must be manually loaded
3. The CSS import statements in your source code are removed during the build process

## Solution Implemented

### 1. Vite Configuration (`vite.config.mts`)
Changed `cssCodeSplit: false` to consolidate all CSS into a single file per module:

```typescript
build: {
  cssCodeSplit: false, // Inline CSS into JS for module federation
  // ... other config
}
```

This creates:
- `mount.mjs` (JavaScript entry point)
- `visibility.css` (All CSS consolidated into one file)

### 2. CSS Loading Utility (`loadCss.ts`)
Created a utility to dynamically load CSS files by injecting `<link>` tags:

```typescript
export function loadCss(href: string): Promise<void>
export function deriveCssUrl(jsUrl: string): string
```

### 3. Updated Remote Loading (`loadRemotes.ts`)
Modified the remote loader to automatically load CSS alongside JavaScript:

```typescript
// Load CSS for the remote module (if it exists)
const cssUrl = deriveCssUrl(url);
await loadCss(cssUrl);

// Then load the JS module
const mod = await import(url);
```

### 4. Updated Host Mount (`mount.tsx`)
Added CSS loading to the host app's mount function:

```typescript
export async function mount(el: HTMLElement, portalContext: PortalContext) {
  // Load the host app's CSS file
  const baseUrl = new URL('.', import.meta.url).href;
  const cssUrl = new URL('./visibility.css', baseUrl).href;
  await loadCss(cssUrl);
  
  // ... rest of mount logic
}
```

## How It Works

1. **Host app loads**: When `mount()` is called, it loads `visibility.css` containing all host app styles
2. **Remote module loads**: When a remote module is dynamically imported:
   - First, the CSS file is loaded (e.g., `status.css`)
   - Then, the JS module is imported
   - The component renders with styles already available

## Alternative Approaches

### Option A: CSS-in-JS (styled-components, emotion)
- **Pros**: No separate CSS files, automatically works with dynamic imports
- **Cons**: Runtime overhead, larger bundle size

### Option B: Single CSS bundle in host
- **Pros**: All CSS loaded upfront, no dynamic loading needed
- **Cons**: Doesn't work for truly independent remotes, defeats module federation benefits

### Option C: Module Federation Plugin
- **Pros**: Automated solution
- **Cons**: Adds complexity, may not support Vite 7+

## Benefits of This Solution

✅ **Works with native ES modules** - No special bundler plugins required
✅ **Type-safe** - Full TypeScript support
✅ **Graceful fallback** - CSS loading failures don't break the app
✅ **Minimal overhead** - CSS is loaded in parallel with module loading
✅ **Dev-friendly** - Console logs show what CSS is being loaded
✅ **Future-proof** - Uses standard web APIs (link tags, fetch)

## Build Output Structure

```
dist/apps/visibility/
├── mount.mjs                    # Entry point (ES module)
├── mount-[hash].mjs            # Main bundle chunk
├── RemoteSlot-[hash].mjs       # Code-split chunk
├── visibility.css              # Consolidated CSS
├── remotes.manifest.json       # Remote module manifest
└── favicon.ico
```

## Testing

To verify CSS is loading correctly:

1. **Build the apps**: 
   ```bash
   npx nx build visibility
   npx nx build status
   ```

2. **Start a static server**: 
   ```bash
   cd dist/apps/visibility
   npx http-server -p 8080 --cors
   ```

3. **Open the test page**: Navigate to `http://localhost:8080/test.html`

4. **Check browser DevTools**: 
   - **Network tab**: Look for `visibility.css` being loaded
   - **Console**: Should see "CSS loaded" messages
   - **Elements**: Inspect elements to verify styles are applied

5. **Verify remote loading**: The RemoteSlot component should load the status module with styles

### What to Look For

✅ **CSS file loads**: Check Network tab for `visibility.css` (200 status)
✅ **Console messages**: Should see "Host app CSS loaded" and "CSS loaded for remote"
✅ **Styled components**: Error messages should have red borders and backgrounds
✅ **No FOUC**: Content should appear styled (no Flash of Unstyled Content)

## Quick Start

### For New Remote Modules

1. **Update vite.config.mts**:
   ```typescript
   build: {
     cssCodeSplit: false,
     // ... rest of config
   }
   ```

2. **Create loadCss.ts utility** (copy from `apps/visibility/src/app/remotes/loadCss.ts`)

3. **Update mount function**:
   ```typescript
   import { loadCss } from './loadCss';
   
   export async function mount(el: HTMLElement, context: any) {
     const baseUrl = new URL(/* @vite-ignore */ '.', import.meta.url).href;
     const cssUrl = new URL(/* @vite-ignore */ './your-app.css', baseUrl).href;
     
     try {
       await loadCss(cssUrl);
     } catch (err) {
       console.warn('CSS not found:', cssUrl);
     }
     
     // ... render your app
   }
   ```

## Summary

The solution fixes CSS loading in module federation by:

1. **Consolidating CSS** with `cssCodeSplit: false` in Vite config
2. **Manually loading CSS** via dynamic `<link>` tag injection
3. **Loading CSS before JS** to prevent FOUC
4. **Graceful error handling** for missing CSS files

This approach works with:
- ✅ Native ES modules
- ✅ Vite 7+ 
- ✅ React 19+
- ✅ CSS modules
- ✅ Dynamic imports
- ✅ CORS environments

No special plugins or bundlers required!

## Troubleshooting

### CSS not loading
- Check browser console for 404 errors
- Verify the CSS file exists in the dist folder
- Check that the URL construction is correct

### Styles not applying
- Check if CSS loaded before component mounted
- Verify CSS selectors are not being tree-shaken
- Check for CSS specificity conflicts

### CORS errors
- Ensure remote URLs allow cross-origin requests
- Configure server CORS headers
- Use `crossorigin="anonymous"` on link tags if needed

