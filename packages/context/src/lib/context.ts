/**
 * PortalContext defines the structure for the portal's context,
 * including environment, user information, and locale, etc... Only use in the Visibility domain host, not in
 * the remote apps.
 */
export interface PortalContext {
  env: 'development' | 'staging' | 'production';
  user: {
    id: string;
    roles: string[];
  };
  locale: string;

  // [optional] Additional dynamic properties
  [key: string]: unknown;
}

/**
 * VisibilityContext extends PortalContext with additional properties
 * specific to visibility management.
 */
export interface VisibilityContext extends PortalContext {
  entitlements: string[];
  rollout: 'current' | 'next' | string;
  featureFlags?: Record<string, boolean | string | number>;
}
