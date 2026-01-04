import { RemoteManifest } from '../types/remoteManifest';

let cachedManifest: RemoteManifest | null = null;
const manifestUrl = '/remotes.manifest.json';

/**
 * Loads the remote manifest from a predefined URL. Caches the result for future calls.
 *
 * @returns {Promise<RemoteManifest>} The loaded remote manifest.
 * @throws {Error} If the manifest cannot be loaded or is invalid.
 */
export async function loadRemoteManifest(): Promise<RemoteManifest> {
  if (cachedManifest) return cachedManifest;

  const res = await fetch(new URL(manifestUrl, import.meta.url));
  if (!res.ok) throw new Error(`Failed to load remote manifest (${res.status})`);
  const json = (await res.json()) as RemoteManifest;

  // Basic validation
  if (!json.remotes) throw new Error(`Invalid remote manifest: ${manifestUrl}`);
  return (cachedManifest = json);
}
