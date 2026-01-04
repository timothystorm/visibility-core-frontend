/**
 * Dynamically loads a CSS file by creating a <link> tag and appending it to the document head.
 * This is necessary for module federation because Vite extracts CSS into separate files
 * and dynamic imports don't automatically load CSS.
 *
 * @param href - The URL of the CSS file to load
 * @returns A promise that resolves when the CSS is loaded, or rejects if it fails
 *
 * @example
 * ```typescript
 * import { loadCss } from '@fedex/ui';
 *
 * await loadCss('https://example.com/styles.css');
 * ```
 */
export function loadCss(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if this CSS file is already loaded
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));

    document.head.appendChild(link);
  });
}

/**
 * Derives the CSS filename from a JS module URL by replacing the extension.
 * Handles both hashed and non-hashed filenames in production builds.
 *
 * Examples:
 * - "http://localhost:4200/mount.mjs" -> "http://localhost:4200/mount.css"
 * - "http://example.com/visibility-abc123.mjs" -> "http://example.com/visibility-abc123.css"
 * - "http://example.com/mount.mjs?v=123" -> "http://example.com/mount.css?v=123"
 *
 * @param jsUrl - The URL of the JS module
 * @param options - Optional configuration for CSS URL derivation
 * @param options.removeHash - If true, removes the hash from the filename (e.g., "mount-abc123.mjs" -> "mount.css")
 * @returns The URL of the corresponding CSS file
 *
 * @example
 * ```typescript
 * import { deriveCssUrl } from '@fedex/ui';
 *
 * // With hash preserved (default)
 * const cssUrl = deriveCssUrl('http://localhost:4200/visibility-abc123.mjs');
 * // Returns: "http://localhost:4200/visibility-abc123.css"
 *
 * // With hash removed
 * const cssUrl = deriveCssUrl('http://localhost:4200/visibility-abc123.mjs', { removeHash: true });
 * // Returns: "http://localhost:4200/visibility.css"
 * ```
 */
export function deriveCssUrl(jsUrl: string, options?: { removeHash?: boolean }): string {
  // Replace .mjs or .js extension with .css
  // Handle URLs with query parameters or hash fragments by parsing the URL
  try {
    const url = new URL(jsUrl);
    let pathname = url.pathname;

    // If removeHash option is enabled, strip the hash from the filename
    if (options?.removeHash) {
      // Match pattern: filename-[hash].mjs -> filename.css
      // This regex matches the last segment before the extension and removes hash
      // Supports various hash formats: abc123, a1b2c3d4, hash123, etc.
      pathname = pathname.replace(/(-[a-z0-9]+)?\.m?js$/i, '.css');
    } else {
      // Keep the hash if present: filename-abc123.mjs -> filename-abc123.css
      pathname = pathname.replace(/\.m?js$/, '.css');
    }

    url.pathname = pathname;
    return url.href;
  } catch {
    // If it's not a valid URL (e.g., relative path), use simple string replacement
    if (options?.removeHash) {
      return jsUrl.replace(/(-[a-z0-9]+)?\.m?js$/i, '.css');
    }
    return jsUrl.replace(/\.m?js$/, '.css');
  }
}

