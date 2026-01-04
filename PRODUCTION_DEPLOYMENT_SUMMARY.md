# Production Deployment - Quick Decision Guide

## Question: How should I handle CSS file hashing in production?

**TL;DR:** Use **Strategy 1** (no hashing) unless you have specific caching requirements.

---

## Three Strategies at a Glance

| Strategy | JS Filename | CSS Filename | Use Case | Code Change |
|----------|-------------|--------------|----------|-------------|
| **1. No Hash** | `visibility.mjs` | `visibility.css` | Simple deployments, version paths | None (default) |
| **2. Hash Both** | `visibility-abc123.mjs` | `visibility-abc123.css` | Aggressive CDN caching | None (default) |
| **3. Hash JS Only** | `visibility-abc123.mjs` | `visibility.css` | Hybrid caching strategy | Add `{ removeHash: true }` |

---

## Strategy 1: No Hashing (Recommended)

### When to Use
- ✅ Simple deployments
- ✅ Version managed via URL path (e.g., `/v1.2.3/`)
- ✅ Want predictable filenames
- ✅ Easy debugging

### Vite Config
```typescript
build: {
  cssCodeSplit: false,
  lib: {
    fileName: () => 'visibility.mjs',  // Hardcoded, no hash
  }
}
```

### Loading Code
```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, portalContext: PortalContext) {
  // Default behavior - no changes needed
  loadCss(deriveCssUrl(import.meta.url)).catch(console.error);
  // ... rest of mount logic
}
```

### Deployment
```bash
# Build
npx nx build visibility

# Files created:
# - dist/apps/visibility/visibility.mjs
# - dist/apps/visibility/visibility.css

# Deploy to versioned path
aws s3 cp dist/apps/visibility/ s3://cdn-bucket/v1.2.3/ --recursive
```

### Manifest
```json
{
  "remotes": {
    "visibility": {
      "current": "https://cdn.example.com/v1.2.3/visibility.mjs"
    }
  }
}
```

### Pros & Cons
✅ Simple and predictable  
✅ Easy to debug  
✅ Version controlled via path  
❌ Requires path-based versioning  
❌ No automatic cache invalidation  

---

## Strategy 2: Hash Both JS and CSS

### When to Use
- ✅ Maximum caching efficiency
- ✅ Content-based cache invalidation
- ✅ Have automated deployment
- ✅ Long CDN cache TTLs

### Vite Config
```typescript
build: {
  cssCodeSplit: false,
  lib: {
    fileName: () => 'visibility-[hash].mjs',
  },
  rollupOptions: {
    output: {
      assetFileNames: 'visibility-[hash].[ext]',  // CSS gets same hash
    }
  }
}
```

### Loading Code
```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, portalContext: PortalContext) {
  // Default behavior - preserves hash automatically
  loadCss(deriveCssUrl(import.meta.url)).catch(console.error);
  // ... rest of mount logic
}
```

### Deployment
```bash
# Build
npx nx build visibility

# Files created:
# - dist/apps/visibility/visibility-abc123.mjs
# - dist/apps/visibility/visibility-abc123.css

# Extract hashed filename
VISIBILITY_JS=$(ls dist/apps/visibility/visibility*.mjs | xargs basename)

# Deploy assets
aws s3 cp dist/apps/visibility/ s3://cdn-bucket/visibility/ --recursive \
  --cache-control "public, max-age=31536000, immutable"

# Update manifest with hashed filename
cat > remotes.manifest.json <<EOF
{
  "remotes": {
    "visibility": {
      "current": "https://cdn.example.com/visibility/${VISIBILITY_JS}"
    }
  }
}
EOF

# Deploy manifest (no caching)
aws s3 cp remotes.manifest.json s3://cdn-bucket/remotes.manifest.json \
  --cache-control "no-cache, no-store, must-revalidate"
```

### Pros & Cons
✅ Automatic cache invalidation  
✅ Long cache TTLs  
✅ Perfect for CDN  
❌ Manifest must be updated after build  
❌ More complex deployment  

---

## Strategy 3: Hash JS Only

### When to Use
- ✅ Want JS caching benefits
- ✅ Simpler CSS deployment
- ✅ CSS changes less frequently
- ✅ Hybrid caching strategy

### Vite Config
```typescript
build: {
  cssCodeSplit: false,
  lib: {
    fileName: () => 'visibility-[hash].mjs',
  },
  rollupOptions: {
    output: {
      assetFileNames: 'visibility.[ext]',  // No hash for CSS
    }
  }
}
```

### Loading Code
```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, portalContext: PortalContext) {
  // Add removeHash option to strip hash from JS filename
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.error);
  // ... rest of mount logic
}
```

### Deployment
```bash
# Build
npx nx build visibility

# Files created:
# - dist/apps/visibility/visibility-abc123.mjs (hashed)
# - dist/apps/visibility/visibility.css (not hashed)

# Deploy with different cache policies
aws s3 cp dist/apps/visibility/*.mjs s3://cdn-bucket/visibility/ \
  --cache-control "public, max-age=31536000, immutable"

aws s3 cp dist/apps/visibility/*.css s3://cdn-bucket/visibility/ \
  --cache-control "public, max-age=3600"
```

### Pros & Cons
✅ Cache invalidation for JS  
✅ Simpler CSS deployment  
✅ No need to track CSS hashes  
❌ Two different caching strategies  
❌ CSS cache invalidation requires version header  

---

## Decision Tree

```
Do you have sophisticated deployment automation?
├─ NO → Use Strategy 1 (No Hashing)
└─ YES → Do you need maximum CDN caching efficiency?
    ├─ NO → Use Strategy 1 (No Hashing)
    └─ YES → Do you want to manage CSS separately?
        ├─ NO → Use Strategy 2 (Hash Both)
        └─ YES → Use Strategy 3 (Hash JS Only)
```

---

## Recommendation

**Start with Strategy 1** because:
1. It works immediately with no code changes
2. It's easy to debug in production
3. It's simple to deploy
4. You can always upgrade later

**Upgrade to Strategy 2** when:
1. You have automated deployment pipelines
2. You need aggressive caching (e.g., high traffic)
3. Your infrastructure can handle manifest updates

**Use Strategy 3** only if:
1. You have specific requirements for different cache policies
2. CSS changes significantly less than JS
3. You want hybrid caching strategy

---

## Current Status

Your codebase is ready for **all three strategies**:

✅ `@fedex/ui` package supports all options  
✅ Tests passing (15/15)  
✅ Documentation complete  
✅ Default behavior (Strategy 1) requires no changes  

### To Use Strategy 1 (Current Setup)
No changes needed! It already works.

### To Use Strategy 2
1. Update vite.config.mts (add hash to filenames)
2. Update deployment script to extract hashed filenames
3. Update manifest with hashed URLs

### To Use Strategy 3
1. Update vite.config.mts (hash JS, not CSS)
2. Add `{ removeHash: true }` to `deriveCssUrl()` call
3. Update deployment with different cache policies

---

## See Also

- **Complete guide:** [PRODUCTION_CSS_LOADING.md](PRODUCTION_CSS_LOADING.md)
- **Quick reference:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **API documentation:** [packages/ui/README.md](packages/ui/README.md)

---

**Need help deciding? Start with Strategy 1. You can always upgrade later! 🚀**

