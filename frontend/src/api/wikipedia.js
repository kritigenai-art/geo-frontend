import axios from "axios";
import { wikiQueue } from "../utils/wikiQueue";

// Fetch multiple real Wikipedia photos for the hero carousel
// Step 1: get image filename list from the article
// Step 2: resolve filenames → actual CDN URLs, filter out icons/flags/maps
export const fetchPlaceImages = async (placeName, mainImageUrl) => {
  const skipWords = ['flag', 'logo', 'map', 'icon', 'seal', 'emblem', 'coa', 'locator',
                     'blank', 'symbol', 'shield', 'sign', 'coat', 'arms', 'route',
                     'diagram', 'chart', 'graph', 'stub', 'commons', 'wikimedia'];
  try {
    // Step 1 — get image titles used in the Wikipedia article
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
      .slice(0, 8); // resolve up to 8, keep best 4

    if (candidates.length === 0) return [mainImageUrl];

    // Step 2 — resolve filenames to CDN URLs at 1200px width
    const urlRes = await axios.get(
      `/wikipedia/w/api.php?action=query&titles=${candidates.map(encodeURIComponent).join('|')}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`,
      { timeout: 8000 }
    );
    const resolved = Object.values(urlRes.data.query?.pages || {})
      .map(p => p.imageinfo?.[0]?.url)
      .filter(Boolean);

    if (resolved.length === 0) return [mainImageUrl];

    // Put mainImageUrl first (it's the best/most relevant), add up to 3 more unique ones
    const extras = resolved.filter(u => u !== mainImageUrl).slice(0, 3);
    return [mainImageUrl, ...extras];
  } catch {
    return [mainImageUrl];
  }
};

// Fetch real Wikipedia image for any place/hotel name
// Strategy 1: direct article title — only accept if article title contains our search keyword
// Strategy 2: search generator with result validation — skip if top result doesn't match
export const fetchWikiImage = async (name, size = 400) => {
  const keyword = name.split(" ")[0].toLowerCase(); // first meaningful word for validation

  // Direct article lookup — validate pageid != -1 (means article exists)
  try {
    const res = await axios.get(
      `/wikipedia/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&pithumbsize=${size}&format=json&origin=*`,
      { timeout: 5000 }
    );
    const pages = Object.values(res.data.query?.pages || {});
    const page = pages[0];
    if (page?.pageid !== -1 && page?.thumbnail?.source) {
      // Validate: article title must contain the first word of our query
      const title = (page.title || "").toLowerCase();
      if (title.includes(keyword)) return page.thumbnail.source;
    }
  } catch {}

  // Search-generator fallback — validate the returned article title matches our query
  try {
    const res = await axios.get(
      `/wikipedia/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=3&prop=pageimages&pithumbsize=${size}&format=json&origin=*`,
      { timeout: 5000 }
    );
    const pages = Object.values(res.data.query?.pages || {});
    // Pick the first result whose title contains the keyword — avoids wrong city matches
    for (const page of pages) {
      const title = (page.title || "").toLowerCase();
      if (title.includes(keyword) && page.thumbnail?.source) {
        return page.thumbnail.source;
      }
    }
  } catch {}

  return null;
};

export { wikiQueue };
