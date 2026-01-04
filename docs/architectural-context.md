# Architecture Context

**Version:** 2.0  
**Last Updated:** January 4, 2026  
**Architecture Score:** 8.5/10 (Production-Ready)

## System Overview

This repository is an **Nx monorepo** containing **React micro-frontends** using **Module Federation** (ESM-based, runtime loading).

**Purpose:** Enable independent development and deployment of business domain features that integrate into an Angular enterprise portal.

**Key Capabilities:**
- Data-heavy dashboards with progressive enrichment
- Capability-based access control (not tier-based)
- Independent feature deployment without host redeployment
- Runtime remote loading with rollout strategies (current/next)

---

## Architecture Layers

### Three-Layer Model

```
┌─────────────────────────────────────────────┐
│  Layer 1: Platform Shell (External)         │
│  Technology: Angular                        │
│  Managed By: Platform Team                  │
│  Responsibilities:                          │
│    - Global authentication                  │
│    - Top-level navigation                   │
│    - Entitlement management                 │
│    - React runtime provider (shared)        │
└──────────────┬──────────────────────────────┘
               │ mounts (provides PortalContext)
               ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Domain Shell (This Repo)          │
│  Location: apps/visibility                  │
│  Technology: React + Module Federation      │
│  Responsibilities:                          │
│    - Domain-specific navigation             │
│    - Remote module loading & orchestration  │
│    - PortalContext → VisibilityContext      │
│    - Feature flag management                │
│    - CSS loading coordination               │
└──────────────┬──────────────────────────────┘
               │ loads (provides VisibilityContext)
               ▼
┌─────────────────────────────────────────────┐
│  Layer 3: Feature Remotes (This Repo)       │
│  Examples: apps/status, apps/overview       │
│  Technology: React + Module Federation      │
│  Responsibilities:                          │
│    - Business feature implementation        │
│    - Self-contained UI & logic              │
│    - Consume VisibilityContext              │
│    - Implement mount/unmount contract       │
└─────────────────────────────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────────────┐
│  Layer 4: Shared Libraries (This Repo)      │
│  Location: packages/context, packages/ui    │
│  Technology: React + TypeScript             │
│  Purpose: Shared code, no duplication       │
└─────────────────────────────────────────────┘
```

### Current Implementation

**Domain Shell (Host):**
- `apps/visibility` - Visibility domain orchestrator

**Feature Remotes:**
- `apps/status` - Status monitoring feature
- Future: `apps/overview`, `apps/details`, etc.

**Shared Libraries:**
- `packages/context` - Type definitions (PortalContext, VisibilityContext)
- `packages/ui` - Utilities (loadCss, deriveCssUrl, future UI components)

> **Important:** Remotes are plugins, not standalone apps. They assume a host exists and provides React runtime.

## Key Constraints

- Apps must not depend on other apps
- Domain shell must not manage auth
- Domain shell must not manage navigation
- This repo does not dictate Angular platform architecture but must integrate cleanly with it
- Shared libraries must not depend on apps or domain shells
- Shared libraries must not depend on each other
- CI pipelines must be declarative and reproducible
- CI pipelines delegate orchestration to Nx

## Non-Goals

- This system does not aim to support SSR
- This system does not optimize for static hosting
- This system does not support per-user UI forks

## Stability Boundaries

The following should be considered stable unless explicitly discussed:

- domain boundaries
- entitlement model
- CI phase structure

## Architectural Categories

Using Nx tags to enforce architectural boundaries. This supports dependency graph visualizations and linting rules and 
prevents accidental dependencies.

Projects are __tagged__ with the following architectural categories:

| Tag           | Meaning                                |
|---------------|----------------------------------------|
| type:shell    | Host / domain shells                   |
| type:feature  | MF remotes (gridview, quickview, etc.) |
| type:ui       | Shared UI components                   |
| type:state    | Shared state, platform context         |
| type:platform | Platform utilities                     |
| type:e2e      | E2E only                               |

> This is **intentionally** small and opinionated.
> View */project.json* files for exact tags.
> View {root}/.eslintrc.json for enforced dependency rules.

---

## Key Architectural Patterns

### 1. Module Federation Contract

**Every remote MUST implement this interface:**

```typescript
// apps/{remote}/src/{remote}.tsx
export async function mount(
  el: HTMLElement, 
  ctx?: VisibilityContext
): Promise<void>;

export function unmount(el?: HTMLElement): void;
```

