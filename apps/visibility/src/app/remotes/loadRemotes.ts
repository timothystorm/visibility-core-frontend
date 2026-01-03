import { RemoteModule } from '../types/remoteModule';
import { RemoteManifest } from '../types/remoteManifest';
import { VisibilityContext } from '@fedex/context';

/**
* Resolves the remote URL for a given remote name based on the portalContext context.
*
* @param remoteName - The name of the remote to resolve.
* @param manifest - The remotes manifest containing remote URLs.
* @param ctx - The visibility context containing rollout information.
* @returns The resolved remote URL.
* @throws Error if the remote name is unknown.
*/
function resolveRemoteUrl(
  remoteName: string,
  manifest: RemoteManifest,
  ctx?: VisibilityContext
) {
  const remote = manifest.remotes[remoteName];
  if (!remote) throw new Error(`Unknown remote: ${remoteName}`);
  return remote[ctx?.rollout ?? "current"];
}

/**
 * Loads a remote module given its name and the visibility context.
 *
 * @param remoteName - The name of the remote module to load - must match the remotes.{key} in the manifest
 * @param manifest - The remote manifest containing remote definitions and URLs
 * @param ctx - The portal/visibility context to use when resolving the remote URL - used to determine environment variants
 * @returns A promise that resolves to the loaded remote module
 * @throws An error if the remote URL cannot be resolved or if the module does not export a mount() function
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
  if (typeof mod.mount !== 'function') throw new Error(`Remote "${remoteName}" does not export mount()`);
  return mod as RemoteModule;
}
