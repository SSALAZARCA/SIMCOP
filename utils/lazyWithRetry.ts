import React from 'react';

/**
 * Utility to wrap dynamic React.lazy imports with automatic cache-busting / reload resilience.
 * When a new deployment occurs, older chunk hashes are replaced on the server.
 * If a user still has an older index.html or session in memory, attempting to load
 * a chunk returns 404 (Failed to fetch dynamically imported module).
 * 
 * lazyWithRetry detects this condition and automatically reloads the page once to fetch
 * the latest index.html and its current assets, avoiding crashes or blank screens.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>,
  moduleName = 'chunk'
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const storageKey = `simcop_reload_${moduleName}`;
    const hasReloaded = window.sessionStorage.getItem(storageKey);

    try {
      const module = await componentImport();
      // Reset reload flag on successful load
      window.sessionStorage.removeItem(storageKey);
      return typeof module.default !== 'undefined' ? module : { default: module };
    } catch (error: any) {
      console.warn(`[SIMCOP Chunk Loader] Failed to load module "${moduleName}":`, error);

      const errorMessage = error?.message || error?.toString() || '';
      const isChunkError =
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('error loading dynamically imported module') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && !hasReloaded) {
        window.sessionStorage.setItem(storageKey, 'true');
        console.info(`[SIMCOP] Nueva versión detectada en el servidor. Recargando para actualizar ${moduleName}...`);
        
        // Force refresh from server, clearing stale cache
        window.location.reload();
        
        // Return an unresolved promise to avoid React rendering error state before reload occurs
        return new Promise(() => {});
      }

      // If already reloaded once and still failing, throw to the ErrorBoundary
      throw error;
    }
  });
}
