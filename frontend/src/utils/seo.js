import { getCurrencySymbol } from './format';

export const setMeta = (key, value, content) => {
  let el = document.querySelector(`meta[${key}="${value}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(key, value); document.head.appendChild(el); }
  el.setAttribute("content", content);
};

// Build TripAdvisor-style slug: /Tourism-Varanasi_Uttar_Pradesh_India-Tourism
export const buildSlug = (name, dbData) => {
  const parts = [name];
  if (dbData?.state)        parts.push(dbData.state);
  if (dbData?.country_name) parts.push(dbData.country_name);
  const slug = parts.map(p => p.trim().replace(/\s+/g, '_')).join('_');
  return `/Tourism-${slug}-Tourism`;
};

// Parse slug back to city name (first segment before first underscore chain)
export const parseSlug = (pathname) => {
  const m = pathname.match(/^\/Tourism-(.+)-Tourism$/);
  if (!m) return null;
  return m[1].split('_')[0].replace(/_/g, ' ');
};

export const updateSEO = (cityData) => {
  const db          = cityData.dbData;
  const sym         = getCurrencySymbol(db?.currency || '');
  const lowestPrice = cityData.rooms[0]?.priceVal || '';
  const priceStr    = lowestPrice ? `${sym}${lowestPrice}` : '';
  const country     = db?.country_name || '';
  const state       = db?.state || '';
  const famousFor   = db?.famous_for || '';

  // Deduplicate: skip state if it's the same as the place name (e.g. Kerala, Kerala → Kerala)
  const stateLabel   = state && state.toLowerCase() !== cityData.name.toLowerCase() ? state : '';
  const title        = `${cityData.name}${stateLabel ? ', ' + stateLabel : ''}${country ? ', ' + country : ''} — Travel Guide | GlideMyWay`;
  const description = [
    `Planning a trip to ${cityData.name}?`,
    `Weather: ${cityData.temp}°C.`,
    priceStr ? `Hotels from ${priceStr}/night.` : '',
    `By Car: ${cityData.times.car} · Bus: ${cityData.times.bus} · Train: ${cityData.times.train} · Flight: ${cityData.times.flight}.`,
    famousFor ? `Famous for: ${famousFor}.` : '',
    `Complete AI travel guide by GlideMyWay.`
  ].filter(Boolean).join(' ');
  const keywords    = `${cityData.name} travel guide, ${cityData.name} hotels, ${cityData.name} weather, things to do in ${cityData.name}, ${cityData.name} tourism, ${cityData.name} restaurants, visit ${cityData.name} 2026, ${country} travel`;
  const pageUrl     = `${window.location.origin}${buildSlug(cityData.name, db)}`;
  const image       = cityData.imageUrl;

  // Document title
  document.title = title;

  // Canonical
  const canonical = document.getElementById("canonical-link");
  if (canonical) canonical.setAttribute("href", pageUrl);

  // Primary meta
  setMeta("name", "title",       title);
  setMeta("name", "description", description);
  setMeta("name", "keywords",    keywords);

  // Geo
  setMeta("name", "geo.placename", `${cityData.name}${country ? ', ' + country : ''}`);
  setMeta("name", "geo.position",  `${cityData.lat};${cityData.lng}`);
  setMeta("name", "ICBM",          `${cityData.lat}, ${cityData.lng}`);

  // Open Graph — update by id for reliability
  const ogTitle = document.getElementById("og-title");
  const ogDesc  = document.getElementById("og-description");
  const ogUrl   = document.getElementById("og-url");
  const ogImg   = document.getElementById("og-image");
  if (ogTitle) ogTitle.setAttribute("content", title);
  if (ogDesc)  ogDesc.setAttribute("content", description);
  if (ogUrl)   ogUrl.setAttribute("content", pageUrl);
  if (ogImg)   ogImg.setAttribute("content", image);
  setMeta("property", "og:type", "article");

  // Twitter
  const twTitle = document.getElementById("twitter-title");
  const twDesc  = document.getElementById("twitter-description");
  const twImg   = document.getElementById("twitter-image");
  if (twTitle) twTitle.setAttribute("content", title);
  if (twDesc)  twDesc.setAttribute("content", description);
  if (twImg)   twImg.setAttribute("content", image);

  // Destination JSON-LD
  const destinationLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${pageUrl}#destination`,
    "name": cityData.name,
    "description": description,
    "url": pageUrl,
    "image": { "@type": "ImageObject", "url": image, "width": 1200, "height": 800 },
    "geo": { "@type": "GeoCoordinates", "latitude": cityData.lat, "longitude": cityData.lng },
    "containedInPlace": [
      state   && { "@type": "AdministrativeArea", "name": state },
      country && { "@type": "Country", "name": country },
    ].filter(Boolean),
    "touristType": ["Leisure", "Business", "Sightseeing", "Adventure", "Culture"],
    "includesAttraction": cityData.attractions?.slice(0, 6).map(a => ({
      "@type": "TouristAttraction",
      "name": a.name,
      "entryFee": a.entry_fee || "Unknown",
    })) || [],
    "amenityFeature": cityData.rooms.map(r => ({
      "@type": "LodgingBusiness",
      "name": r.name,
      "priceRange": r.priceVal ? `${sym}${r.priceVal}` : '',
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": r.rating, "bestRating": "5" }
    })),
  };

  // Breadcrumb JSON-LD
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",    "item": window.location.origin },
      country && { "@type": "ListItem", "position": 2, "name": country, "item": `${window.location.origin}/Tourism-${country.replace(/\s+/g,'_')}-Tourism` },
      { "@type": "ListItem", "position": country ? 3 : 2, "name": cityData.name, "item": pageUrl },
    ].filter(Boolean),
  };

  const destScript = document.getElementById("json-ld-destination");
  if (destScript) destScript.text = JSON.stringify(destinationLd, null, 2);

  const bcScript = document.getElementById("json-ld-breadcrumb");
  if (bcScript) bcScript.text = JSON.stringify(breadcrumbLd, null, 2);
};
