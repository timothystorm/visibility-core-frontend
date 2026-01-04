# Getting Started with Architectural Improvements

This guide walks you through implementing the architectural recommendations in priority order.

---

## ⏱️ Time Commitment

- **Quick Wins (This Guide):** ~2 hours
- **Medium Priority Items:** ~1-2 days
- **Low Priority Items:** Ongoing

---

## 🎯 Step-by-Step Implementation

### Phase 1: Quick Wins (Today - 2 hours)

All code is provided in [QUICK_WINS.md](./QUICK_WINS.md). Implement in this order:

#### 1. Fix Type Inconsistency (10 min) ✅
**File:** `apps/visibility/src/app/types/remoteModule.ts`

Change:
```typescript
import { PortalContext } from '@fedex/context';  // ❌ Wrong

export type RemoteModule = {
  mount: (el: HTMLElement, ctx?: PortalContext) => void;  // ❌ Wrong
  //                                ^^^^^^^^^^^^
};
```

To:
```typescript
import { VisibilityContext } from '@fedex/context';  // ✅ Correct

export type RemoteModule = {
  mount: (el: HTMLElement, ctx?: VisibilityContext) => void | Promise<void>;  // ✅ Correct
  unmount?: (el?: HTMLElement | null) => void;
};
```

**Test:** `npx nx run-many -t typecheck`

---

#### 2. Add Runtime Type Guard (15 min) ✅
**File:** `apps/visibility/src/app/remotes/loadRemotes.ts`

Add the type guard function and update `loadRemote()`:
- See complete code in [QUICK_WINS.md](./QUICK_WINS.md) section 1

**Test:** `npx nx test visibility` (add a test case)

---

#### 3. Add Feature Flags (15 min) ✅
**Files:** 
- `packages/context/src/lib/context.ts` - Add `featureFlags` to interface
- `packages/context/src/lib/VisibilityContext.tsx` - Add `useFeatureFlag` hook
- `packages/context/src/index.ts` - Export the hook
- `apps/visibility/src/visibility.tsx` - Add sample flags

**Test:** 
```bash
npx nx test context
npx nx serve visibility
```

---

#### 4. Improve Root Management (20 min) ✅
**Files:** 
- `apps/visibility/src/visibility.tsx` - Use WeakMap
- `apps/status/src/status.tsx` - Use WeakMap

**Test:** 
```bash
npx nx build visibility
npx nx build status
npx nx serve visibility
```

Try mounting twice to the same element - should see "Re-mounting" log.

---

#### 5. Add Development Tools (10 min) ✅
**Files:** 
- `apps/visibility/src/visibility.tsx` - Add window.__VISIBILITY_DEBUG__
- `apps/status/src/status.tsx` - Add console logs

**Test:** 
```bash
npx nx serve visibility
```

Open browser console and check for debug messages.

---

#### 6. Add Manifest Validation (20 min) ✅
**First, install dependency:**
```bash
npm install ajv ajv-formats
```

**File:** `apps/visibility/src/app/remotes/loadManifest.ts`

Add schema validation - see complete code in [QUICK_WINS.md](./QUICK_WINS.md) section 3

**Test:** 
```bash
npx nx test visibility
npx nx serve visibility
```

Try breaking the manifest to see validation errors.

---

#### 7. Add Retry Logic (25 min) ✅
**Files:** 
- `apps/visibility/src/app/remotes/loadRemotes.ts` - Add `loadRemoteWithRetry`
- `apps/visibility/src/app/remotes/RemoteSlot.tsx` - Use retry function

**Test:** 
```bash
npx nx serve visibility
```

Stop the status server to test retry behavior.

---

#### 8. Verify Strict Checks (5 min) ✅
**File:** `tsconfig.base.json`

Verify these are enabled:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}
```

✅ Already enabled in your config!

---

### ✅ Phase 1 Complete - Verify Everything Works

```bash
# Type check all projects
npx nx run-many -t typecheck

# Run all tests
npx nx run-many -t test

# Build all projects
npx nx run-many -t build

# Run in dev mode
npx nx serve visibility
# In another terminal:
npx nx serve status
```

**Expected Results:**
- ✅ All type checks pass
- ✅ All tests pass
- ✅ All builds succeed
- ✅ Apps run in browser
- ✅ Debug messages in console
- ✅ Retry logic works (test by stopping remote)

---

## 📋 Phase 2: Medium Priority (Next Sprint - 1-2 days)

### 1. Add Remote Lifecycle Events (2 hours)
**Purpose:** Analytics and monitoring

**Create:** `apps/visibility/src/app/remotes/remoteLifecycle.ts`

```typescript
export type RemoteLifecycleEvent = 
  | { type: 'loading', remoteName: string }
  | { type: 'loaded', remoteName: string, duration: number }
  | { type: 'mounted', remoteName: string }
  | { type: 'error', remoteName: string, error: Error, stage: string };

export type RemoteLifecycleListener = (event: RemoteLifecycleEvent) => void;

const listeners = new Set<RemoteLifecycleListener>();

