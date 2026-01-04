# Quick Wins - Immediate Improvements

This document contains actionable improvements you can implement right now to strengthen your module federation architecture. Each item includes complete code and should take 15-30 minutes to implement.

---

## 1. Add Runtime Type Guard for Remote Modules (15 min)

**Why:** Prevents runtime errors from malformed remote modules.

**File:** `apps/visibility/src/app/remotes/loadRemotes.ts`

```typescript
import { RemoteModule } from '../types/remoteModule';
import { RemoteManifest } from '../types/remoteManifest';
import { VisibilityContext } from '@fedex/context';

/**
 * Type guard to validate remote module structure at runtime
 */
function isRemoteModule(mod: unknown): mod is RemoteModule {
  return (
    typeof mod === 'object' &&
    mod !== null &&
    'mount' in mod &&
    typeof mod.mount === 'function' &&
    (!('unmount' in mod) || typeof mod.unmount === 'function')
  );
}

/**
 * Resolves the remote URL for a given remote name based on the portalContext context.
 */
function resolveRemoteUrl(remoteName: string, manifest: RemoteManifest, ctx?: VisibilityContext) {
  const remote = manifest.remotes[remoteName];
  if (!remote) throw new Error(`Unknown remote: ${remoteName}`);
  return remote[ctx?.rollout ?? 'current'];
}

/**
 * Loads a remote module given its name and the visibility context.
 */
export async function loadRemote(
  remoteName: string,
  manifest: RemoteManifest,
  ctx?: VisibilityContext,
): Promise<RemoteModule> {
  const url = resolveRemoteUrl(remoteName, manifest, ctx);
  if (!url) throw new Error(`No URL found for remote "${remoteName}"`);

  // Native ESM import
  const mod = await import(/* @vite-ignore */ url);
  
  // ✅ NEW: Runtime validation
  if (!isRemoteModule(mod)) {
    throw new Error(
      `Invalid remote module "${remoteName}": must export mount() function and optional unmount() function`
    );
  }
  
  return mod;
}
```

---

## 2. Fix RemoteModule Type Inconsistency (10 min)

**Why:** Prevents passing wrong context types to remotes.

**File:** `apps/visibility/src/app/types/remoteModule.ts`

```typescript
import { VisibilityContext } from '@fedex/context';

/**
 * Type definition for a remote module that can be mounted and unmounted.
 * All remote modules must implement this interface to ensure they can be
 * integrated seamlessly into the visibility host application.
 */
export type RemoteModule = {
  mount: (el: HTMLElement, ctx?: VisibilityContext) => void | Promise<void>;
  unmount?: (el?: HTMLElement | null) => void;
};
```

**Note:** Changed `PortalContext` to `VisibilityContext` since remotes receive the visibility-specific context.

---

## 3. Add Manifest Schema Validation (20 min)

**Why:** Catches configuration errors early.

**Install dependency:**
```bash
npm install ajv ajv-formats
```

**File:** `apps/visibility/src/app/remotes/loadManifest.ts`

```typescript
import { RemoteManifest } from '../types/remoteManifest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

let cachedManifest: RemoteManifest | null = null;
const manifestUrl = '/remotes.manifest.json';

// JSON Schema for manifest validation
const manifestSchema = {
  type: 'object',
  required: ['remotes'],
  properties: {
    remotes: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9_-]+$': {
          type: 'object',
          required: ['current'],
          properties: {
            current: { type: 'string', format: 'uri' },
            next: { type: 'string', format: 'uri' },
          },
          additionalProperties: { type: 'string', format: 'uri' }
        }
      }
    }
  }
};

const ajv = new Ajv();
addFormats(ajv);
const validateManifest = ajv.compile(manifestSchema);

/**
 * Loads the remote manifest from a predefined URL. Caches the result for future calls.
 *
 * @returns {Promise<RemoteManifest>} The loaded remote manifest.
 * @throws {Error} If the manifest cannot be loaded or is invalid.
 */
export async function loadRemoteManifest(): Promise<RemoteManifest> {
  if (cachedManifest) return cachedManifest;

  const res = await fetch(new URL(manifestUrl, import.meta.url));
  if (!res.ok) throw new Error(`Failed to load remote manifest (${res.status})`);
  
  const json = await res.json();

  // ✅ NEW: Schema validation
  if (!validateManifest(json)) {
    const errors = validateManifest.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid remote manifest: ${errors}`);
  }

  return (cachedManifest = json as RemoteManifest);
}
```

---

## 4. Add Feature Flags to Context (15 min)

**Why:** Enables gradual rollouts and A/B testing.

**File:** `packages/context/src/lib/context.ts`

```typescript
/**
 * PortalContext defines the structure for the portal's context,
 * including environment, user information, and locale, etc...
 */
