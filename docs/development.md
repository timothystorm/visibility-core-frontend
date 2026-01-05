# Development Guide

**Version:** 2.0  
**Last Updated:** January 4, 2026  
**Purpose:** Opinionated day-to-day development workflow

This guide covers the **practical, day-to-day workflows** for developing in this repository. It assumes you've read [architectural-context.md](./architectural-context.md) and [engineering-principles.md](./engineering-principles.md).

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Development Modes](#development-modes)
3. [Testing Strategy](#testing-strategy)
4. [Code Quality](#code-quality)
5. [Branching & Deployment](#branching--deployment)
6. [Pre-commit Hooks](#pre-commit-hooks)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Start

### First Time Setup

```bash
# Clone repository
git clone <repository-url>
cd visibility-core-frontend

# Install dependencies
npm ci

# Verify everything works
npx nx run-many -t build test lint
```

**Expected:** All projects build, all tests pass, no lint errors.

---

## Development Modes

### Mode 1: Individual Remote Development (Most Common)

**Use When:** Working on a single feature remote.

```bash
# Develop the status remote
npx nx serve status

# Visit: http://localhost:4202
```

**What You See:**
- ✅ Your remote running in isolation
- ✅ Hot reload on code changes
- ✅ Fast feedback loop (~1-2s)
- ✅ Console logs from your code only

**What You DON'T See:**
- ❌ Domain shell integration
- ❌ Context from portal
- ❌ Other remotes

**When to Use:**
- Building new components
- Fixing bugs in isolation
- Unit testing with live reload
- Rapid iteration

**Pro Tip:** Add test context in `apps/status/src/main.tsx`:
```typescript
if (import.meta.env.DEV) {
  const mockContext: VisibilityContext = {
    env: 'development',
    user: { id: 'dev-user', roles: ['admin'] },
    locale: 'en-US',
    entitlements: ['feature:status', 'feature:advanced'],
    rollout: 'current',
    featureFlags: { 'new-ui': true }
  };
  
  const el = document.getElementById('root');
  if (el) mount(el, mockContext);
}
```

---

### Mode 2: Domain Shell Integration (Integration Testing)

**Use When:** Testing how your remote works within the domain shell.

```bash
# Terminal 1: Run your remote
npx nx serve status

# Terminal 2: Run domain shell
npx nx serve visibility

# Visit: http://localhost:4201
```

**What You See:**
- ✅ Your remote loaded by visibility shell
- ✅ Actual context propagation
- ✅ Remote loading/mounting behavior
- ✅ Navigation between routes

**When to Use:**
- Testing context consumption
- Verifying remote contract (mount/unmount)
- Testing CSS loading
- Integration before PR

**Pro Tip:** Navigate to `/status` in visibility to see your remote.

---

### Mode 3: Production Preview (Pre-Deployment)

**Use When:** Testing production build locally.

```bash
# Build your remote
npx nx build status

# Preview production build
npx nx preview status

# Visit: http://localhost:4202/status.mjs
```

**What You See:**
- ✅ Production-optimized build
- ✅ Minified code
- ✅ Content hashing
- ✅ Actual module federation behavior

**When to Use:**
- Before creating PR
- Verifying bundle sizes
- Testing production CSS loading
- Smoke testing before deployment

**Pro Tip:** Check bundle size:
```bash
ls -lh dist/apps/status/*.mjs
# Should be ~2KB for status (shared mode)
```

---

### Mode 4: Full System Integration (Rare)

**Use When:** Testing entire system with surrogate portal.

```bash
# Starts everything: portal + visibility + all remotes
npx nx run @fedex/dev-portal:preview:all

# Visit: http://localhost:4200
```

**What You See:**
- ✅ Surrogate portal (mimics enterprise portal)
- ✅ Visibility shell mounted
- ✅ All remotes available
- ✅ Production-like environment

**When to Use:**
- Testing portal integration
- Verifying PortalContext → VisibilityContext flow
- E2E testing before production
- Demoing to stakeholders

**Performance Note:** Slow to start. Use only when necessary.

---

## Testing Strategy

### When to Test

#### Before Every Commit (Local)
```bash
# Quick checks (runs in ~30s)
npx nx affected -t lint typecheck

# Run affected tests
npx nx affected -t test
```

**Rule:** If `nx affected` says something is affected, test it.

#### Before Creating PR
```bash
# Full affected checks
npx nx affected -t lint typecheck test build

# If all pass, create PR
```

**Rule:** Never create PR with failing tests or lint errors.

#### After PR Approval, Before Merge
```bash
# Final check (CI will do this too)
npx nx affected -t lint typecheck test build
```

**Rule:** Rebase on main, verify everything still passes.

---

### How to Test

#### Unit Tests (Fast Feedback)
```bash
# Test specific project with watch mode
npx nx test status --watch

# Test single file
npx nx test status --testFile=loadCss.spec.ts

# Test with coverage
npx nx test ui --coverage
```

**When to Run:**
- While developing utilities
- After refactoring logic
- When TDD (test-driven development)

**Coverage Target:** 80%+ for `packages/*`, 60%+ for `apps/*`

---

#### Integration Tests (Component + Context)
```bash
# Run component tests
npx nx test status

# Check specific integration
npx nx test status --testFile=app.spec.tsx
```

**When to Run:**
- After changing context consumption
- Before committing component changes
- When testing hooks (useVisibilityContext)

---

#### E2E Tests (Full Workflows)
```bash
# Run E2E for specific app
npx nx e2e visibility-e2e

# Run in headed mode (see browser)
npx nx e2e visibility-e2e --headed

# Debug mode
npx nx e2e visibility-e2e --debug
```

**When to Run:**
- Before creating PR (if affected)
- After major remote changes
- Before production deployment

**Note:** E2E tests are slow (~5-10 min). Run only when necessary.

---

## Code Quality

### Linting

#### Run Linter
```bash
# Lint affected projects (fast)
npx nx affected -t lint

# Lint specific project
npx nx lint status

# Lint with auto-fix
npx nx lint status --fix
```

**When to Run:**
- Before every commit
- After adding new code
- Before creating PR

**Auto-Fix Tips:**
```bash
# Fix formatting issues
npx nx lint status --fix

# If lint fails, check the output:
# - Import order issues → auto-fixable
# - Unused variables → remove them
# - Accessibility issues → fix manually
```

---

### Type Checking

```bash
# Type check affected
npx nx affected -t typecheck

# Type check specific project
npx nx run status:typecheck

# Watch mode for continuous checking
npx nx run status:typecheck --watch
```

**When to Run:**
- While developing (watch mode)
- Before commit
- After changing types

**Common Issues:**
```typescript
// ❌ Missing type
const data = await fetch(url);

// ✅ With type
const data: RemoteModule = await fetch(url);

// ✅ With type guard
if (!isRemoteModule(data)) throw new Error('Invalid');
```

---

### Build Verification

```bash
# Build affected projects
npx nx affected -t build

# Build specific project
npx nx build status

# Build both modes
BUILD_MODE=shared npx nx build status
BUILD_MODE=standalone npx nx build status
```

**When to Run:**
- Before creating PR
- After dependency changes
- Before deployment

**Expected Output:**
- Shared: `dist/apps/status/` (~2KB)
- Standalone: `dist/apps/status-standalone/` (~318KB)

---

## Branching & Deployment

### GitLab Flow (Recommended)

```
main (production)
  ↓ create feature branch
feature/add-status-filters
  ↓ development work
  ↓ create PR
  ↓ review & approval
  ↓ merge to main
main (deploy to production)
```

**No separate develop/staging branches.** Use feature flags for gradual rollouts.

---

### Branch Naming Convention

**Format:** `{type}/{description}`

**Types:**
- `feature/` - New feature or enhancement
- `fix/` - Bug fix
- `refactor/` - Code refactoring (no functional change)
- `docs/` - Documentation only
- `chore/` - Maintenance (deps, config)

**Examples:**
```bash
✅ feature/add-export-button
✅ fix/status-loading-error
✅ refactor/extract-date-utils
✅ docs/update-readme
✅ chore/upgrade-react-19

❌ my-changes (too vague)
❌ FEAT-123 (use description, not ticket)
❌ john-dev (use type/description)
```

---

## Pre-commit Hooks

### Overview

This repository uses **Husky** to automatically run quality checks before every commit. This ensures code quality and catches issues early.

**What runs automatically:**
1. 📝 **Lint** - ESLint on affected projects
2. 🔎 **Type check** - TypeScript on affected projects
3. 🧪 **Tests** - Vitest on affected projects

**Key Features:**
- ✅ Only checks **affected** projects (fast!)
- ✅ Uses Nx caching for speed
- ✅ Helpful error messages with suggestions
- ✅ Can be skipped when necessary (use sparingly)

---

### What Runs on Commit

Every commit automatically runs:
```bash
npx nx affected -t lint typecheck test --base=HEAD~1
```

**Baseline:** Compared against `HEAD~1` (last commit)

**Smart Detection:**
- First commit: Uses `--all` automatically
- Regular commits: Uses `HEAD~1`
- Only affected projects are checked

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Running pre-commit checks...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Baseline: HEAD~1 (comparing to last commit)

📝 Linting affected projects...
✓ @fedex/status
✓ @fedex/ui

🔎 Type checking affected projects...
✓ @fedex/status
✓ @fedex/ui

🧪 Testing affected projects...
✓ @fedex/status (2 tests)
✓ @fedex/ui (8 tests)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All pre-commit checks passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Performance

**Typical times:**

| Change Size | Projects | Time |
|-------------|----------|------|
| Small (1 file) | 1 | ~10-15s |
| Medium (3-5 files) | 2-3 | ~30-45s |
| Large (10+ files) | 5+ | ~60-120s |

**Nx caching makes subsequent runs faster (2-5x speedup).**

---

### Manual Pre-commit Check

Run checks manually without committing:

```bash
# Run what the hook runs (affected only)
npm run precommit

# Check all projects (not just affected)
npm run ci:precommit:all

# Auto-fix lint issues
npm run lint:fix
```

---

### Skipping Hooks

**⚠️ Use sparingly! Only skip when absolutely necessary.**

#### When to Skip

**Valid Reasons:**
- WIP commits (will be fixed before PR)
- Emergency hotfixes (fix in follow-up commit)
- Documentation-only changes (if tests are slow)

**Invalid Reasons:**
- ❌ "Tests are failing" - Fix the tests!
- ❌ "Too slow" - This is by design
- ❌ "Just this once" - No exceptions

#### How to Skip

**Method 1: --no-verify flag**
```bash
git commit --no-verify -m "WIP: work in progress"
```

**Method 2: Environment variable**
```bash
HUSKY=0 git commit -m "WIP: work in progress"
```

**Method 3: Package.json script (for documentation)**
```bash
# Not recommended, but documented for awareness
git commit --no-verify -m "docs: update README"
```

---

### Troubleshooting Hooks

#### Hook Not Running

**Problem:** Commits succeed without running checks.

**Solution:**
```bash
# Reinstall Husky
npm run prepare

# Verify hook exists
ls -la .husky/pre-commit

# Check if executable
chmod +x .husky/pre-commit
```

---

#### "HEAD~1 does not exist" Error

**Problem:** First commit in branch has no parent.

**Solution:** This is handled automatically now. The hook detects first commit and uses `--all` instead.

---

#### Tests Taking Too Long

**Problem:** Commits take >2 minutes due to tests.

**Options:**

**Option 1: Use watch mode during development**
```bash
# Run tests continuously while developing
npx nx test status --watch

# Commit with confidence (tests already passing)
git commit -m "feat: add feature"
```

**Option 2: Remove tests from pre-commit** (not recommended)

Edit `.husky/pre-commit` and remove the test section. However, this is not recommended as it reduces safety.

**Option 3: Skip tests for WIP commits**
```bash
# WIP commit without tests
git commit --no-verify -m "WIP: add feature"

# Later, when feature is complete
git commit --amend --no-edit  # Runs full checks
```

---

#### Nx Cache Issues

**Problem:** Checks pass locally but fail in CI.

**Solution:**
```bash
# Clear Nx cache and rerun
nx reset
npx nx affected -t lint typecheck test --base=HEAD~1

# If still failing, skip cache
npx nx affected -t lint typecheck test --base=HEAD~1 --skip-nx-cache
```

---

#### Lint Failures

**Problem:** Lint fails with fixable errors.

**Auto-fix:**
```bash
# Fix lint issues automatically
npm run lint:fix

# Or manually
npx nx affected -t lint --base=HEAD~1 --fix

# Then commit
git add .
git commit -m "fix: correct lint errors"
```

**Common lint errors:**
- Import order - Auto-fixable ✅
- Unused variables - Remove them
- Missing semicolons - Auto-fixable ✅
- Accessibility issues - Fix manually

---

### Hook Configuration

**Location:** `.husky/pre-commit`

**Current Configuration:**
```bash
# Runs on every commit
npx nx affected -t lint --base=HEAD~1
npx nx affected -t typecheck --base=HEAD~1
npx nx affected -t test --base=HEAD~1
```

**To modify:**
1. Edit `.husky/pre-commit`
2. Test: `npm run precommit`
3. Commit changes to `.husky/pre-commit`

**Example modifications:**

**Remove tests from pre-commit:**
```bash
# Only lint and typecheck
npx nx affected -t lint typecheck --base=HEAD~1
```

**Change baseline:**
```bash
# Compare against main branch
npx nx affected -t lint typecheck test --base=origin/main
```

---

### Best Practices with Hooks

#### 1. Commit Often

Don't wait until end of day. Commit logical chunks:
```bash
git commit -m "feat: add filter UI"
# Hooks run (~15s)

git commit -m "feat: add filter logic"
# Hooks run (~15s)

git commit -m "test: add filter tests"
# Hooks run (~15s)
```

**Total:** ~45s spread across day vs. 45s at end of day.

---

#### 2. Use Watch Mode

Keep tests running while developing:
```bash
# Terminal 1: Dev server
npx nx serve status

# Terminal 2: Test watch
npx nx test status --watch

# Terminal 3: Git commands
git commit -m "..."  # Fast, tests already passing
```

---

#### 3. Fix Issues Before Committing

Don't try to commit with failing checks:
```bash
# ❌ Wrong approach
git commit -m "feat: add feature"
# Fails... skip hooks
git commit --no-verify -m "feat: add feature"

# ✅ Right approach
git commit -m "feat: add feature"
# Fails... fix issues
npm run lint:fix
# Fix tests
git add .
git commit -m "feat: add feature"  # Now passes
```

---

#### 4. Understand What's Affected

Check what will run before committing:
```bash
# Preview affected projects
npx nx affected:graph

# Or list them
npx nx print-affected --base=HEAD~1

# Then commit knowing what will be checked
git commit -m "feat: add feature"
```

---

### CI/CD Integration

**Pre-commit hooks ≠ CI checks**

**Pre-commit (Local):**
- Fast feedback
- Affected projects only
- Catches obvious issues

**CI (Remote):**
- Comprehensive checks
- All projects (or larger scope)
- Build verification
- E2E tests
- Deployment

**Both are important:**
- Hooks catch issues before push
- CI catches integration issues
- Together ensure code quality

---

### Husky Setup (For Reference)

**Already configured! This is for documentation purposes.**

If you need to set up Husky from scratch:

```bash
# 1. Install dependencies
npm install -D husky lint-staged

# 2. Initialize Husky
npx husky init

# 3. Create pre-commit hook
# Edit .husky/pre-commit with desired checks

# 4. Add scripts to package.json
npm pkg set scripts.prepare="husky"
npm pkg set scripts.precommit="npx nx affected -t lint typecheck test --base=HEAD~1"

# 5. Test
npm run precommit
```

---

### Development Workflow

#### 1. Start New Work
```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/add-filters

# Make changes
# ... code code code ...

# Run checks locally
npx nx affected -t lint typecheck test
```

---

#### 2. Commit Changes
```bash
# Stage changes
git add .

# Commit with clear message
git commit -m "feat: add status filters

- Add filter UI component
- Add filter state management
- Add tests for filter logic

Closes #123"
```

**Commit Message Format:**
```
{type}: {description}

{optional body}

{optional footer}
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `test:` - Test changes
- `chore:` - Maintenance

**Examples:**
```bash
✅ feat: add export to CSV feature
✅ fix: correct date formatting in status view
✅ refactor: extract loadCss to @fedex/ui
✅ docs: update development guide
✅ test: add unit tests for formatDate
✅ chore: upgrade to React 19
```

---

#### 3. Create Pull Request

**Before Creating PR:**
```bash
# Ensure you're up to date
git checkout main
git pull origin main
git checkout feature/add-filters
git rebase main

# Run full affected checks
npx nx affected -t lint typecheck test build

# If all pass, push
git push origin feature/add-filters
```

**PR Title Format:**
```
{type}: {clear description}
```

**PR Description Template:**
```markdown
## What
Brief description of changes.

## Why
Why this change is needed.

## How
How you implemented it.

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manually tested in dev mode
- [ ] Manually tested in preview mode

## Checklist
- [ ] Follows architectural boundaries
- [ ] Uses shared utilities (no duplication)
- [ ] Implements remote contract correctly
- [ ] Accessibility requirements met
- [ ] Type safety maintained
- [ ] CSS loaded via @fedex/ui
- [ ] Documentation updated
```

---

#### 4. Code Review Process

**For Author:**
1. Create PR with clear description
2. Ensure CI passes (all checks green)
3. Address review comments promptly
4. Keep commits focused and atomic

**For Reviewer:**
Use [Code Review Checklist](./engineering-principles.md#10-code-review-checklist):
- [ ] Architectural boundaries respected
- [ ] No code duplication
- [ ] Remote contract correct
- [ ] Tests included
- [ ] Accessibility met
- [ ] Types correct
- [ ] CSS via @fedex/ui

**Approval:** Requires 1+ approvals before merge.

---

#### 5. Merge to Main

**After Approval:**
```bash
# Rebase on latest main
git checkout main
git pull origin main
git checkout feature/add-filters
git rebase main

# Verify still works
npx nx affected -t lint typecheck test build

# If all pass, push
git push origin feature/add-filters --force-with-lease

# Merge via GitLab UI (squash or rebase)
```

**Merge Strategy:** Use **Squash Merge** to keep main history clean.

---

#### 6. Deployment to Production

**After Merge:**
1. CI builds both shared and standalone versions
2. CI deploys to CDN:
   - `https://cdn.example.com/status/` (shared)
   - `https://cdn.example.com/status-standalone/` (standalone)
3. Update manifest if needed
4. Portal team picks up changes

**Deployment is Automatic.** No manual steps required.

**Rollback:** Update manifest to point to previous version.

---

## Troubleshooting

### Common Issues

#### Issue: "React Hook called outside of component"

**Cause:** Using hooks in non-component files.

**Fix:**
```typescript
// ❌ Wrong
export const data = useVisibilityContext();

// ✅ Correct
export function useData() {
  return useVisibilityContext();
}
```

---

#### Issue: "CSS not loading in production"

**Cause:** Not using @fedex/ui utilities.

**Fix:**
```typescript
// ❌ Wrong
import './styles.css';

// ✅ Correct
import { loadCss, deriveCssUrl } from '@fedex/ui';
await loadCss(deriveCssUrl(import.meta.url, { removeHash: true }));
```

---

#### Issue: "Module not found" in production

**Cause:** Hardcoded URL instead of using manifest.

**Fix:**
```typescript
// ❌ Wrong
const url = 'http://localhost:4202/status.mjs';

// ✅ Correct
const manifest = await loadRemoteManifest();
const url = manifest.remotes.status.current;
```

---

#### Issue: "nx affected" shows nothing

**Cause:** No changes detected relative to base.

**Fix:**
```bash
# Show what Nx sees
npx nx affected:graph

# Force run on specific project
npx nx run status:test

# Check base comparison
npx nx print-affected --base=main
```

---

#### Issue: Build fails with "Cannot find module"

**Cause:** Missing dependency or incorrect import path.

**Fix:**
```bash
# Check if dependency is installed
npm ls react

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check import path
# ❌ import { x } from '../../../packages/ui';
# ✅ import { x } from '@fedex/ui';
```

---

## Best Practices

### Daily Development Routine

#### Morning Checklist
```bash
# 1. Update main branch
git checkout main
git pull origin main

# 2. Check if anything is broken
npx nx run-many -t typecheck lint

# 3. Start work on feature branch
git checkout -b feature/my-work
```

---

#### While Developing
```bash
# Run in watch mode for fast feedback
npx nx serve status

# In another terminal, run tests in watch mode
npx nx test status --watch

# Check types continuously
npx nx run status:typecheck --watch
```

**Pro Tip:** Use 3 terminal tabs:
1. `npx nx serve status` - Dev server
2. `npx nx test status --watch` - Tests
3. `git status` - Git commands

---

#### Before Committing
```bash
# 1. Run affected checks
npx nx affected -t lint typecheck test

# 2. If all pass, stage and commit
git add .
git commit -m "feat: add feature X"

# 3. Push when ready
git push origin feature/my-work
```

---

### Performance Tips

#### Use Affected Commands
```bash
# ✅ Fast - only tests affected projects
npx nx affected -t test

# ❌ Slow - tests everything
npx nx run-many -t test
```

**Saves:** 5-10 minutes on every run.

---

#### Use Nx Cache
```bash
# Nx caches results automatically
# First run: ~2 min
npx nx test ui

# Second run: ~2 sec (cached)
npx nx test ui
```

**Pro Tip:** Don't skip cache with `--skip-nx-cache` unless debugging.

___

### Nx Caching

#### Local Caching (Enabled by Default)

Nx automatically caches task outputs locally:

```bash
# First run - executes fully
npx nx build visibility

# Second run - instant (from cache)
npx nx build visibility
```

---

#### Scope E2E Tests
```bash
# ✅ Run only affected E2E
npx nx affected -t e2e

# ❌ Don't run all E2E on every change
npx nx run-many -t e2e
```

---

### Code Organization Tips

#### Keep Remotes Isolated
```typescript
// ❌ Don't import from other remotes
import { x } from '../../visibility/...';

// ✅ Share via packages
import { x } from '@fedex/ui';
```

---

#### Organize by Feature
```
apps/status/src/
├── status.tsx              # Mount contract
├── status.css             # Global styles
└── app/
    ├── app.tsx            # Root component
    ├── components/        # Feature components
    │   ├── StatusGrid/
    │   ├── StatusFilters/
    │   └── StatusDetails/
    ├── hooks/             # Custom hooks
    │   ├── useStatusData.ts
    │   └── useFilters.ts
    └── utils/             # App-specific utils
        └── formatters.ts
```

---

#### Share Common Code
```
packages/ui/src/lib/
├── loadCss.ts           # CSS utilities
├── formatDate.ts        # Date utilities
└── components/          # Shared components (future)
    └── Button/
```

---

### Git Best Practices

#### Commit Often, Push Daily
```bash
# Make small, focused commits
git commit -m "feat: add filter UI"
git commit -m "feat: add filter logic"
git commit -m "test: add filter tests"

# Push at end of day
git push origin feature/add-filters
```

---

#### Write Clear Commit Messages
```bash
# ✅ Good
git commit -m "fix: correct date formatting in status view

The date was showing in UTC instead of local timezone.
Now uses toLocaleDateString() with user's locale."

# ❌ Bad
git commit -m "fix stuff"
git commit -m "wip"
git commit -m "updates"
```

---

#### Keep Branches Short-Lived
- **Goal:** Merge within 1-3 days
- **Max:** 1 week before rebasing on main
- **Large features:** Break into smaller PRs

---

### Testing Best Practices

#### Test Pyramid
```
       E2E (Few)
      /         \
 Integration (Some)
/                    \
Unit Tests (Many)
```

**Guidelines:**
- Unit: 80% of tests
- Integration: 15% of tests
- E2E: 5% of tests

---

#### What to Test

**Always Test:**
- Public utility functions
- Context hooks
- Business logic

**Sometimes Test:**
- Component rendering (if complex)
- Integration scenarios
- User workflows

**Don't Test:**
- Third-party libraries
- Simple getters/setters
- Framework internals

---

### Accessibility in Development

#### Check While Developing
```bash
# 1. Use keyboard only - can you navigate?
Tab, Shift+Tab, Enter, Escape, Arrow keys

# 2. Use screen reader (VoiceOver on Mac)
Cmd+F5 to enable

# 3. Check color contrast
Use browser DevTools
```

#### Common Fixes
```typescript
// ✅ Add labels to inputs
<label htmlFor="filter">Filter:</label>
<input id="filter" type="text" />

// ✅ Add alt text to images
<img src="icon.png" alt="Status indicator" />

// ✅ Use semantic HTML
<button onClick={handleClick}>Submit</button>  // Not <div>

// ✅ Add ARIA when needed
<div role="dialog" aria-labelledby="title">
  <h2 id="title">Confirm Action</h2>
</div>
```

---

## Quick Command Reference

### Development
```bash
npx nx serve {app}                    # Dev server
npx nx preview {app}                  # Production preview
npx nx run @fedex/dev-portal:preview:all  # Full system
```

### Testing
```bash
npx nx test {app}                     # Run tests
npx nx test {app} --watch             # Watch mode
npx nx e2e {app}-e2e                  # E2E tests
npx nx affected -t test               # Test affected
```

### Quality
```bash
npx nx lint {app}                     # Lint
npx nx lint {app} --fix               # Auto-fix
npx nx run {app}:typecheck            # Type check
npx nx affected -t lint typecheck     # Affected checks
```

### Building
```bash
npx nx build {app}                    # Build
BUILD_MODE=shared npx nx build {app}  # Shared mode
BUILD_MODE=standalone npx nx build {app}  # Standalone
npm run ci:build:all                     # Both modes
```

### Git
```bash
git checkout -b feature/{name}        # New branch
git add .                             # Stage all
git commit -m "type: description"    # Commit
git push origin feature/{name}        # Push
```

---

## Summary: Perfect Day Workflow

```bash
# Morning: Update and verify
git checkout main && git pull
npx nx affected -t lint typecheck

# Start feature
git checkout -b feature/my-feature

# Develop (3 terminals)
# Terminal 1: Dev server
npx nx serve status

# Terminal 2: Test watch
npx nx test status --watch

# Terminal 3: Git commands
git status

# Before lunch: Commit progress
git add . && git commit -m "feat: WIP - add filters"

# Afternoon: Continue development
# ... more coding ...

# Before creating PR
npx nx affected -t lint typecheck test build
git add . && git commit -m "feat: complete filter feature"
git push origin feature/my-feature

# Create PR in GitLab
# Get review → Address comments → Merge

# Done! 🎉
```

---

**Document Version:** 2.0  
**Last Updated:** January 4, 2026

**Related Documents:**
- [architectural-context.md](./architectural-context.md) - Architecture overview
- [engineering-principles.md](./engineering-principles.md) - Principles and decisions
- [agent/agent-guidance.md](./agent/agent-guidance.md) - AI agent guidance
