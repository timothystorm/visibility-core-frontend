import { mount } from './app/mount';

/**
 * Entry point for the visibility application in development mode.
 * This script mounts the app into the DOM element with the ID 'root'.
 */
const el = document.getElementById('root');
if (!el) throw new Error('Root element not found');

// Mount the application with a mock context
mount(el, {
  // TODO: create a mockable context object via localstorage
  user: { id: 'dev', roles: ['developer'] },
  env: 'development',
  locale: 'en-US',
});
