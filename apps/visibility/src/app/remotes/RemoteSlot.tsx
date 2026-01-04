import { useEffect, useRef, useState } from 'react';
import { loadRemoteWithRetry } from './loadRemotes';
import { loadRemoteManifest } from './loadManifest';
import { RemoteError } from './remoteError';
import { useVisibilityContext } from '@fedex/context';
import RemoteErrorComponent from '../components/RemoteErrorComponent';

type SlotState = { status: 'loading' } | { status: 'mounted' } | { status: 'error'; error: RemoteError };

/**
 * A slot component that loads and mounts a remote module.
 *
 * @param remoteName - The name of the remote module to load. Refers to the key in the remotes.manifest.json file.
 */
export function RemoteSlot({ remoteName }: { remoteName: string }) {
  const visibilityContext = useVisibilityContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<SlotState>({ status: 'loading' });

  useEffect(() => {
    const el = document.createElement('div');
    containerRef.current?.appendChild(el);

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const manifest = await loadRemoteManifest();

        if (cancelled) return;
        const mod = await loadRemoteWithRetry(remoteName, manifest, visibilityContext, {
          maxRetries: 1,
          retryDelayMs: 1000,
          timeoutMs: 10000,
        });

        if (cancelled) return;
        mod.mount(el, visibilityContext);
        cleanup = () => mod.unmount?.(el);

        setState({ status: 'mounted' });
      } catch (err: unknown) {
        if (cancelled) return;
        setState({
          status: 'error',
          error: {
            stage: 'load',
            message: err instanceof Error ? err.message : 'Unknown remote error',
            cause: err,
          },
        });
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      el.remove();
    };
  }, [visibilityContext, remoteName]);

  if (state.status === 'error') {
    return <RemoteErrorComponent remote={remoteName} error={state.error} />;
  }

  return <div ref={containerRef} />;
}