export interface PortalContext {
  env: 'development' | 'staging' | 'production';
  user: {
    id: string;
    roles: string[];
  };
  locale: string;

  // [optional] Additional dynamic properties
  [key: string]: unknown;
}

/**
 * VisibilityContext extends PortalContext with additional properties
 * specific to visibility management.
 */
export interface VisibilityContext extends PortalContext {
  entitlements: string[];
  rollout: 'current' | 'next' | string;
  featureFlags: Record<string, boolean | string | number>; // ✅ NEW
}
```

**File:** `packages/context/src/lib/VisibilityContext.tsx`

Add a new hook at the end:

```typescript
/**
 * useFeatureFlag - Custom hook to check if a feature flag is enabled.
 *
 * @example
 * ```tsx
 * const hasNewUI = useFeatureFlag('new-ui-2024');
 * return hasNewUI ? <NewUI /> : <OldUI />;
 * ```
 *
 * @param flag - The feature flag key to check
 * @returns boolean indicating if the flag is enabled
 */
export function useFeatureFlag(flag: string): boolean {
  const ctx = useVisibilityContext();
  const value = ctx.featureFlags?.[flag];
  
  // Treat truthy values as enabled
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() !== 'false' && value !== '0';
  if (typeof value === 'number') return value !== 0;
  
  return false;
}
```

**File:** `packages/context/src/index.ts`

```typescript
export * from './lib/context.js';
export * from './lib/VisibilityContext.js';
// Export the new hook
export { useFeatureFlag } from './lib/VisibilityContext.js';
```

**Update:** `apps/visibility/src/visibility.tsx`

```typescript
// TODO: make the building of the VisibilityContext dynamic
const visibilityContext: VisibilityContext = {
  ...context,
  entitlements: ['external:overview', 'external:details'],
  rollout: 'current',
  featureFlags: {  // ✅ NEW
    'new-ui-2024': true,
    'beta-features': false,
  },
};
```

---

## 5. Add Remote Loading Retry Logic (25 min)

**Why:** More resilient to network failures.

**File:** `apps/visibility/src/app/remotes/loadRemotes.ts`

Add these interfaces and function:

```typescript
interface LoadRemoteOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Loads a remote module with retry logic for transient failures.
 *
 * @param remoteName - The name of the remote module to load
 * @param manifest - The remote manifest
 * @param ctx - The visibility context
 * @param options - Retry options
 * @returns A promise that resolves to the loaded remote module
 */
export async function loadRemoteWithRetry(
  remoteName: string,
  manifest: RemoteManifest,
  ctx?: VisibilityContext,
  options: LoadRemoteOptions = {}
): Promise<RemoteModule> {
  const { 
    maxRetries = 3, 
    retryDelay = 1000, 
    timeout = 10000 
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load timeout')), timeout);
      });
      
      // Race between loading and timeout
      const loadPromise = loadRemote(remoteName, manifest, ctx);
      const module = await Promise.race([loadPromise, timeoutPromise]);
      
      return module;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Failed to load remote "${remoteName}" (attempt ${attempt + 1}/${maxRetries + 1}):`,
        error
      );
      
      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(
    `Failed to load remote "${remoteName}" after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}
```

**File:** `apps/visibility/src/app/remotes/RemoteSlot.tsx`

Update to use retry logic:

```typescript
import { loadRemoteWithRetry } from './loadRemotes';

// ... in the useEffect

try {
  const manifest = await loadRemoteManifest();
  if (cancelled) return;

  // ✅ NEW: Use retry logic
  const mod = await loadRemoteWithRetry(remoteName, manifest, visibilityContext, {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000
  });
  
  if (cancelled) return;

  mod.mount(el, visibilityContext);
  cleanup = () => mod.unmount?.(el);

  setState({ status: 'mounted' });
} catch (err: unknown) {
  // ... error handling
}
```

---

## 6. Improve Root Management (20 min)

**Why:** Allows re-mounting with updated context.

**File:** `apps/visibility/src/visibility.tsx`

```typescript
import { createRoot, Root } from 'react-dom/client';
import App from './app/app';
import { PortalContext, VisibilityContext, VisibilityContextProvider } from '@fedex/context';
import './visibility.css';
import { deriveCssUrl, loadCss } from '@fedex/ui';

// ✅ NEW: Use WeakMap for element-to-root tracking
const rootRegistry = new WeakMap<HTMLElement, Root>();

/**
 * Mounts the visibility app into the given element with the provided portal context.
 * If already mounted to this element, re-renders with the new context.
 */
