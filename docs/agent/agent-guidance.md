# Agent Guidance for Visibility Core Frontend

**Version:** 2.0  
**Last Updated:** January 4, 2026  
**Architecture Score:** 8.5/10 (Production-Ready)

This document provides comprehensive guidance for AI agents working on the Visibility Core Frontend module federation system. Following these guidelines ensures consistency, maintainability, and adherence to architectural principles.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Best Practices](#best-practices)
4. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
5. [Code Examples](#code-examples)
6. [Mandatory Constraints](#mandatory-constraints)
7. [Nx Workflow](#nx-workflow)
8. [Output Guidelines](#output-guidelines)
9. [Quick Reference](#quick-reference)
10. [Summary](#summary)

---

## System Overview

### Architecture Type
**Module Federation with React Remotes**
- **Score:** 8.5/10 (Production-Ready)
- **Pattern:** Micro-frontends with runtime remote loading
- **Framework:** React 19 + Vite + Nx monorepo

### Three-Layer Architecture
```
┌─────────────────────────────────────────┐
│  Angular Enterprise Portal (External)   │
│  - Provides: PortalContext              │
│  - Provides: React runtime (shared)     │
└─────────────┬───────────────────────────┘
              │ mounts
              ▼
┌─────────────────────────────────────────┐
│  Visibility Shell (/visibility)         │
│  - Transforms: PortalContext →          │
│                VisibilityContext        │
│  - Manages: Remote loading & routing    │
│  - Provides: Feature flags, entitlements│
└─────────────┬───────────────────────────┘
              │ loads
              ▼
┌─────────────────────────────────────────┐
│  Domain Remotes (/status, /overview)    │
│  - Receives: VisibilityContext          │
│  - Implements: mount/unmount contract   │
│  - Self-contained: Own routes/features  │
└─────────────────────────────────────────┘
```

### Key Components
- **Hosts:** `apps/visibility` (React shell)
- **Remotes:** `apps/status`, future domain modules
- **Shared Libs:** `@fedex/context` (types), `@fedex/ui` (utilities)
- **Build Modes:** Shared (React external) & Standalone (React bundled)

## Preferred Patterns
- Use Nx targets instead of custom scripts
- Prefer capability-based gating to tier-based forks
- Favor composition over inheritance in React components

## Avoid
- Introducing new CI pipeline steps
- Duplicating logic across MFEs
- Creating shared mutable state between shells

## When Unsure
If a request conflicts with existing principles:
- surface the conflict
- ask for clarification
- do not guess

## Suggested Approach
When making changes:
1. Identify affected domains
2. Check existing abstractions
3. Reuse before creating new patterns

## Constraints

If any constraint is violated, the response is considered invalid and must be regenerated.

### Accessibility Requirements (MANDATORY)

All UI components MUST be ADA and WCAG 2.1 AA compliant by default.

The following rules are NON-NEGOTIABLE:

#### General
- Semantic HTML MUST be used whenever possible (button, nav, main, header, dialog, etc.)
- No interactive behavior on non-interactive elements (e.g., div with onClick)
- All interactive elements MUST be keyboard accessible
- Focus order MUST be logical and predictable

#### Keyboard & Focus
- All functionality MUST be usable via keyboard alone
- Visible focus indicators MUST be preserved (no outline: none)
- Modals MUST:
  - trap focus while open
  - restore focus on close
  - close via Escape key

#### ARIA
- ARIA MUST be used only when semantic HTML is insufficient
- All ARIA attributes MUST be valid and complete
- ARIA roles MUST match behavior (e.g., role="dialog" for modals)
- aria-label or aria-labelledby is REQUIRED for icon-only controls

#### Forms
- Every input and interactive element MUST be reachable via keyboard
- Every form control MUST have a unique id
- Every input MUST have an associated label
- Error messages MUST be programmatically associated with inputs
- Required fields MUST be indicated accessibly (not color-only)

#### Visuals
- Color MUST NOT be the only means of conveying information
- Contrast MUST meet WCAG AA (4.5:1 text, 3:1 large text)
- Icons MUST include accessible text equivalents

#### Dynamic Content
- Screen readers MUST be notified of dynamic updates when appropriate
- Use aria-live regions sparingly and intentionally

#### Prohibited
- No tabindex > 0
- No click-only interactions
- No placeholder-only labels
- No role="presentation" on interactive content

#### Output Requirements
- If accessibility cannot be satisfied, the agent MUST explicitly call it out
- The agent MUST NOT assume a mouse or touch-only interaction

### Federated Event Handling (MANDATORY)
- Remotes MUST NOT depend on framework-specific state stores
- Cross-host communication MUST use:
  - Custom DOM events
  - Explicit remote APIs
  - URL state
- Shared mutable stores (Zustand, Redux, etc.) are FORBIDDEN across MF boundaries

## Output Rules
- DO NOT output full file contents unless specifically requested
- When showing code snippets, include only relevant sections
- Use ellipses (...) to indicate omitted existing content
- DO NOT repeat Nx-generated boilerplate
- Show ONLY:
  - file paths
  - new directories
  - changed lines
  
## Nx Command Rules (MANDATORY)
- Nx version MUST be read from package.json
- Only commands valid for that version may be used
- Legacy flags are FORBIDDEN (e.g. --project, --with-deps)
- Prefer:
  - nx run
  - nx affected
  - nx graph
- If command syntax is uncertain:
  - omit the command
  - or ask for clarification

### Nx Naming Rules (MANDATORY)
- All Nx apps and libs MUST be lowercase
- No kebab-case
- No camelCase
- No PascalCase
- Directory name === Nx project name
- If a proposed name contains uppercase or '-', the output is invalid

** Naming is lower case to ensure consistency and avoid issues with Nx, Vite, and other tooling conflicts **

#### Examples:
- ✅ tracking
- ✅ analyticscore
- ❌ tracking-ui
- ❌ Tracking
- ❌ trackingUi

---

## Architecture Principles

### 1. Clear Boundaries (CRITICAL)
**Module federation requires strict boundaries to prevent coupling.**

#### Context Flow (Unidirectional)
```typescript
// ✅ CORRECT: Context flows down
Portal → PortalContext → Visibility Shell
Visibility Shell → VisibilityContext → Domain Remotes

// ❌ WRONG: Remotes never pass context up
Remote ❌→ Visibility Shell
```

#### Dependency Rules
```
┌─────────────────────────────────────┐
│ Dependency Direction: TOP → BOTTOM  │
├─────────────────────────────────────┤
│ Portal (Angular)                    │
│   ↓ can mount                       │
│ Visibility Shell (React)            │
│   ↓ can load                        │
│ Domain Remotes (React)              │
│   ↓ can use                         │
│ Shared Libraries (@fedex/*)         │
└─────────────────────────────────────┘

Rule: Lower layers NEVER import from upper layers
```

#### File Location Boundaries
```typescript
// ✅ CORRECT: Shared in packages/
packages/context/src/lib/context.ts        // Types used by all
packages/ui/src/lib/loadCss.ts            // Utilities used by all

// ✅ CORRECT: Host-specific in apps/visibility/
apps/visibility/src/app/remotes/loadRemotes.ts    // Remote loading logic
apps/visibility/src/app/types/remoteModule.ts     // Host-specific types

// ✅ CORRECT: Remote-specific in apps/status/
apps/status/src/app/app.tsx                       // Status app logic

// ❌ WRONG: Remote importing from visibility
apps/status/src/somefile.ts
import { something } from '../../visibility/...'  // FORBIDDEN
```

### 2. Remote Contract (MANDATORY)
**All remotes MUST implement this exact contract:**

```typescript
// apps/{remote}/src/{remote}.tsx
export async function mount(el: HTMLElement, ctx?: VisibilityContext): Promise<void> {
  // 1. Load CSS
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.warn);
  
  // 2. Create React root
  const root = createRoot(el);
  rootRegistry.set(el, root);
  
  // 3. Render with context provider
  root.render(
    <VisibilityContextProvider value={ctx}>
      <App />
    </VisibilityContextProvider>
  );
}

export function unmount(el?: HTMLElement): void {
  const root = rootRegistry.get(el);
  if (root) {
    root.unmount();
    rootRegistry.delete(el);
  }
}
```

**Why this matters:**
- Framework-agnostic interface
- Predictable lifecycle
- Memory management
- CSS loading handled

### 3. Type Safety (CRITICAL)
**Use runtime type guards for dynamic imports:**

```typescript
// ✅ CORRECT: Runtime validation
function isRemoteModule(mod: unknown): mod is RemoteModule {
  return (
    typeof mod === 'object' &&
    mod !== null &&
    'mount' in mod &&
    typeof (mod as any).mount === 'function'
  );
}

const mod = await import(url);
if (!isRemoteModule(mod)) {
  throw new Error(`Invalid remote: ${remoteName}`);
}
return mod;

// ❌ WRONG: Blind type assertion
const mod = await import(url);
return mod as RemoteModule;  // Unsafe!
```

### 4. Error Handling Strategy
**Layer errors appropriately:**

```typescript
// Remote loading errors (apps/visibility/)
try {
  const mod = await loadRemoteWithRetry(name, manifest, ctx);
} catch (error) {
  // Show user-friendly error component
  return <RemoteErrorComponent remote={name} error={error} />;
}

// Network resilience (built-in)
await loadRemoteWithRetry(name, manifest, ctx, {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 10000
});
```

### 5. CSS Loading (PRODUCTION-CRITICAL)
**Always use the shared @fedex/ui utilities:**

```typescript
// ✅ CORRECT: Use shared utilities
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, ctx?: VisibilityContext) {
  // Load CSS before rendering
  await loadCss(deriveCssUrl(import.meta.url, { removeHash: true }))
    .catch(console.warn);
  
  // Then render
  const root = createRoot(el);
  // ...
}

// ❌ WRONG: Duplicate CSS loading logic
function myLoadCss(url: string) { /* reimplemented */ }  // Don't do this!
```

---

## Best Practices

### Development Patterns

#### 1. Feature Flags
```typescript
// ✅ Use feature flags for gradual rollouts
import { useFeatureFlag } from '@fedex/context';

function MyComponent() {
  const hasNewUI = useFeatureFlag('new-ui-2024');
  return hasNewUI ? <NewUI /> : <LegacyUI />;
}

// Set flags in visibility context
const visibilityContext: VisibilityContext = {
  ...portalContext,
  featureFlags: {
    'new-ui-2024': true,
    'beta-features': false,
  }
};
```

#### 2. Context Consumption
```typescript
// ✅ Use hooks to access context
import { useVisibilityContext } from '@fedex/context';

function MyComponent() {
  const ctx = useVisibilityContext();
  const isAuthorized = ctx.entitlements.includes('feature:view');
  
  if (!isAuthorized) {
    return <UnauthorizedMessage />;
  }
  
  return <AuthorizedContent />;
}

// ❌ WRONG: Don't pass context as props everywhere
function MyComponent({ context }: { context: VisibilityContext }) { }
```

#### 3. Shared Utilities
```typescript
// ✅ Export reusable utilities from @fedex/ui
// packages/ui/src/lib/myUtil.ts
export function myUtil() { /* ... */ }

// Use in any app
import { myUtil } from '@fedex/ui';

// ❌ WRONG: Copy-paste utilities between apps
// apps/visibility/src/utils/myUtil.ts  // Don't duplicate!
// apps/status/src/utils/myUtil.ts      // Don't duplicate!
```

#### 4. Build Modes
```typescript
// Dual-build system for flexibility
// Shared mode (default): React externalized
BUILD_MODE=shared npx nx build visibility    // → ~6KB

// Standalone mode: React bundled
BUILD_MODE=standalone npx nx build visibility // → ~318KB

// Production: Build both
npm run ci:build:all
```

### Testing Patterns

#### 1. Unit Tests
```typescript
// ✅ Test utilities in isolation
import { loadCss } from '@fedex/ui';

describe('loadCss', () => {
  it('should not load duplicate CSS', async () => {
    await loadCss('test.css');
    await loadCss('test.css');
    
    const links = document.querySelectorAll('link[href="test.css"]');
    expect(links.length).toBe(1);
  });
});
```

#### 2. Component Tests
```typescript
// ✅ Provide context in tests
import { VisibilityContextProvider } from '@fedex/context';

const mockContext: VisibilityContext = {
  env: 'development',
  user: { id: '123', roles: ['user'] },
  locale: 'en-US',
  entitlements: ['feature:view'],
  rollout: 'current',
  featureFlags: { 'new-ui': true }
};

render(
  <VisibilityContextProvider value={mockContext}>
    <MyComponent />
  </VisibilityContextProvider>
);
```

### File Organization

#### Creating a New Remote
```bash
# Step 1: Generate app (lowercase only!)
npx nx generate @nx/react:app myremote --bundler=vite

# Step 2: Create mount contract
# apps/myremote/src/myremote.tsx
export async function mount(el: HTMLElement, ctx?: VisibilityContext) {
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.warn);
  
  const root = createRoot(el);
  root.render(
    <VisibilityContextProvider value={ctx}>
      <App />
    </VisibilityContextProvider>
  );
}

export function unmount(el?: HTMLElement) {
  // cleanup
}

# Step 3: Configure vite.config.mts
const buildMode = (process.env.BUILD_MODE || 'shared') as 'shared' | 'standalone';

export default defineConfig({
  build: {
    lib: {
      entry: './src/myremote.tsx',
      formats: ['es'],
      fileName: () => 'myremote.mjs',
    },
    rollupOptions: {
      external: buildMode === 'shared' 
        ? ['react', 'react-dom', 'react/jsx-runtime', /* ... */]
        : [],
    },
  },
});

# Step 4: Update manifest
# apps/visibility/public/remotes.manifest.json
{
  "remotes": {
    "myremote": {
      "current": "http://localhost:4203/myremote.mjs"
    }
  }
}

# Step 5: Test
npx nx serve myremote
```

---

## Anti-Patterns to Avoid

### 1. Cross-Remote Direct Communication ❌
```typescript
// ❌ WRONG: Remote A importing from Remote B
// apps/remoteA/src/somefile.ts
import { something } from '../../remoteB/src/utils';  // FORBIDDEN

// ✅ CORRECT: Share via packages/
// packages/ui/src/lib/shared.ts
export function something() { }

// Both remotes import from shared package
import { something } from '@fedex/ui';
```

**Why:** Creates tight coupling, breaks independent deployment.

### 2. Shared Mutable State ❌
```typescript
// ❌ WRONG: Global Redux/Zustand store shared across remotes
const globalStore = createStore({ /* ... */ });

// ❌ WRONG: Window-level state
window.__SHARED_STATE__ = { };

// ✅ CORRECT: Use context or events
// Context for data passing
<VisibilityContextProvider value={data}>

// Custom events for communication
window.dispatchEvent(new CustomEvent('data-updated', { detail: data }));
```

**Why:** Creates hidden dependencies, makes debugging impossible.

### 3. Hardcoded URLs ❌
```typescript
// ❌ WRONG: Hardcoded remote URLs
const statusUrl = 'http://localhost:4202/status.mjs';

// ✅ CORRECT: Use manifest
const manifest = await loadRemoteManifest();
const statusUrl = manifest.remotes.status.current;
```

**Why:** Can't change URLs per environment, breaks deployment flexibility.

### 4. Bypassing Type Guards ❌
```typescript
// ❌ WRONG: Blind type assertion
const mod = await import(url) as RemoteModule;

// ✅ CORRECT: Runtime validation
const mod = await import(url);
if (!isRemoteModule(mod)) {
  throw new Error('Invalid remote');
}
```

**Why:** Fails at runtime with cryptic errors.

### 5. Duplicate Logic ❌
```typescript
// ❌ WRONG: Copy-paste utilities
// apps/visibility/src/utils/format.ts
export function formatDate(date: Date) { /* ... */ }

// apps/status/src/utils/format.ts
export function formatDate(date: Date) { /* same code */ }

// ✅ CORRECT: Share via package
// packages/ui/src/lib/format.ts
export function formatDate(date: Date) { /* ... */ }

// Import in both apps
import { formatDate } from '@fedex/ui';
```

**Why:** Bugs fixed in one place don't propagate, maintenance nightmare.

### 6. Breaking the Remote Contract ❌
```typescript
// ❌ WRONG: Non-standard exports
export default function MyApp() { }  // Missing mount/unmount

// ❌ WRONG: Wrong signature
export function mount(el: HTMLElement) {
  // Missing context parameter
}

// ✅ CORRECT: Standard contract
export async function mount(el: HTMLElement, ctx?: VisibilityContext) { }
export function unmount(el?: HTMLElement) { }
```

**Why:** Visibility shell can't load the remote.

### 7. CSS in JS ❌
```typescript
// ❌ WRONG: Inline styles everywhere
<div style={{ color: 'red', fontSize: '16px' }}>

// ❌ WRONG: CSS-in-JS libraries (styled-components, emotion)
const StyledDiv = styled.div`
  color: red;
`;

// ✅ CORRECT: CSS modules
import styles from './component.module.css';
<div className={styles.container}>

// ✅ CORRECT: Loaded via @fedex/ui
loadCss(deriveCssUrl(import.meta.url));
```

**Why:** CSS-in-JS doesn't work well with module federation, CSS modules are more predictable.

### 8. Tight Version Coupling ❌
```typescript
// ❌ WRONG: Exact version requirements
"dependencies": {
  "some-library": "1.2.3"  // Too specific
}

// ✅ CORRECT: Use ranges
"dependencies": {
  "some-library": "^1.2.3"  // Allows patches
}

// ✅ CORRECT: Peer dependencies for shared libs
"peerDependencies": {
  "react": "^19.0.0"
}
```

**Why:** Makes updating difficult, causes version conflicts.

---

## Code Examples

### Example 1: Creating a New Remote Module

**Scenario:** Add a new "overview" remote to display dashboard data.

**Step-by-Step:**

```bash
# 1. Generate the app (lowercase!)
npx nx generate @nx/react:app overview --bundler=vite

# 2. Create the mount file
# File: apps/overview/src/overview.tsx
```

```typescript
import { createRoot, Root } from 'react-dom/client';
import { VisibilityContext, VisibilityContextProvider } from '@fedex/context';
import { deriveCssUrl, loadCss } from '@fedex/ui';
import App from './app/app';
import './overview.css';

const rootRegistry = new WeakMap<HTMLElement, Root>();

export async function mount(el: HTMLElement, ctx?: VisibilityContext) {
  // Load CSS
  await loadCss(deriveCssUrl(import.meta.url, { removeHash: true }))
    .catch(console.warn);

  // Check if already mounted
  let root = rootRegistry.get(el);
  if (root) {
    root.render(
      <VisibilityContextProvider value={ctx}>
        <App />
      </VisibilityContextProvider>
    );
    return;
  }

  // Create new root
  root = createRoot(el);
  rootRegistry.set(el, root);
  root.render(
    <VisibilityContextProvider value={ctx}>
      <App />
    </VisibilityContextProvider>
  );
}

export function unmount(el?: HTMLElement) {
  if (!el) return;
  const root = rootRegistry.get(el);
  if (root) {
    root.unmount();
    rootRegistry.delete(el);
  }
}

if (import.meta.env.DEV) {
  console.info('%c📊 Overview Remote Loaded', 
    'background: #ff6600; color: white; padding: 4px 8px; font-weight: bold;');
}
```

```bash
# 3. Update vite.config.mts
# File: apps/overview/vite.config.mts
```

```typescript
import { defineConfig } from 'vitest/config';

const hostSetup = { port: 4203, host: 'localhost' };
const buildMode = (process.env.BUILD_MODE || 'shared') as 'shared' | 'standalone';

export default defineConfig({
  root: import.meta.dirname,
  server: hostSetup,
  
  build: {
    cssCodeSplit: false,
    outDir: buildMode === 'standalone' 
      ? '../../dist/apps/overview-standalone' 
      : '../../dist/apps/overview',
    
    lib: {
      entry: './src/overview.tsx',
      formats: ['es'],
      fileName: () => 'overview.mjs',
    },
    
    rollupOptions: {
      external: buildMode === 'shared' 
        ? ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client', 'scheduler']
        : [],
    },
  },
});
```

```bash
# 4. Update manifest
# File: apps/visibility/public/remotes.manifest.json
```

```json
{
  "remotes": {
    "status": {
      "current": "http://localhost:4202/status.mjs"
    },
    "overview": {
      "current": "http://localhost:4203/overview.mjs"
    }
  }
}
```

```bash
# 5. Add to visibility routes
# File: apps/visibility/src/app/routes.tsx
```

```typescript
export const routes = [
  { path: '/status', remote: 'status' },
  { path: '/overview', remote: 'overview' },  // ✅ Added
];
```

```bash
# 6. Test
npx nx serve overview
npx nx serve visibility

# Visit: http://localhost:4201
```

### Example 2: Adding a Shared Utility

**Scenario:** Add a date formatting utility used by multiple remotes.

```bash
# File: packages/ui/src/lib/formatDate.ts
```

```typescript
/**
 * Formats a date according to locale
 * @param date - Date to format
 * @param locale - Locale string (default: 'en-US')
 */
export function formatDate(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a date relative to now (e.g., "2 days ago")
 */
export function formatRelativeDate(date: Date, locale: string = 'en-US'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  return rtf.format(days, 'day');
}
```

```bash
# Export from package
# File: packages/ui/src/index.ts
```

```typescript
export * from './lib/loadCss.js';
export * from './lib/formatDate.js';  // ✅ Added
```

```bash
# Use in remotes
# File: apps/status/src/app/StatusDisplay.tsx
```

```typescript
import { formatDate, formatRelativeDate } from '@fedex/ui';

function StatusDisplay({ lastUpdated }: { lastUpdated: Date }) {
  return (
    <div>
      <p>Last updated: {formatDate(lastUpdated)}</p>
      <p>{formatRelativeDate(lastUpdated)}</p>
    </div>
  );
}
```

```bash
# Add tests
# File: packages/ui/src/lib/formatDate.spec.ts
```

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeDate } from './formatDate';

describe('formatDate', () => {
  it('formats date in default locale', () => {
    const date = new Date('2026-01-04');
    expect(formatDate(date)).toBe('January 4, 2026');
  });
  
  it('formats date in specified locale', () => {
    const date = new Date('2026-01-04');
    expect(formatDate(date, 'fr-FR')).toBe('4 janvier 2026');
  });
});
```

### Example 3: Using Feature Flags

**Scenario:** Gradually roll out a new UI component.

```typescript
// File: apps/overview/src/app/Dashboard.tsx
import { useFeatureFlag } from '@fedex/context';
import NewDashboard from './NewDashboard';
import LegacyDashboard from './LegacyDashboard';

export function Dashboard() {
  const useNewDashboard = useFeatureFlag('dashboard-v2');
  
  return useNewDashboard ? <NewDashboard /> : <LegacyDashboard />;
}
```

```typescript
// Set flag in visibility shell
// File: apps/visibility/src/visibility.tsx
const visibilityContext: VisibilityContext = {
  ...portalContext,
  entitlements: ['external:overview'],
  rollout: 'current',
  featureFlags: {
    'dashboard-v2': true,  // Enable for testing
  }
};
```

```typescript
// Portal can control flags
// External: Angular portal passes flags
const portalContext: PortalContext = {
  env: 'production',
  user: { id: 'user123', roles: ['admin'] },
  locale: 'en-US',
  featureFlags: {
    'dashboard-v2': user.roles.includes('beta-tester'),  // A/B testing
  }
};
```

---

## Mandatory Constraints

### 1. Accessibility (ENFORCED)
See the detailed accessibility requirements above. Key rules:
- Semantic HTML MUST be used
- Keyboard navigation MUST work
- Focus management MUST be correct
- ARIA MUST be used appropriately
- Color alone MUST NOT convey information

**Validation:** If accessibility cannot be achieved, MUST explicitly state why.

### 2. No Shared Mutable State (ENFORCED)
```typescript
// ❌ FORBIDDEN
window.__STORE__ = createStore();
const globalState = new Map();

// ✅ ALLOWED
// Context (immutable data passing)
// Custom DOM events
// URL state
```

### 3. Runtime Type Validation (ENFORCED)
All dynamic imports MUST use type guards:
```typescript
// ✅ REQUIRED
if (!isRemoteModule(mod)) {
  throw new Error('Invalid module');
}
```

### 4. CSS Loading (ENFORCED)
MUST use @fedex/ui utilities:
```typescript
// ✅ REQUIRED
import { loadCss, deriveCssUrl } from '@fedex/ui';
```

### 5. Nx Naming (ENFORCED)
- ALL lowercase
- NO hyphens
- NO camelCase
- NO PascalCase

### 6. Pre-commit Hooks (ENFORCED)

**All commits automatically trigger quality checks:**

```bash
npx nx affected -t lint typecheck test --base=HEAD~1
```

**What This Means:**
- Lint errors block commits ❌
- Type errors block commits ❌
- Test failures block commits ❌
- Only affected projects are checked ✅
- Nx caching makes it fast ✅

**Baseline:** Compares against `HEAD~1` (last commit). First commit uses `--all` automatically.

**To Skip (Use Sparingly):**
```bash
git commit --no-verify -m "WIP: work in progress"
```

**Valid Reasons to Skip:**
- WIP commits (will be fixed before PR)
- Emergency hotfixes (fix in follow-up)
- Never skip for regular development

**When Hooks Fail:**
```bash
# Auto-fix lint issues
npm run lint:fix

# Run checks manually
npm run precommit

# Check what's affected
npx nx affected:graph
```

**Performance:**
- Small changes: ~10-15s
- Medium changes: ~30-45s  
- Large changes: ~60-120s
- Subsequent runs faster (Nx cache)

**See:** `docs/development.md` for complete troubleshooting guide.

---

## Nx Workflow

### Common Commands

#### Development
```bash
# Serve a single app
npx nx serve visibility    # Host shell on :4201
npx nx serve status       # Remote on :4202

# Serve with watch
npx nx serve visibility --watch

# Build for production
npx nx build visibility
npx nx build status

# Build both modes
npm run ci:build:shared       # Production (React external)
npm run ci:build:standalone   # Fallback (React bundled)
npm run ci:build:all          # Both modes
```

#### Docker
```bash
# Build all Docker images
npm run docker:build:all

# Build visibility image
npm run docker:build:visibility

# Build status image
npm run docker:build:status

# Start with Docker Compose
npm run docker:compose:up

# Stop all containers
npm run docker:compose:down
```

**Important:** nginx.conf MUST include MIME type configuration for `.mjs` files:
```nginx
types {
    application/javascript js mjs;
    text/css css;
    application/json json;
}
```
Without this, browsers will block module loading due to wrong MIME type.

#### Testing
```bash
# Run all tests
npx nx run-many -t test

# Test specific project
npx nx test ui
npx nx test context

# Test with coverage
npx nx test ui --coverage

# E2E tests
npx nx e2e visibility-e2e
```

#### Code Quality
```bash
# Type check all projects
npx nx run-many -t typecheck

# Lint all projects
npx nx run-many -t lint

# Lint specific project
npx nx lint visibility
```

#### Pre-commit Hooks (Enforced)

**All commits trigger:**
```bash
npx nx affected -t lint typecheck test --base=HEAD~1
```

#### Dependency Graph
```bash
# View dependency graph
npx nx graph

# Show affected projects
npx nx affected:graph
```

### Creating New Projects

#### New Remote App
```bash
# Generate React app (lowercase name!)
npx nx generate @nx/react:app myremote \
  --bundler=vite \
  --style=css \
  --unitTestRunner=vitest \
  --e2eTestRunner=playwright

# Directory structure created:
# apps/myremote/
# apps/myremote-e2e/
```

#### New Shared Library
```bash
# Generate library (lowercase name!)
npx nx generate @nx/react:library mylib \
  --bundler=vite \
  --unitTestRunner=vitest \
  --importPath=@fedex/mylib \
  --directory=packages/mylib

# Directory structure created:
# packages/mylib/
```

### Project Configuration

#### Add New Dependency
```bash
# Add to specific project
npm install --workspace apps/visibility some-package

# Add to root (dev dependency)
npm install -D some-package
```

#### Update Nx
```bash
# Update Nx and plugins
npx nx migrate latest

# Apply migrations
npx nx migrate --run-migrations
```

---

## Output Guidelines

### What to Include in Responses

#### ✅ DO Include:
- File paths being modified
- Only the changed lines of code
- Clear comments explaining changes
- Import statements when adding new dependencies
- Type annotations for new functions
- Brief explanation of why

#### ❌ DO NOT Include:
- Full file contents (unless specifically requested)
- Unchanged boilerplate code
- Nx-generated configuration (unless modifying it)
- Entire component files when changing one line
- Repeated explanations of known patterns

### Code Snippet Format

Use this format for code changes:

```typescript
// File: apps/visibility/src/app/app.tsx

// ...existing imports...
import { newImport } from 'new-package';  // ✅ Show new imports

function App() {
  // ...existing code...
  
  const newFeature = useNewFeature();  // ✅ Show added lines
  
  // ...existing code...
}

// ...existing code...
```

### Multi-File Changes

When changing multiple files, show them clearly:

```bash
# Files changed:
# 1. apps/visibility/src/app/app.tsx
# 2. packages/ui/src/lib/newUtil.ts
# 3. packages/ui/src/index.ts
```

### Command Execution

When showing commands, explain what they do:

```bash
# Build the visibility app in shared mode (React externalized)
BUILD_MODE=shared npx nx build visibility

# Expected output: dist/apps/visibility/ (~6KB)
```

### Error Handling

If a constraint is violated, format response like this:

```
❌ CONSTRAINT VIOLATION: Nx Naming

The proposed name "my-remote" violates Nx naming rules.

Issue: Contains hyphen (-)
Rule: All Nx project names MUST be lowercase without hyphens

Suggested fix: "myremote"

Please confirm the corrected name before proceeding.
```

---

## Quick Reference

### Architecture Layers
```
Portal (Angular) 
  ↓ provides PortalContext
Visibility Shell (React) 
  ↓ provides VisibilityContext
Domain Remotes (React)
  ↓ use @fedex/* packages
Shared Libraries
```

### Key Files
- `apps/visibility/public/remotes.manifest.json` - Remote URLs
- `apps/{remote}/src/{remote}.tsx` - Mount contract
- `apps/{remote}/vite.config.mts` - Build configuration
- `packages/context/src/lib/context.ts` - Type definitions
- `packages/ui/src/lib/loadCss.ts` - CSS utilities

### Build Commands
```bash
npm run ci:build:shared       # Production (React external)
npm run ci:build:standalone   # Fallback (React bundled)
npm run ci:build:all          # Both modes
```

### Docker Commands
```bash
npm run docker:build:all             # Build all Docker images
npm run docker:build:visibility      # Build visibility image
npm run docker:build:status          # Build status image
npm run docker:compose:up            # Start with Docker Compose
npm run docker:compose:down          # Stop all containers
```

### Test Commands
```bash
# Run all tests
npx nx run-many -t test

# Test specific project
npx nx test ui
npx nx test context

# Test with coverage
npx nx test ui --coverage

# E2E tests
npx nx e2e visibility-e2e
```

### Code Patterns
```typescript
// ✅ Remote contract
export async function mount(el: HTMLElement, ctx?: VisibilityContext) { }
export function unmount(el?: HTMLElement) { }

// ✅ Context hook
const ctx = useVisibilityContext();

// ✅ Feature flag
const enabled = useFeatureFlag('feature-name');

// ✅ CSS loading
loadCss(deriveCssUrl(import.meta.url, { removeHash: true }));

// ✅ Type guard
if (!isRemoteModule(mod)) throw new Error('Invalid');
```

---

## Summary

This agent guidance provides:

1. **System Overview** - Understanding the three-layer architecture
2. **Architecture Principles** - Boundaries, contracts, type safety
3. **Best Practices** - Patterns for development and testing
4. **Anti-Patterns** - What NOT to do and why
5. **Code Examples** - Complete working examples for common tasks
6. **Mandatory Constraints** - Non-negotiable rules (accessibility, naming, etc.)
7. **Nx Workflow** - Commands and project management
8. **Output Guidelines** - How to format responses

### Key Takeaways

1. **Maintain strict boundaries** - No cross-remote imports
2. **Follow the remote contract** - mount/unmount is mandatory
3. **Use runtime type guards** - Never blindly assert types
4. **Share utilities properly** - Use @fedex/* packages
5. **Respect accessibility** - WCAG 2.1 AA is non-negotiable
6. **Name correctly** - Lowercase only, no hyphens
7. **Load CSS properly** - Use @fedex/ui utilities
8. **Test thoroughly** - Unit tests and E2E tests

### When in Doubt

1. Check existing patterns in the codebase
2. Consult ARCHITECTURAL_REVIEW.md
3. Ask for clarification rather than guessing
4. Surface conflicts with principles
5. Prefer conservative approaches

---

**Document Version:** 2.0  
**Last Updated:** January 4, 2026  
**Maintained By:** Architecture Team  
**Architecture Score:** 8.5/10 (Production-Ready)
