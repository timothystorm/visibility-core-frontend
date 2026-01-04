# Engineering Principles

**Version:** 2.0  
**Last Updated:** January 4, 2026

This document captures the **engineering principles and conventions** that guide how we build, test, and deploy this repository.

It is intentionally lightweight, opinionated, and focused on **decision-making** rather than step-by-step instructions.

These principles exist to:
- Reduce cognitive load
- Limit accidental complexity
- Improve diagnosability and resilience
- Allow the system to evolve without constant rework
- Enable effective AI-assisted development

---

## 1. General Philosophy

### Optimize for Clarity Over Cleverness

**Principle:** A solution that is easy to reason about is preferred over one that is maximally flexible or abstract.

**Examples:**

✅ **Clear:**
```typescript
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US');
}
```

❌ **Too Clever:**
```typescript
const formatDate = (d: Date) => 
  new Intl.DateTimeFormat('en-US', 
    Object.fromEntries(
      ['year', 'month', 'day'].map(k => [k, 'numeric'])
    )
  ).format(d);
```

**Guideline:** If a design requires significant explanation to understand, it should be reconsidered.

---

### Prefer Fewer, Stronger Abstractions

**Principle:** We aim for **a small number of well-defined abstractions** rather than many ad hoc patterns.

Each abstraction should:
- Have a clear owner (documented in code)
- Have a clear purpose (single responsibility)
- Reduce repetition rather than hide complexity
- Be reusable across multiple contexts

**Examples:**

✅ **Strong Abstraction:**
```typescript
// @fedex/ui - One CSS loading utility used everywhere
export function loadCss(url: string): Promise<void>
```

❌ **Weak Abstractions:**
```typescript
// Multiple implementations scattered across apps
// apps/visibility/utils/loadCSS.ts
// apps/status/utils/loadCss.ts
// apps/overview/utils/css-loader.ts
```

---

### Complexity Should Live in Tooling, Not Pipelines

**Principle:** CI/CD pipelines should describe **outcomes**, not **procedures**.

**Examples:**

✅ **Declarative (Outcome-Focused):**
```yaml
- name: Build Affected
  run: npx nx affected -t build
```

❌ **Imperative (Procedure-Focused):**
```yaml
- name: Build Apps
  run: |
    cd apps/visibility && npm run build
    cd apps/status && npm run build
    # ... repeated for each app
```

**Guideline:** Nx exists to encapsulate complexity. Pipelines should delegate work to Nx rather than reimplement logic.

---

## 2. Monorepo Principles (Nx)

### Single Source of Truth

**Principle:** Nx is the authority for dependency graphs, affected projects, and task orchestration.

**What This Means:**
- Don't duplicate dependency logic in CI pipelines
- Don't maintain separate lists of "affected" projects
- Trust Nx's dependency graph

**Examples:**

✅ **Correct:**
```bash
# Let Nx determine what's affected
npx nx affected -t build test lint
```

❌ **Wrong:**
```bash
# Manually maintaining list of changed apps
if [[ $CHANGED_FILES == *"apps/visibility"* ]]; then
  npx nx build visibility
fi
```

---

### Affected-First Mentality

**Principle:** All CI and CD workflows should prefer `nx affected` over hardcoded project lists.

**Benefits:**
- Keeps builds fast (only affected projects)
- Scales automatically (new projects work immediately)
- Reduces maintenance (no hardcoded lists)

**Examples:**

✅ **Affected-First:**
```bash
# Build only what changed
npx nx affected -t build

# Test only what's impacted
npx nx affected -t test

# Type check affected projects
npx nx affected -t typecheck
```

❌ **Avoid:**
```bash
# Building everything on every PR
npx nx run-many -t build -p visibility status overview
```

**When to Use `run-many`:** Only for release/deployment pipelines where you explicitly want all projects.

---

### Clear Boundaries

**Principle:** Architectural boundaries must be enforced by tooling, not convention alone.