export async function mount(el: HTMLElement, context: PortalContext) {
  // Build the VisibilityContext
  const visibilityContext: VisibilityContext = {
    ...context,
    entitlements: ['external:overview', 'external:details'],
    rollout: 'current',
    featureFlags: {
      'new-ui-2024': true,
      'beta-features': false,
    },
  };

  // Load the CSS for this module
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.warn);

  // ✅ NEW: Check if already mounted
  let root = rootRegistry.get(el);
  
  if (root) {
    // Re-render with new context
    console.info('Re-mounting visibility with updated context');
    root.render(
      <VisibilityContextProvider value={visibilityContext}>
        <App />
      </VisibilityContextProvider>,
    );
    return;
  }

  // Create new root
  root = createRoot(el);
  rootRegistry.set(el, root);
  
  root.render(
    <VisibilityContextProvider value={visibilityContext}>
      <App />
    </VisibilityContextProvider>,
  );
}

/**
 * Unmounts the visibility app from the DOM.
 */
export function unmount(el?: HTMLElement) {
  if (!el) {
    console.warn('unmount() called without element - cannot unmount');
    return;
  }
  
  const root = rootRegistry.get(el);
  if (root) {
    root.unmount();
    // WeakMap will automatically clean up when el is garbage collected
  }
}
```

**File:** `apps/status/src/status.tsx`

Apply the same pattern:

```typescript
import { createRoot, Root } from 'react-dom/client';
import App from './app/app';
import { VisibilityContext, VisibilityContextProvider } from '@fedex/context';
import { deriveCssUrl, loadCss } from '@fedex/ui';
import './status.css';

// ✅ NEW: Use WeakMap for element-to-root tracking
const rootRegistry = new WeakMap<HTMLElement, Root>();

export async function mount(el: HTMLElement, context: VisibilityContext) {
  // Load the CSS for this module
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.warn);

  // ✅ NEW: Check if already mounted
  let root = rootRegistry.get(el);
  
  if (root) {
    console.info('Re-mounting status with updated context');
    root.render(
      <VisibilityContextProvider value={context}>
        <App />
      </VisibilityContextProvider>,
    );
    return;
  }

  root = createRoot(el);
  rootRegistry.set(el, root);
  
  root.render(
    <VisibilityContextProvider value={context}>
      <App />
    </VisibilityContextProvider>,
  );
}

export function unmount(el?: HTMLElement) {
  if (!el) {
    console.warn('unmount() called without element - cannot unmount');
    return;
  }
  
  const root = rootRegistry.get(el);
  if (root) {
    root.unmount();
  }
}
```

---

## 7. Add Development Debugging Tools (10 min)

**Why:** Better debugging experience during development.

**File:** `apps/visibility/src/visibility.tsx`

Add at the end of the file:

```typescript
// ✅ NEW: Development tools
if (import.meta.env.DEV) {
  // Expose debugging utilities on window
  (window as any).__VISIBILITY_DEBUG__ = {
    getContext: () => {
      // Would need to store context reference
      console.info('Context inspection - implement as needed');
    },
    reload: () => {
      console.info('Force reload - clearing caches');
      window.location.reload();
    },
    version: '0.0.1',
  };
  
  console.info(
    '%c🎯 Visibility Shell Loaded',
    'background: #0066cc; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;',
    '\nDebug tools available at window.__VISIBILITY_DEBUG__'
  );
}
```

**File:** `apps/status/src/status.tsx`

Add similar debug tools:

```typescript
// ✅ NEW: Development tools
if (import.meta.env.DEV) {
  console.info(
    '%c📊 Status Remote Loaded',
    'background: #00aa00; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;'
  );
}
```

---

## 8. Add TypeScript Strict Null Checks (5 min)

**Why:** Catch potential null/undefined errors at compile time.

**File:** `tsconfig.base.json`

Ensure these are enabled (they already are, but verify):

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,  // Already included in "strict"
    "noImplicitAny": true,      // Already included in "strict"
    "strictBindCallApply": true // Already included in "strict"
  }
}
```

✅ Your config already has this!

---

## Testing Your Changes

After implementing these improvements, run:

```bash
# Type check everything
npx nx run-many -t typecheck

# Run tests
npx nx run-many -t test

# Build everything
npx nx run-many -t build

# Test in browser
npx nx serve visibility
# In another terminal:
npx nx serve status
```

---

## Summary

These 8 quick wins will significantly improve your module federation architecture:

1. ✅ Runtime type guards - Prevents invalid remotes
2. ✅ Fixed type inconsistency - Correct context types
3. ✅ Manifest validation - Catches config errors
4. ✅ Feature flags - Enables A/B testing
5. ✅ Retry logic - Resilient to network issues
6. ✅ Better root management - Proper re-mounting
7. ✅ Debug tools - Better DX
8. ✅ Strict null checks - Verified

**Total time:** ~2 hours  
**Impact:** Significantly more robust and production-ready

---

**Next Steps:** After implementing these, review the full [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) for medium and low priority improvements.