**Why:** 
- Framework-agnostic integration
- Predictable lifecycle management
- Enables independent deployment

**Implementation Requirements:**
- Load CSS before rendering (`loadCss` from `@fedex/ui`)
- Use WeakMap for root management (prevents memory leaks)
- Wrap in VisibilityContextProvider
- Handle re-mounting gracefully

### 2. Context Propagation (Unidirectional)

```typescript
// Platform provides PortalContext
interface PortalContext {
  env: 'development' | 'staging' | 'production';
  user: { id: string; roles: string[] };
  locale: string;
}

// Domain shell enriches to VisibilityContext
interface VisibilityContext extends PortalContext {
  entitlements: string[];  // Domain-specific permissions
  rollout: 'current' | 'next' | string;  // Deployment strategy
  featureFlags?: Record<string, boolean | string | number>;
}
```

**Rules:**
- Context flows DOWN only (Platform → Domain → Remotes)
- Each layer can add properties but not remove
- Remotes consume context via `useVisibilityContext()` hook
- Never pass context up or sideways

### 3. Dual-Build System

**Shared Mode (Production - Default):**
```bash
BUILD_MODE=shared npx nx build {app}
```
- React externalized (portal provides)
- Output: ~6KB for visibility, ~2KB for status
- Best performance (single React instance)

**Standalone Mode (Testing/Fallback):**
```bash
BUILD_MODE=standalone npx nx build {app}
```
- React bundled
- Output: ~318KB per module
- Self-contained, no external dependencies

**Deploy Both:** Production deployments include both versions for flexibility.

### 4. Manifest-Based Remote Resolution

```json
// apps/visibility/public/remotes.manifest.json
{
  "remotes": {
    "status": {
      "current": "https://cdn.example.com/status/status.mjs",
      "next": "https://cdn.example.com/status-v2/status.mjs"
    }
  }
}
```

**Benefits:**
- No hardcoded URLs in code
- A/B testing support (current vs next)
- Environment-specific URLs
- Runtime remote discovery

### 5. CSS Loading Strategy

**All CSS loading MUST use `@fedex/ui` utilities:**

```typescript
import { loadCss, deriveCssUrl } from '@fedex/ui';

export async function mount(el: HTMLElement, ctx?: VisibilityContext) {
  // Load CSS before rendering
  await loadCss(deriveCssUrl(import.meta.url, { removeHash: true }))
    .catch(console.warn);
  
  // Then render React app
}
```

**Why:**
- Prevents duplicate CSS loading
- Handles production content hashing
- Works with module federation
- Consolidated, tested solution

---

## Dependency Rules

### Allowed Dependencies

```
┌─────────────────────────────────────┐
│ Dependency Direction: TOP → BOTTOM  │
├─────────────────────────────────────┤
│ Platform Shell (External)           │
│   ↓ can mount                       │
│ Domain Shell (apps/visibility)      │
│   ↓ can load                        │
│ Feature Remotes (apps/status, etc.) │
│   ↓ can use                         │
│ Shared Libraries (packages/*)       │
└─────────────────────────────────────┘
```

### Forbidden Dependencies

**❌ Cross-Remote Imports:**
```typescript
// apps/remoteA/src/somefile.ts
import { something } from '../../remoteB/...';  // FORBIDDEN
```

**❌ Remote → Domain Shell:**
```typescript
// apps/status/src/somefile.ts
import { something } from '../../visibility/...';  // FORBIDDEN
```

**❌ Shared Library → App:**
```typescript
// packages/ui/src/somefile.ts
import { something } from '../../apps/visibility/...';  // FORBIDDEN
```

**✅ Correct Approach:**
Share via `packages/*`:
```typescript
// packages/ui/src/lib/shared.ts
export function sharedUtility() { }

// Use in any app
import { sharedUtility } from '@fedex/ui';
```

---

## Build Modes & Outputs

### Development
```bash
npx nx serve visibility    # Port 4201
npx nx serve status        # Port 4202
```
- ESM modules with hot reload
- React provided via dedupe
- CSS loaded dynamically

### Production - Shared Mode (Recommended)
```bash
npm run ci:build:shared
```
**Output:**
- `dist/apps/visibility/` - Domain shell (~6KB)
- `dist/apps/status/` - Status remote (~2KB)
- React externalized (portal provides ~140KB once)

