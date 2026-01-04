import { createRoot, Root } from 'react-dom/client';
import App from './app/app';
import { PortalContext, VisibilityContext, VisibilityContextProvider } from '@fedex/context';
import './visibility.css';
import { deriveCssUrl, loadCss } from '@fedex/ui';

// Keep track of the root to allow unmounting later
let root: Root | null = null;

/**
 * Mounts the visibility app into the given element with the provided portal context.  This is the entry point for
 * embedding the visibility app into a host application.
 *
 * @example
 * ```tsx
 * import { mount } from 'apps/visibility/src/visibility';
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
 * @param el - The HTML element to statusMount the app into.
 * @param context - The portal context to provide to the app. This includes information about the user,
 * environment, and other contextual data.
 */
export async function mount(el: HTMLElement, context: PortalContext) {
  if (root) return;

  // TODO: make the building of the VisibilityContext dynamic
  const visibilityContext: VisibilityContext = {
    ...context,
    entitlements: ['external:overview', 'external:details'],
    rollout: 'current',
  };

  // Load the CSS for this module
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.warn);

  // Create and render the React root
  root = createRoot(el);
  root.render(
    <VisibilityContextProvider value={visibilityContext}>
      <App />
    </VisibilityContextProvider>,
  );
}

/**
 * Unmounts the visibility app from the DOM. This is the entry point for unmounting this app from a host
 * application.
 */
export function unmount() {
  root?.unmount();
  root = null;
}