**Dependency Rules:**
- Apps may depend on libraries ✅
- Libraries may depend on other libraries ✅
- Apps **must not** depend on other apps ❌

**Enforcement:**
- Nx tags define project types (`type:shell`, `type:feature`, `type:ui`)
- ESLint rules enforce dependency constraints
- Build fails if rules are violated

**Examples:**

✅ **Allowed:**
```typescript
// apps/status/src/app.tsx
import { useVisibilityContext } from '@fedex/context';  // ✅ App → Library
```

❌ **Forbidden:**
```typescript
// apps/status/src/app.tsx
import { something } from '../../visibility/...';  // ❌ App → App
```

**Validation:**
```bash
# Check for boundary violations
npx nx run-many -t lint
```

---

## 3. Micro-Frontend (Module Federation) Principles

### Platform vs Domain Responsibilities

**Principle:** We distinguish between platform concerns and domain concerns.

**Platform Shell (External - Angular):**
- Authentication
- Global navigation
- Entitlements
- React runtime provision

**Domain Shell (This Repo - apps/visibility):**
- Domain-specific navigation
- Feature orchestration
- Context enrichment
- Remote loading

**Feature Remotes (This Repo - apps/status, etc.):**
- Business feature implementation
- Self-contained UI
- Context consumption

**Why This Matters:** Platform concerns must not leak into domain shells. Authentication logic belongs in the platform, not in our codebase.

---

### Capability-Based Design

**Principle:** User experience is shaped by **capabilities**, not user tiers.

**What This Means:**
- Free and paid users share the same domain shell
- Additional value through capability-gated modules
- Progressive enrichment, not forked experiences

**Examples:**

✅ **Capability-Based:**
```typescript
function Dashboard() {
  const ctx = useVisibilityContext();
  const hasAdvancedFeatures = ctx.entitlements.includes('feature:advanced');
  
  return (
    <>
      <BasicDashboard />
      {hasAdvancedFeatures && <AdvancedAnalytics />}
    </>
  );
}
```

❌ **Tier-Based:**
```typescript
// Don't create separate apps for different tiers
// apps/visibility-free/
// apps/visibility-paid/
```

**Benefit:** Single codebase, easier testing, consistent UX.

---

### Explicit Contracts Between Shells

**Principle:** Shells and federated modules communicate through explicit, versioned contracts.

**The Contract:**
```typescript
// Every remote MUST implement this
export async function mount(el: HTMLElement, ctx?: VisibilityContext): Promise<void>;
export function unmount(el?: HTMLElement): void;
```

**Communication Methods (Allowed):**
1. **Context Props** - Immutable data passed down
2. **Shared Libraries** - `@fedex/context`, `@fedex/ui`
3. **Custom DOM Events** - For cross-remote communication (when unavoidable)

**Communication Methods (Forbidden):**
- ❌ Global mutable state (`window.__STATE__`)
- ❌ Shared Redux/Zustand stores
- ❌ Direct function calls between remotes

---

## 4. CI/CD Principles

### Conceptual Phase Limit

**Principle:** CI pipelines should be explainable in **5–7 conceptual phases**.

**Typical Phases:**
1. **Environment Setup** - Checkout code, setup Node
2. **Dependency Installation** - npm ci
3. **Affected Calculation** - Determine what changed
4. **Quality Gates** - Lint, test, typecheck
5. **Build** - Build affected projects
6. **Package** - Create artifacts
7. **Deploy** - Deploy to environment (CD only)

**Why:** If a pipeline exceeds this, it's likely doing too much or has redundant steps.

---

### When to Add a Pipeline Step

**Principle:** A new CI/CD step should only be added if it:

1. **Introduces a unique failure mode** - Catches errors others don't
2. **Cannot be expressed as an Nx target** - Not duplicating Nx functionality
3. **Provides clear, independent value** - Justifiable on its own

**Examples:**