export function onRemoteLifecycle(listener: RemoteLifecycleListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRemoteEvent(event: RemoteLifecycleEvent) {
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('Error in lifecycle listener:', error);
    }
  });
}
```

**Update:** `loadRemotes.ts` to emit events

**Usage:**
```typescript
onRemoteLifecycle(event => {
  if (event.type === 'error') {
    analytics.track('remote_error', {
      remote: event.remoteName,
      stage: event.stage
    });
  }
});
```

---

### 2. Add Preloading Strategy (3 hours)
**Purpose:** Better performance

**Create:** `apps/visibility/src/app/remotes/preloadRemotes.ts`

```typescript
export async function preloadRemote(
  remoteName: string,
  manifest: RemoteManifest,
  ctx?: VisibilityContext
): Promise<void> {
  try {
    await loadRemote(remoteName, manifest, ctx);
  } catch (error) {
    console.warn(`Preload failed for ${remoteName}:`, error);
  }
}
```

**Update:** `routes.tsx` to include preload hints

```typescript
export const routes = [
  {
    path: '/status',
    remote: 'status',
    preload: ['overview']  // Preload likely next route
  },
  {
    path: '/overview',
    remote: 'overview',
    preload: ['details']
  }
];
```

---

### 3. Add E2E Tests (4 hours)
**Purpose:** Catch integration bugs

**File:** `apps/visibility-e2e/src/remote-loading.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Remote Loading', () => {
  test('status remote loads and displays', async ({ page }) => {
    await page.goto('http://localhost:4201');
    
    // Wait for remote to load
    await page.waitForSelector('[data-remote="status"]', { timeout: 10000 });
    
    // Verify content
    await expect(page.locator('[data-remote="status"]')).toBeVisible();
  });
  
  test('handles remote loading errors gracefully', async ({ page }) => {
    // Mock fetch to simulate remote failure
    await page.route('**/remotes.manifest.json', route => {
      route.fulfill({
        status: 404,
        body: 'Not found'
      });
    });
    
    await page.goto('http://localhost:4201');
    
    // Should show error message
    await expect(page.locator('text=/failed to load/i')).toBeVisible();
  });
});
```

**Run:**
```bash
npx nx e2e visibility-e2e
```

---

### 4. Add Remote Health Checks (2 hours)
**Purpose:** Proactive monitoring

**Create:** `apps/visibility/src/app/remotes/healthCheck.ts`

```typescript
export async function checkRemoteHealth(
  remoteName: string,
  manifest: RemoteManifest
): Promise<{ available: boolean; latency?: number; error?: string }> {
  const url = resolveRemoteUrl(remoteName, manifest);
  const start = performance.now();
  
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return {
      available: response.ok,
      latency: performance.now() - start
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

---

### 5. Establish Versioning Strategy (1 hour)
**Purpose:** Controlled releases

**File:** `nx.json`

```json
{
  "release": {
    "version": {
      "conventionalCommits": true,
      "generatorOptions": {
        "currentVersionResolver": "git-tag",
        "packageRoot": "packages/{projectName}"
      }
    },
    "changelog": {
      "projectChangelogs": true,
      "workspaceChangelog": false
    }
  }
}
```

**Usage:**
```bash
# Version packages
npx nx release version --dry-run

# Publish
npx nx release publish
```

**Commit Convention:**
```
feat: add feature flag support
fix: correct type mismatch in RemoteModule
chore: update dependencies
docs: improve README
```

---

## 🎓 Phase 3: Best Practices (Ongoing)

### 1. Create Remote Scaffolding
**Create:** `tools/generators/remote/index.ts` (Nx generator)

```bash
npx nx generate @nx/react:app my-remote --bundler=vite
# Then add mount/unmount template
```

---

### 2. Document Deployment
**Create:** `DEPLOYMENT.md`

```markdown
# Deployment Order
1. Deploy shared packages to npm
2. Deploy remotes to CDN
3. Update manifest
4. Deploy visibility shell
5. Deploy Angular portal

# Rollback
- Update manifest to previous URLs
- No redeployment needed
```

---

### 3. Add Monitoring
Integrate with your analytics platform:

```typescript
onRemoteLifecycle(event => {
  if (event.type === 'loaded') {
    datadog.increment('remote.loaded', {
      remote: event.remoteName,
      duration: event.duration
    });
  }
});
```

---

## 📊 Success Metrics

After Phase 1 (Quick Wins):
- ✅ All type checks pass
- ✅ Runtime type validation in place
- ✅ Feature flags working
- ✅ Retry logic tested
- ✅ Debug tools available

After Phase 2 (Medium Priority):
- ✅ E2E tests passing
- ✅ Analytics integrated
- ✅ Preloading improves performance
- ✅ Health checks in place
- ✅ Semantic versioning adopted

After Phase 3 (Best Practices):
- ✅ New remotes scaffold in < 5 min
- ✅ Deployment documented
- ✅ Monitoring dashboard live

---

## 🆘 Troubleshooting

### Type Errors After Changes
```bash
npx nx sync
npx nx run-many -t typecheck
```

### Tests Failing
```bash
npx nx reset
npx nx run-many -t test --skip-nx-cache
```

### Build Issues
```bash
rm -rf dist node_modules/.vite
npm install
npx nx run-many -t build
```

---

## 📚 Additional Resources

- [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) - Full detailed review
- [QUICK_WINS.md](./QUICK_WINS.md) - Complete code for Phase 1
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - All documentation

---

## ✅ Checklist

### Phase 1: Quick Wins (Today)
- [ ] Fix RemoteModule type inconsistency
- [ ] Add runtime type guard
- [ ] Add feature flags
- [ ] Improve root management
- [ ] Add development tools
- [ ] Add manifest validation (install ajv first)
- [ ] Add retry logic
- [ ] Verify strict checks
- [ ] Test everything works

### Phase 2: Medium Priority (Next Sprint)
- [ ] Add remote lifecycle events
- [ ] Add preloading strategy
- [ ] Add E2E tests
- [ ] Add remote health checks
- [ ] Establish versioning strategy

### Phase 3: Best Practices (Ongoing)
- [ ] Create remote scaffolding generator
- [ ] Document deployment process
- [ ] Add monitoring and analytics
- [ ] Create runbook for operations

---

**Start with Phase 1 today. You'll have a significantly more robust architecture in just 2 hours.**

Good luck! 🚀

