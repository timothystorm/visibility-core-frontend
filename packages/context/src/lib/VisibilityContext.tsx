import * as React from 'react';
import { createContext, useContext } from 'react';
import { VisibilityContext } from './types/context.js';

/**
 * VisibilityCtx - React context for VisibilityContext.
 *
 */
const VisibilityCtx = createContext<VisibilityContext | null>(null);

/**
 * VisibilityContextProvider - Provides the VisibilityContext to its children.  Should be used at the root of your
 * component tree in the Visibility host.  Do not use this in standalone remotes; use the VisibilityProvider instead.
 *
 * @see VisibilityProvider
 *
 * @example
 * ```tsx
 * <VisibilityContextProvider context={portalContext}>
 *   <YourComponent />
 * </VisibilityContextProvider>
 * ```
 *
 * @param value - The PortalContext value to provide.
 * @param children - The child components that will consume the context.
 * @constructor
 */
export function VisibilityContextProvider({
  value,
  children,
}: {
  value: VisibilityContext;
  children: React.ReactNode;
}) {
  console.log('....')
  return <VisibilityCtx.Provider value={value}>{children}</VisibilityCtx.Provider>;
}

/**
 * useVisibilityContext - Custom hook to consume the VisibilityContext.
 *
 * @example
 * ```tsx
 * const visibilityContext = useVisibilityContext();
 * ```
 *
 * @returns The VisibilityContext value.
 * @throws Error if the VisibilityContext is not available.
 */
export function useVisibilityContext(): VisibilityContext {
  const ctx = useContext(VisibilityCtx);
  if (!ctx) throw new Error('VisibilityContext not available');
  return ctx;
}
