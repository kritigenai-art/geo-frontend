import axios from "axios";
import { wikiQueue } from "../utils/wikiQueue";

// Words too common to use for title validation
const STOP_WORDS = new Set(['the','and','for','from','with','this','that','into','over','under','near','about']);

// Extract meaningful words from a query string
const sigWords = (text) =>
  text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));

// A title is a good match if at least 2 significant query words appear in it
// (prevents "Birla Mandir Hyderabad" from matching "Birla Mandir, Kolkata")
const isGoodMatch = (articleTitle, query) => {
  const words = sigWords(query);
  if (words.length === 0) return false;
  const t = articleTitle.toLowerCase();
  const hits = words.filter(w => t.includes(w)).length;
  return hits >= Math.min(2, words.length);
};

// Fetch multiple real Wikipedia photos for the hero carousel
// Step 1: get image filename list from the article
// Step 2: resolve filenames → actual CDN URLs, filter out icons/flags/maps
export const fetchPlaceImages = async (placeName, mainImageUrl) => {
  const skipWords = ['flag', 'logo', 'map', 'icon', 'seal', 'emblem', 'coa', 'locator',
                     'blank', 'symbol', 'shield', 'sign', 'coat', 'arms', 'route',
                     'diagram', 'chart', 'graph', 'stub', 'commons', 'wikimedia'];
  try {
    const listRes = await axios.get(
      `/wikipedia/w/api.php?action=query&titles=${encodeURIComponent(placeName)}&prop=images&imlimit=30&format=json&origin=*`,
      { timeout: 8000 }
    );
    const pages = Object.values(listRes.data.query?.pages || {});
    const candidates = (pages[0]?.images || [])
      .map(img => img.title)
      .filter(t => {
        const l = t.toLowerCase();
        return (l.endsWith('.jpg') || l.endsWith('.jpeg') || l.endsWith('.png') || l.endsWith('.webp'))
          && !skipWords.some(w => l.includes(w));
      })
      .slice(0, 8);

    if (candidates.length === 0) return [mainImageUrl];

    const urlRes = await axios.get(
      `/wikipedia/w/api.php?action=query&titles=${candidates.map(encodeURIComponent).join('|')}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`,
      { timeout: 8000 }
    );
    const resolved = Object.values(urlRes.data.query?.pages || {})
      .map(p => p.imageinfo?.[0]?.url)
      .filter(Boolean);

    if (resolved.length === 0) return [mainImageUrl];

    const extras = resolved.filter(u => u !== mainImageUrl).slice(0, 3);
    return [mainImageUrl, ...extras];
  } catch {
    return [mainImageUrl];
  }
};

// Fetch image for an attraction using Wikipedia geosearch near coordinates.
// This guarantees we get the right city's article instead of a same-named place elsewhere.
export const fetchAttractionImage = async (name, lat, lng, size = 400) => {
  try {
    const geoRes = await axios.get(
      `/wikipedia/w/api.php?action=query&list=geosearch&gsradius=15000&gscoord=${lat}|${lng}&gslimit=30&format=json&origin=*`,
      { timeout: 6000 }
    );
    const nearby = geoRes.data.query?.geosearch || [];
    const words = sigWords(name);
    // Find the nearest article whose title contains at least 1 significant word from the name
    const match = nearby.find(a => words.some(w => a.title.toLowerCase().includes(w)));
    if (match) {
      const imgRes = await axios.get(
        `/wikipedia/w/api.php?action=query&titles=${encodeURIComponent(match.title)}&prop=pageimages&pithumbsize=${size}&format=json&origin=*`,
        { timeout: 5000 }
      );
      const pages = Object.values(imgRes.data.query?.pages || {});
      if (pages[0]?.thumbnail?.source) return pages[0].thumbnail.source;
    }
  } catch {}

  // Fallback to regular search with strict validation
  return fetchWikiImage(`${name}`, size);
};

// Fetch image for hotels/restaurants/foods using Wikipedia article search with strict validation,
// plus a Wikimedia Commons fallback (commons has images that Wikipedia articles often lack).
export const fetchWikiImage = async (name, size = 400) => {
  // Direct article lookup with 2-word validation
  try {
    const res = await axios.get(
      `/wikipedia/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&pithumbsize=${size}&format=json&origin=*`,
      { timeout: 5000 }
    );
    const pages = Object.values(res.data.query?.pages || {});
    const page = pages[0];
    if (page?.pageid !== -1 && page?.thumbnail?.source && isGoodMatch(page.title, name)) {
      return page.thumbnail.source;
    }
  } catch {}

  // Search generator — check top 5 results, require 2-word match
  try {
    const res = await axios.get(
      `/wikipedia/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=5&prop=pageimages&pithumbsize=${size}&format=json&origin=*`,
      { timeout: 5000 }
    );
    const pages = Object.values(res.data.query?.pages || {});
    for (const page of pages) {
      if (isGoodMatch(page.title, name) && page.thumbnail?.source) {
        return page.thumbnail.source;
      }
    }
  } catch {}

  // Wikimedia Commons fallback — searches File: namespace directly for images
  try {
    const res = await axios.get(
      `/wikipedia/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=${size}&format=json&origin=*`,
      { timeout: 5000 }
    );
    const pages = Object.values(res.data.query?.pages || {});
    const hit = pages.find(p => {
      const url = p.imageinfo?.[0]?.url || "";
      // Skip logos, flags, icons
      const l = url.toLowerCase();
      return url && !['logo','flag','icon','seal','map','blank','coat'].some(w => l.includes(w));
    });
    if (hit) return hit.imageinfo[0].url;
  } catch {}

  return null;
};

export { wikiQueue };
