import { createRoot, Root } from 'react-dom/client';
import App from './app';
import { PortalContext, PortalContextProvider, VisibilityContext, VisibilityContextProvider } from '@fedex/context';

// Keep track of the root to allow unmounting later
let root: Root | null = null;

/**
 * Mounts the visibility app into the given element with the provided portal context.  This is the entry point for
 * embedding the visibility app into a host application.
 *
 * @example
 * ```tsx
 * import { mount } from 'apps/visibility/src/app/mount';
 * import { PortalContext } from '@fedex/context';
 *
 * const el = document.getElementById('root');
 * const portalContext: PortalContext = { ... };
 *
 * mount(el, portalContext, {
 *  wrap: (children) => <SomeWrapper>{children}</SomeWrapper>,
 * });
 * ```
 *
 * @param el - The HTML element to mount the app into.
 * @param portalContext - The portal context to provide to the app.
 */
export function mount(el: HTMLElement, portalContext: PortalContext) {
  if (root) return;

  // TODO: make the building of the VisibilityContext dynamic
  const visibilityContext: VisibilityContext = {
    env: 'development',
    locale: 'en-US',
    user: {
      id: 'dev',
      roles: ['developer'],
    },
    entitlements: ['external:overview', 'external:details'],
    rollout: 'current',
  };

  root = createRoot(el);
  root.render(
    <PortalContextProvider context={portalContext}>
      <VisibilityContextProvider value={visibilityContext}>
        <App />
      </VisibilityContextProvider>
    </PortalContextProvider>,
  );
}

export function unmount() {
  root?.unmount();
  root = null;
}
