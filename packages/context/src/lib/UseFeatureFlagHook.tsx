import { useVisibilityContext } from './VisibilityContextHook.js';

/**
 * Custom hook to check if a feature flag is enabled in the VisibilityContext.
 *
 * @example
 *```tsx
 * const hasNewUI = useFeatureFlag('new-ui-2024');
 * return hasNewUI ? <NewUI /> : <OldUI />;
 *```
 * @param flag - The feature flag to check.
 * @returns True if the feature flag is enabled, false otherwise.
 */
export function useFeatureFlag(flag: string): boolean {
  const ctx = useVisibilityContext();
  return !!ctx.featureFlags?.[flag];
}
