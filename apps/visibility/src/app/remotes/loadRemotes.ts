import { RemoteModule } from '../types/remoteModule';
import { RemoteManifest } from '../types/remoteManifest';
import { VisibilityContext } from '@fedex/context';

/**
 * Options for loading remote modules with retry logic
 */
interface LoadRemoteOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Type guard to validate remote module structure at runtime
 */
function isRemoteModule(mod: unknown): mod is RemoteModule {
  return (
    typeof mod === 'object' &&
    mod !== null &&
    'mount' in mod &&
    typeof (mod as any).mount === 'function' &&
    (!('unmount' in mod) || typeof (mod as any).unmount === 'function')
  );
}

/**
 * Resolves the remote URL for a given remote name based on the VisibilityContext.
 *
 * @param remoteName - The name of the remote to resolve.
 * @param manifest - The remotes manifest containing remote URLs.
 * @param ctx - The visibility context containing rollout information.
 * @returns The resolved remote URL.
 * @throws Error if the remote name is unknown.
 */
function resolveRemoteUrl(remoteName: string, manifest: RemoteManifest, ctx?: VisibilityContext) {
  const remote = manifest.remotes[remoteName];
  if (!remote) throw new Error(`Unknown remote: ${remoteName}`);
  return remote[ctx?.rollout ?? 'current'];
}

/**
 * Loads a remote module with retry logic for transient failures.
 *
 * @param remoteName - The name of the remote module to load - must match the remotes.{key} in the manifest
 * @param manifest - The remote manifest containing remote definitions and URLs
 * @param ctx - The portal/visibility context to use when resolving the remote URL - used to determine environment variants
 * @returns A promise that resolves to the loaded remote module
 * @throws An error if the remote URL cannot be resolved or if the module does not export a statusMount() function
 */
export async function loadRemote(
  remoteName: string,
  manifest: RemoteManifest,
  ctx?: VisibilityContext,
): Promise<RemoteModule> {
  const url = resolveRemoteUrl(remoteName, manifest, ctx);
  if (!url) throw new Error(`No URL found for remote "${remoteName}"`);

  // Native ESM import — the entire point of MF with ESM
  const mod = await import(/* @vite-ignore */ url);

  // runtime validation of the remote module structure
  if (!isRemoteModule(mod)) {
    throw new Error(`Remote "${remoteName}" does not export a valid RemoteModule`);
  }

  return mod as RemoteModule;
}

/**
 * Loads a remote module with retry logic for transient failures.
 *
 * @param remoteName - The name of the remote module to load
 * @param manifest - The remote manifest
 * @param ctx - The visibility context
 * @param options - Retry options
 * @returns A promise that resolves to the loaded remote module
 */
export async function loadRemoteWithRetry(
  remoteName: string,
  manifest: RemoteManifest,
  ctx?: VisibilityContext,
  options: LoadRemoteOptions = {},
): Promise<RemoteModule> {
  const { maxRetries = 3, retryDelayMs = 1000, timeoutMs = 10000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load timeout')), timeoutMs);
      });

      // Race between loading and timeout
      const loadPromise = loadRemote(remoteName, manifest, ctx);
      return await Promise.race([loadPromise, timeoutPromise]);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Failed to load remote "${remoteName}" (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to load remote "${remoteName}" after ${maxRetries + 1} attempts: ${lastError?.message}`);
}