✅ **Add Step:**
```yaml
# Validates manifest format (unique check)
- name: Validate Manifest
  run: node scripts/validate-manifest.js
```

❌ **Don't Add Step:**
```yaml
# Duplicates 'nx typecheck'
- name: Check Types
  run: tsc --noEmit
```

**Guideline:** Steps that exist "for safety" without clear ownership or explanation are a maintenance risk.

---

### Diagnosability Over Exhaustiveness

**Principle:** A smaller number of well-scoped checks is preferred over many overlapping ones.

**Why:** When a pipeline fails, the reason should be obvious without re-running the job.

**Examples:**

✅ **Diagnosable:**
```yaml
- name: Type Check
  run: npx nx affected -t typecheck
  # Clear: type errors in affected projects

- name: Lint
  run: npx nx affected -t lint
  # Clear: linting errors in affected projects
```

❌ **Overlapping:**
```yaml
- name: Check Everything
  run: |
    npm run validate
    npm run check-all
    npm run quality-gates
    npm run verify
  # Unclear: which check failed?
```

---

## 5. Testing & Quality

### Tests Should Match Risk

**Principle:** Not every change requires every type of test.

**Test Types:**
- **Unit Tests** - Protect logic (pure functions, utilities)
- **Integration Tests** - Protect contracts (component + context)
- **E2E Tests** - Protect workflows (user journeys)

**Examples:**

**Low Risk (Utility Function):**
```typescript
// Only needs unit test
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}
```

**Medium Risk (Component with Context):**
```typescript
// Needs unit + integration test
function Dashboard() {
  const ctx = useVisibilityContext();
  // ...
}
```

**High Risk (User Workflow):**
```typescript
// Needs unit + integration + E2E
// Remote loading, mounting, navigation
```

---

### Fast Feedback First

**Principle:** Short-running checks should fail early. Long-running checks should be scoped.

**Execution Order:**
1. **Lint** (~10s) - Fails fast
2. **Type Check** (~30s) - Catches type errors
3. **Unit Tests** (~1-2min) - Logic validation
4. **Build** (~2-3min) - Compilation
5. **E2E Tests** (~5-10min) - Full workflows

**Scoping:**
```bash
# Only test affected projects
npx nx affected -t test

# Not everything every time
npx nx run-many -t test  # Use sparingly
```

---

## 6. Code Quality & Maintainability

### Type Safety is Non-Negotiable

**Principle:** TypeScript strict mode is always enabled. Runtime type guards are required for dynamic imports.

**Rules:**
- ✅ `strict: true` in tsconfig
- ✅ Runtime type guards for module loading
- ✅ No `any` without justification
- ❌ Never use `@ts-ignore` without explanation

**Example:**
```typescript
// ✅ Correct: Runtime validation
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
  throw new Error('Invalid module');
}
```

---

### Accessibility is a Requirement

**Principle:** All UI must be WCAG 2.1 AA compliant by default.

**Non-Negotiable Rules:**
- Semantic HTML required
- Keyboard navigation mandatory
- Focus management correct
- Color alone cannot convey information

**Enforcement:**
- Manual testing during development
- E2E tests include keyboard navigation
- Code reviews check accessibility

---

### Share, Don't Duplicate

**Principle:** Common utilities belong in `packages/*`, not copied across apps.

**Decision Tree:**
```
Is this utility used in multiple apps?
├─ Yes → Add to packages/ui or packages/context
└─ No → Keep in app-specific utils/
```

**Examples:**

✅ **Shared:**
```typescript
// packages/ui/src/lib/formatDate.ts
export function formatDate(date: Date): string { }

// Use in any app
import { formatDate } from '@fedex/ui';
```

❌ **Duplicated:**
```typescript
// apps/visibility/utils/format.ts
export function formatDate(date: Date): string { }

// apps/status/utils/format.ts
export function formatDate(date: Date): string { }  // Duplicate!
```

