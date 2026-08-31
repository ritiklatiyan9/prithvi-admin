const routePreloaders = new Map<string, () => Promise<unknown>>();

export const registerRoutePreload = (
  path: string,
  loader: () => Promise<unknown>,
): void => {
  routePreloaders.set(path, loader);
};

/** Warms a lazy route chunk on intent (hover/focus) before navigation. */
export const preloadRoute = (path: string): void => {
  void routePreloaders.get(path)?.().catch(() => {
    // Intent prefetch is opportunistic. The lazy route will surface/retry a
    // real navigation failure through its normal boundary.
  });
};