### Production - Standalone Mode (Fallback)
```bash
npm run ci:build:standalone
```
**Output:**
- `dist/apps/visibility-standalone/` - With React (~318KB)
- `dist/apps/status-standalone/` - With React (~318KB)
- Self-contained, no external dependencies

### Production - Both
```bash
npm run ci:build:all
```
Builds both modes for deployment flexibility.

---

## Testing Strategy

### Unit Tests
```bash
npx nx test {project}        # Test specific project
npx nx run-many -t test      # Test all projects
```

**Coverage:**
- Utility functions in `packages/ui` (loadCss, deriveCssUrl)
- Context hooks in `packages/context`
- Component logic

**Location:** `*.spec.ts` or `*.spec.tsx` files alongside source

### E2E Tests
```bash
npx nx e2e visibility-e2e    # Test visibility shell
npx nx e2e status-e2e        # Test status remote
```

**Coverage:**
- Remote loading and mounting
- Context propagation
- CSS loading
- User workflows

**Location:** `apps/{project}-e2e/src/*.spec.ts`

### Type Checking
```bash
npx nx run-many -t typecheck
```

**Enforces:**
- TypeScript strict mode
- No implicit any
- Proper type guards for dynamic imports

---

## Common Workflows

### Adding a New Remote

```bash
# 1. Generate app (lowercase name!)
npx nx generate @nx/react:app myremote --bundler=vite

# 2. Create mount contract in apps/myremote/src/myremote.tsx
# 3. Configure vite.config.mts with dual-build support
# 4. Update apps/visibility/public/remotes.manifest.json
# 5. Test: npx nx serve myremote
```

**See:** `docs/agent/agent-guidance.md` for complete example with code.

### Adding a Shared Utility

```bash
# 1. Add to packages/ui/src/lib/{utility}.ts
# 2. Export from packages/ui/src/index.ts
# 3. Add tests in packages/ui/src/lib/{utility}.spec.ts
# 4. Use in apps: import { utility } from '@fedex/ui';
```

### Updating Dependencies

```bash
# For specific app
npm install --workspace apps/visibility some-package

# For shared library
npm install --workspace packages/ui some-package

# For dev dependencies (root)
npm install -D some-package
```

---

## Key Constraints (Enforced)

### 1. Accessibility (MANDATORY)
All UI components MUST be WCAG 2.1 AA compliant:
- Semantic HTML required
- Keyboard navigation mandatory
- Focus management correct
- ARIA used appropriately
- Color alone cannot convey information

### 2. No Shared Mutable State (FORBIDDEN)
```typescript
// ❌ FORBIDDEN
window.__STORE__ = createStore();
const globalState = new Map();

// ✅ ALLOWED
<VisibilityContextProvider value={immutableContext}>
window.dispatchEvent(new CustomEvent('data-updated'));
```

### 3. Nx Naming (ENFORCED)
- ALL lowercase: ✅ `myremote`
- NO hyphens: ❌ `my-remote`
- NO camelCase: ❌ `myRemote`
- NO PascalCase: ❌ `MyRemote`

**Reason:** Prevents tooling conflicts with Nx, Vite, and module resolution.

### 4. CSS-in-JS (DISCOURAGED)
```typescript
// ❌ AVOID
const StyledDiv = styled.div`color: red;`;

// ✅ PREFER
import styles from './component.module.css';
<div className={styles.container} />
```

**Reason:** CSS Modules work better with module federation.

---

## Stability Boundaries

The following should be considered stable unless explicitly discussed:

- **Domain boundaries** - Remotes represent business domains
- **Entitlement model** - Capability-based, not tier-based
- **CI phase structure** - Declarative, delegates to Nx
- **Remote contract** - mount/unmount signature
- **Context hierarchy** - PortalContext → VisibilityContext

---

## Non-Goals

This system intentionally does NOT:

- ❌ Support server-side rendering (SSR)
- ❌ Optimize for static hosting (requires runtime module loading)
- ❌ Support per-user UI forks (use feature flags instead)
- ❌ Provide global state management across remotes
- ❌ Implement authentication (platform's responsibility)

---

## Related Documentation

- **[agent-guidance.md](./agent/agent-guidance.md)** - Comprehensive guide for AI agents
- **[engineering-principles.md](./engineering-principles.md)** - Development principles
- **[README.md](../README.md)** - Project overview

---

**Document Version:** 2.0  
**Architecture Score:** 8.5/10 (Production-Ready)  
**Last Review:** January 4, 2026  
**Next Review:** Quarterly or on significant architectural changes