---

## 7. Documentation & Decision Records

### Documentation Lives With the Code

**Principle:** Engineering decisions should be captured in versioned documents.

**Required Documentation:**
- `docs/architectural-context.md` - Architecture overview
- `docs/engineering-principles.md` - This document
- `docs/agent/agent-guidance.md` - AI agent guidance
- `docs/adr/` - Architecture Decision Records (for significant decisions)

**Why:** Avoid unversioned wikis for critical engineering context. Documentation should evolve with code.

---

### Change the Rules Deliberately

**Principle:** If a contribution requires breaking or bending these principles:

1. **Document the reason** - Why is this necessary?
2. **Update this file** - Keep principles current
3. **Explain the tradeoff** - What do we gain/lose?

**Process:**
1. Propose change in PR description
2. Update engineering-principles.md
3. Get team review
4. Document in ADR if significant

**Why:** Principles should evolve, but never accidentally.

---

## 8. Guiding Questions

Before introducing a new pattern, tool, or process, ask:

1. **Does this reduce or increase cognitive load?**
   - Can a new developer understand this in a week?

2. **Does this make failures easier or harder to diagnose?**
   - Will error messages be clear?

3. **Does this align with Nx's strengths or work around them?**
   - Are we fighting the tool?

4. **Is this solving a problem we actually have?**
   - Or are we over-engineering?

5. **Can this be explained in 2 sentences?**
   - If not, it might be too complex.

---

## 9. Decision Framework

### When to Add a New Dependency

**Questions:**
1. Does it solve a problem we can't reasonably solve ourselves?
2. Is it actively maintained (commits in last 6 months)?
3. Does it have < 10 transitive dependencies?
4. Is it compatible with our ESM module federation setup?

**If Yes to All:** Proceed  
**If No to Any:** Reconsider or discuss with team

---

### When to Create a New Package

**Questions:**
1. Is this code used by 2+ apps?
2. Does it have a clear, single responsibility?
3. Can it be versioned independently?
4. Would it benefit from separate testing?

**If Yes to All:** Create package  
**If No:** Keep in app-specific code

---

### When to Break a Principle

**Valid Reasons:**
- Urgent production issue requiring hotfix
- External dependency forces our hand
- Performance/security critical need
- Temporary technical debt with plan to resolve

**Invalid Reasons:**
- "It's faster this way"
- "Just this once"
- "The old way was confusing"

**Process:**
1. Document exception in code comments
2. Create issue to resolve properly
3. Link issue in PR description
4. Get explicit team approval

---

## 10. Code Review Checklist

Reviewers should verify:

- [ ] Follows architectural boundaries (no app→app dependencies)
- [ ] Uses shared utilities from `@fedex/*` (no duplication)
- [ ] Implements remote contract correctly (mount/unmount)
- [ ] Includes appropriate tests (unit/integration/E2E)
- [ ] Accessibility requirements met (WCAG 2.1 AA)
- [ ] Type safety maintained (no unchecked `any`)
- [ ] CSS loaded via `@fedex/ui` utilities
- [ ] Nx naming rules followed (lowercase, no hyphens)
- [ ] Documentation updated if architecture changed

---

## Closing Note

These principles are not meant to block progress.
They exist to **protect long-term velocity** and **reduce operational risk** as the system grows.

When in doubt, prefer the solution that future engineers will thank you for.

**Remember:**
- Clarity > Cleverness
- Fewer, stronger abstractions
- Tooling handles complexity
- Boundaries are enforced, not suggested
- Tests match risk
- Documentation lives with code

---

**Document Version:** 2.0  
**Last Updated:** January 4, 2026  
**Next Review:** Quarterly or when principles are challenged

**Related Documents:**
- [architectural-context.md](./architectural-context.md) - System architecture
- [agent-guidance.md](./agent/agent-guidance.md) - AI agent guidance
- [ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md) - Detailed assessment
