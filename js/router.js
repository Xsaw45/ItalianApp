/**
 * Hash-based SPA router.
 */

let routes = {};
let currentRoute = null;

/**
 * Register route handlers.
 * @param {Object} routeMap - { pattern: handlerFn }
 *   Patterns support :param placeholders, e.g., '/scheda/:id'
 */
export function registerRoutes(routeMap) {
  routes = routeMap;
}

/**
 * Navigate to a given hash path.
 * @param {string} path - e.g., '/home', '/scheda/1'
 */
export function navigate(path) {
  window.location.hash = '#' + path;
}

/**
 * Get the current route path (without #).
 */
export function getCurrentPath() {
  return window.location.hash.slice(1) || '/home';
}

/**
 * Parse a path against a pattern and extract params.
 * @param {string} pattern - e.g., '/scheda/:id/exercises'
 * @param {string} path - e.g., '/scheda/1/exercises'
 * @returns {Object|null} - { id: '1' } or null if no match
 */
function matchRoute(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

/**
 * Handle route changes.
 */
function handleRouteChange() {
  const path = getCurrentPath();

  for (const [pattern, handler] of Object.entries(routes)) {
    const params = matchRoute(pattern, path);
    if (params !== null) {
      currentRoute = { pattern, params, path };
      handler(params);
      return;
    }
  }

  // No match - redirect to home
  navigate('/home');
}

/**
 * Initialize the router.
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

/**
 * Get the current route info.
 */
export function getCurrentRoute() {
  return currentRoute;
}
