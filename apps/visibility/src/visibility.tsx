import { createRoot, Root } from 'react-dom/client';
import App from './app/app';
import { PortalContext, VisibilityContext, VisibilityContextProvider } from '@fedex/context';
import './visibility.css';
import { deriveCssUrl, loadCss } from '@fedex/ui';

// Keep track of the root to allow unmounting later
const rootRegistry = new WeakMap<HTMLElement, Root>();

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
  // TODO: make the building of the VisibilityContext dynamic
  const visibilityContext: VisibilityContext = {
    ...context,
    entitlements: ['external:overview', 'external:details'],
    rollout: 'current',
  };

  // Load the CSS for this module
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.warn);

  // Check if we already have a root for this element and need to re-mount
  let root = rootRegistry.get(el);
  if (root) {
    console.warn('Re-mounting visibility with updated context');
    root.render(
      <VisibilityContextProvider value={visibilityContext}>
        <App />
      </VisibilityContextProvider>,
    );
    return root;
  }

  // Create and render the React root
  root = createRoot(el);
  rootRegistry.set(el, root);
  return root.render(
    <VisibilityContextProvider value={visibilityContext}>
      <App />
    </VisibilityContextProvider>,
  );
}

/**
 * Unmounts the visibility app from the DOM. This is the entry point for unmounting this app from a host
 * application.
 */
export function unmount(el?: HTMLElement) {
  if (el) rootRegistry.get(el)?.unmount();
}

if (import.meta.env.DEV) {
  console.debug('%c✨ Visibility shell loaded', 'color: #0066cc');
}
