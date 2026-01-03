import { createRoot, Root } from 'react-dom/client';
import App from './app';
import { VisibilityContext, VisibilityContextProvider } from '@fedex/context';

// Keep track of the root to allow unmounting later
let root: Root | null = null;

/**
 * Mounts the status remote app into the given element with the visibility context.  This is the entry point for
 * embedding this remote into a host application.
 *
 * @param el - The HTML element to mount the app into.
 * @param context - The visibility context to provide to the app.
 */
export function mount(el: HTMLElement, context: VisibilityContext) {
  if (root) return;

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
