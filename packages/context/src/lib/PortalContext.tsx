import * as React from 'react';
import { createContext, useContext } from 'react';
import { PortalContext } from './types/context.js';

/**
 * PortalCtx - React context for PortalContext.
 *
 */
const PortalCtx = createContext<PortalContext | null>(null);

/**
 * PortalContextProvider - Provides the PortalContext to its children.
 *
 * @example
 * ```tsx
 * <PortalContextProvider context={portalContext}>
 *   <YourComponent />
 * </PortalContextProvider>
 * ```
 *
 * @param value - The PortalContext value to provide.
 * @param children - The child components that will consume the context.
 * @constructor
 */
export function PortalContextProvider({ context, children }: { context: PortalContext; children: React.ReactNode }) {
  return <PortalCtx.Provider value={context}>{children}</PortalCtx.Provider>;
}

/**
 * usePortalContext - Custom hook to consume the PortalContext.
 *
 * @example
 * ```tsx
 * const portalContext = usePortalContext();
 * ```
 *
 * @returns The PortalContext value.
 * @throws Error if the PortalContext is not available.
 */
export function usePortalContext(): PortalContext {
  const ctx = useContext(PortalCtx);
  if (!ctx) throw new Error('PortalContext not available');
  return ctx;
}
