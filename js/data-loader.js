/**
 * Data loader - fetches manifest and scheda JSON files on demand.
 */

let manifestCache = null;
const schedaCache = new Map();

/**
 * Load the manifest (cached after first load).
 * @returns {Promise<Object>}
 */
export async function loadManifest() {
  if (manifestCache) return manifestCache;

  const resp = await fetch('data/manifest.json');
  if (!resp.ok) throw new Error(`Failed to load manifest: ${resp.status}`);
  manifestCache = await resp.json();
  return manifestCache;
}

/**
 * Load a specific scheda's data (cached after first load).
 * @param {string} id - The scheda ID (e.g., "1", "19bis")
 * @returns {Promise<Object>}
 */
export async function loadScheda(id) {
  if (schedaCache.has(id)) return schedaCache.get(id);

  const resp = await fetch(`data/scheda-${id}.json`);
  if (!resp.ok) throw new Error(`Failed to load scheda ${id}: ${resp.status}`);
  const data = await resp.json();
  schedaCache.set(id, data);
  return data;
}

/**
 * Check if a scheda's data file exists.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function schedaExists(id) {
  try {
    const resp = await fetch(`data/scheda-${id}.json`, { method: 'HEAD' });
    return resp.ok;
  } catch {
    return false;
  }
}
