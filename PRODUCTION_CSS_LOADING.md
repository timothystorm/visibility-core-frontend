# Production CSS Loading for Module Federation

## Overview

When deploying federated modules to production, you need to ensure CSS files are loaded correctly alongside your JavaScript modules. This guide explains how to configure CSS loading based on your build and deployment strategy.

## Current Build Output

With the current vite configuration:

```
dist/apps/visibility/
├── visibility.mjs              # Entry point (no hash)
├── visibility-CDlpkoyC.mjs     # Lazy-loaded chunk (hashed)
├── RemoteSlot-qbRDAfYb.mjs     # Lazy-loaded chunk (hashed)
└── visibility.css              # CSS file (no hash)
```

## CSS Loading Strategies

### Strategy 1: No Hashing (Current - Recommended)

**When to use:** Simple deployments, CDN with version path (e.g., `/v1.2.3/visibility.mjs`)

**Build Configuration:**
```typescript
// vite.config.mts
build: {
  cssCodeSplit: false,
  lib: {
    fileName: () => 'visibility.mjs',  // Hardcoded filename
  }
}
```

**Loading Code:**
```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, portalContext: PortalContext) {
  // Default behavior preserves the filename structure
  loadCss(deriveCssUrl(import.meta.url)).catch(console.error);
  
  // This works because:
  // - import.meta.url = "https://cdn.example.com/v1.2.3/visibility.mjs"
  // - deriveCssUrl()   = "https://cdn.example.com/v1.2.3/visibility.css"
  
  // ... rest of mount logic
}
```

**Manifest File:**
```json
{
  "remotes": {
    "visibility": {
      "current": "https://cdn.example.com/v1.2.3/visibility.mjs"
    }
  }
}
```

**Pros:**
- Simple and predictable
- Easy to debug
- Version controlled via path

**Cons:**
- Requires path-based versioning
- No automatic cache invalidation

---

### Strategy 2: Content Hash on Both JS and CSS

**When to use:** CDN with aggressive caching, content-based cache invalidation

**Build Configuration:**
```typescript
// vite.config.mts
build: {
  cssCodeSplit: false,
  lib: {
    fileName: (format) => `visibility-[hash].${format === 'es' ? 'mjs' : 'js'}`,
  },
  rollupOptions: {
    output: {
      assetFileNames: 'visibility-[hash].[ext]',  // Hash CSS files too
    }
  }
}
```

**Build Output:**
```
dist/apps/visibility/
├── visibility-abc123.mjs       # Entry point (hashed)
└── visibility-abc123.css       # CSS file (same hash)
```

**Loading Code:**
```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, portalContext: PortalContext) {
  // Default behavior preserves hash
  loadCss(deriveCssUrl(import.meta.url)).catch(console.error);
  
  // This works because:
  // - import.meta.url = "https://cdn.example.com/visibility-abc123.mjs"
  // - deriveCssUrl()   = "https://cdn.example.com/visibility-abc123.css"
  
  // ... rest of mount logic
}
```

**Manifest Update Process:**
After building, you need to update the manifest with the hashed filename:
```json
{
  "remotes": {
    "visibility": {
      "current": "https://cdn.example.com/visibility-abc123.mjs"
    }
  }
}
```

**Pros:**
- Automatic cache invalidation
- Long cache TTLs possible
- Perfect for CDN with caching

**Cons:**
- Manifest must be updated after each build
- More complex deployment process

---

### Strategy 3: Hash JS Only, Not CSS

**When to use:** When you want hashed JS but simpler CSS deployment

**Build Configuration:**
```typescript
// vite.config.mts
build: {
  cssCodeSplit: false,
  lib: {
    fileName: (format) => `visibility-[hash].${format === 'es' ? 'mjs' : 'js'}`,
  },
  rollupOptions: {
    output: {
      assetFileNames: 'visibility.[ext]',  // No hash for CSS
    }
  }
}
```

**Build Output:**
```
dist/apps/visibility/
├── visibility-abc123.mjs       # Entry point (hashed)
└── visibility.css              # CSS file (no hash)
```

**Loading Code:**
```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, portalContext: PortalContext) {
  // Use removeHash option to strip the hash
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.error);
  
  // This works because:
  // - import.meta.url = "https://cdn.example.com/visibility-abc123.mjs"
  // - deriveCssUrl()   = "https://cdn.example.com/visibility.css"  (hash removed)
  
  // ... rest of mount logic
}
```

**Manifest File:**
```json
{
  "remotes": {
    "visibility": {
      "current": "https://cdn.example.com/visibility-abc123.mjs"
    }
  }
}
```

**Pros:**
- Cache invalidation for JS
- Simpler CSS deployment
- No need to track CSS hashes

**Cons:**
- CSS cache invalidation via version header or query param
- Two different caching strategies

---

## Deployment Considerations

### CDN Configuration

For Strategy 1 (No Hashing):
```
Cache-Control: public, max-age=300
Versioning: Via URL path (/v1.2.3/visibility.mjs)
```

For Strategy 2 (Both Hashed):
```
Cache-Control: public, max-age=31536000, immutable
Versioning: Via content hash in filename
```

For Strategy 3 (JS Hashed, CSS Not):
```
JS:  Cache-Control: public, max-age=31536000, immutable
CSS: Cache-Control: public, max-age=3600
```

### Manifest Management

The manifest file (`remotes.manifest.json`) should be:
1. **Never cached** - Always fetched fresh
2. **Updated atomically** - Deploy new manifest after assets are deployed
3. **Versioned separately** - Or use short TTL (5 minutes)

### Build & Deploy Pipeline

```bash
#!/bin/bash

# 1. Build the app
npx nx build visibility

# 2. Extract filenames if using hashing
VISIBILITY_JS=$(ls dist/apps/visibility/visibility*.mjs | head -1 | xargs basename)
VISIBILITY_CSS=$(ls dist/apps/visibility/visibility*.css | head -1 | xargs basename)

# 3. Upload assets to CDN
aws s3 cp dist/apps/visibility/ s3://cdn-bucket/visibility/ --recursive

# 4. Update manifest with new URLs
cat > dist/apps/visibility/remotes.manifest.json <<EOF
{
  "remotes": {
    "visibility": {
      "current": "https://cdn.example.com/visibility/${VISIBILITY_JS}"
    }
  }
}
EOF

# 5. Upload manifest (no caching)
aws s3 cp dist/apps/visibility/remotes.manifest.json s3://cdn-bucket/remotes.manifest.json \
  --cache-control "no-cache, no-store, must-revalidate"
```

## Recommendation

For most production deployments, **Strategy 1 (No Hashing)** is recommended because:

✅ Simple and predictable
✅ Easy to debug in production
✅ Works well with version-based paths
✅ No complex build or deployment scripts
✅ Manifest updates are straightforward

Use **Strategy 2** (both hashed) only if:
- You have sophisticated deployment automation
- You need maximum caching efficiency
- You can handle manifest updates programmatically

Use **Strategy 3** (JS hashed, CSS not) if:
- You want some benefits of hashing without full complexity
- CSS changes less frequently than JS
- You have a hybrid caching strategy

## Current Implementation

The `@fedex/ui` package supports all three strategies:

```typescript
// Strategy 1 & 2: Default (preserves hash if present)
loadCss(deriveCssUrl(import.meta.url));

// Strategy 3: Remove hash
loadCss(deriveCssUrl(import.meta.url, { removeHash: true }));
```

Choose the strategy that best fits your deployment infrastructure and caching requirements.

