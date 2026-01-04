import { createRoot, Root } from 'react-dom/client';
import App from './app/app';
import { VisibilityContext, VisibilityContextProvider } from '@fedex/context';
import { deriveCssUrl, loadCss } from '@fedex/ui';
import './status.css';

// Keep track of the root to allow unmounting later
let root: Root | null = null;

/**
 * Mounts the status app into the given element with the provided portal context.  This is the entry point for
 * embedding the status remote into the visibility host.
 *
 * @example
 * ```tsx
 * import { mount } from 'apps/status/src/status';
 * import { VisibilityContext } from '@fedex/context';
 *
 * const el = document.getElementById('root');
 * const visibilityContext: VisibilityContext = { ... };
 *
 * mount(el, visibilityContext, {
 *  wrap: (children) => <SomeWrapper>{children}</SomeWrapper>,
 * });
 * ```
 *
 * @param el - The HTML element to statusMount the app into.
 * @param context - The portal context to provide to the app. This includes information about the user,
 * environment, and other contextual data.
 */
export async function mount(el: HTMLElement, context: VisibilityContext) {
  if (root) return;

  // Load the CSS for this module
  loadCss(deriveCssUrl(import.meta.url, { removeHash: true })).catch(console.warn);

  root = createRoot(el);
  root.render(
    <VisibilityContextProvider value={context}>
      <App />
    </VisibilityContextProvider>,
  );
}

/**
 * Unmounts the status remote app from the DOM. This is the entry point for unmounting this remote from a host
 * application.
 */
export function unmount() {
  root?.unmount();
  root = null;
}

if (import.meta.env.DEV) {
  console.info(
    '%c📊 Status Remote Loaded',
    'background: #00aa00; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;',
  );
}
