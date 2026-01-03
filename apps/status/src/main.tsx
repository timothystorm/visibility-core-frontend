import { mount } from './app/mount';
import { VisibilityContext } from '@fedex/context';

/**
 * Mounts the status remote app for development purposes only. This block is only executed in development mode
 * when the app is opened directly in the browser (not embedded in a host). It sets up a sample visibility context
 * and mounts the app into the element with the ID 'root'.
 */

if (import.meta.env.DEV && window === window.top) {
  const el = document.getElementById('root');
  if (el) {
    // TODO: make the building of the VisibilityContext dynamic
    const visibilityContext: VisibilityContext = {
      env: 'development',
      locale: 'en-US',
      user: {
        id: 'dev-user',
        roles: ['admin'],
      },
      entitlements: ['external:overview', 'external:details'],
      rollout: 'current',
    };

    mount(el, visibilityContext);
  }
}
