import { PortalContext } from '@fedex/context';

/**
 * Type definition for a remote module that can be mounted and unmounted. All remote modules
 * must implement this interface to ensure they can be integrated seamlessly into the host application.
 */
export type RemoteModule = {
  mount: (el: HTMLElement, ctx?: PortalContext) => void;
  unmount?: (el?: HTMLElement | null) => void;
};
