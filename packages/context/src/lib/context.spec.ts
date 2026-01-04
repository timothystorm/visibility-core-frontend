describe('VisibilityContext', () => {
  it('should create a VisibilityContext that extends PortalContext', () => {
    // Example PortalContext
    const portalContext = {
      env: 'production' as const,
      user: {
        id: 'user123',
        roles: ['admin', 'editor'],
      },
      locale: 'en-US',
      additionalProp: 'someValue',
    };

    // Create a VisibilityContext based on the PortalContext
    const visibilityContext = {
      ...portalContext,
      entitlements: ['external:overview', 'external:details'],
      rollout: 'current' as const,
    };

    // Assertions
    expect(visibilityContext.env).toBe(portalContext.env);
    expect(visibilityContext.user).toBe(portalContext.user);
    expect(visibilityContext.locale).toBe(portalContext.locale);
    expect(visibilityContext.additionalProp).toBe(portalContext.additionalProp);
    expect(visibilityContext.entitlements).toEqual(['external:overview', 'external:details']);
    expect(visibilityContext.rollout).toBe('current');
  });
});
