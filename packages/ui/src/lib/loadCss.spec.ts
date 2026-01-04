import { describe, it, expect, beforeEach } from 'vitest';
import { loadCss, deriveCssUrl } from './loadCss';

describe('loadCss', () => {
  beforeEach(() => {
    // Clear all link tags before each test
    document.head.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove());
  });

  it('should create a link tag and append to head', async () => {
    const href = 'https://example.com/styles.css';
    const promise = loadCss(href);

    // Simulate the link loading
    const link = document.querySelector(`link[href="${href}"]`) as HTMLLinkElement;
    expect(link).toBeTruthy();
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toBe(href);

    // Trigger onload
    link.onload?.(new Event('load'));
    await promise;
  });

  it('should not create duplicate link tags', async () => {
    const href = 'https://example.com/styles.css';

    // Load once
    const promise1 = loadCss(href);
    const link1 = document.querySelector(`link[href="${href}"]`) as HTMLLinkElement;
    link1.onload?.(new Event('load'));
    await promise1;

    // Load again
    await loadCss(href);

    // Should only have one link tag
    const links = document.querySelectorAll(`link[href="${href}"]`);
    expect(links.length).toBe(1);
  });

  it('should reject on error', async () => {
    const href = 'https://example.com/missing.css';
    const promise = loadCss(href);

    // Simulate the link failing to load
    const link = document.querySelector(`link[href="${href}"]`) as HTMLLinkElement;
    link.onerror?.(new Event('error'));

    await expect(promise).rejects.toThrow('Failed to load CSS: https://example.com/missing.css');
  });

  it('should resolve immediately if CSS already loaded', async () => {
    const href = 'https://example.com/styles.css';

    // Manually add a link tag
    const existingLink = document.createElement('link');
    existingLink.rel = 'stylesheet';
    existingLink.href = href;
    document.head.appendChild(existingLink);

    // Should resolve immediately without creating a new link
    await loadCss(href);

    const links = document.querySelectorAll(`link[href="${href}"]`);
    expect(links.length).toBe(1);
  });
});

describe('deriveCssUrl', () => {
  it('should replace .mjs with .css', () => {
    expect(deriveCssUrl('http://localhost:4200/mount.mjs')).toBe('http://localhost:4200/mount.css');
  });

  it('should replace .js with .css', () => {
    expect(deriveCssUrl('http://localhost:4200/bundle.js')).toBe('http://localhost:4200/bundle.css');
  });

  it('should handle URLs with query parameters', () => {
    expect(deriveCssUrl('http://localhost:4200/mount.mjs?v=123')).toBe('http://localhost:4200/mount.css?v=123');
  });

  it('should handle URLs with hash fragments', () => {
    expect(deriveCssUrl('http://localhost:4200/mount.mjs#main')).toBe('http://localhost:4200/mount.css#main');
  });

  it('should handle relative URLs', () => {
    expect(deriveCssUrl('./mount.mjs')).toBe('./mount.css');
    expect(deriveCssUrl('../dist/bundle.js')).toBe('../dist/bundle.css');
  });

  it('should preserve content hash by default', () => {
    expect(deriveCssUrl('http://example.com/visibility-abc123.mjs')).toBe('http://example.com/visibility-abc123.css');
    expect(deriveCssUrl('http://example.com/mount-a1b2c3d4.mjs')).toBe('http://example.com/mount-a1b2c3d4.css');
  });

  it('should remove content hash when removeHash option is true', () => {
    expect(deriveCssUrl('http://example.com/visibility-abc123.mjs', { removeHash: true })).toBe('http://example.com/visibility.css');
    expect(deriveCssUrl('http://example.com/mount-a1b2c3d4.mjs', { removeHash: true })).toBe('http://example.com/mount.css');
  });

  it('should handle removeHash with query parameters', () => {
    expect(deriveCssUrl('http://example.com/mount-abc123.mjs?v=1', { removeHash: true })).toBe('http://example.com/mount.css?v=1');
  });

  it('should handle removeHash with relative URLs', () => {
    expect(deriveCssUrl('./visibility-abc123.mjs', { removeHash: true })).toBe('./visibility.css');
    expect(deriveCssUrl('../dist/mount-hash123.js', { removeHash: true })).toBe('../dist/mount.css');
  });

  it('should not break on files without hashes when removeHash is true', () => {
    expect(deriveCssUrl('http://example.com/visibility.mjs', { removeHash: true })).toBe('http://example.com/visibility.css');
    expect(deriveCssUrl('http://example.com/mount.js', { removeHash: true })).toBe('http://example.com/mount.css');
  });
});


