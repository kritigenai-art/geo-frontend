import { useState, useEffect, useRef, lazy, Suspense } from "react";
import axios from "axios";
import logo from "./assets/logo.jpeg";
const RouteMap = lazy(() => import("./RouteMap"));
import {
  Search, MapPin, Cloud, PlayCircle,
  ArrowDownWideNarrow, Share2, ChevronRight, ChevronLeft, Globe, Clock, Coins, Star
} from "lucide-react";


function App() {
  const [userCoords, setUserCoords] = useState(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const [hoveredVideo, setHoveredVideo] = useState(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const searchDebounce = useRef(null);

  // Reset carousel index whenever destination changes
  useEffect(() => { setHeroIdx(0); setShowFullAbout(false); }, [data?.name]);

  // --- 1. SEO ENGINE ---
  const setMeta = (key, value, content) => {
    let el = document.querySelector(`meta[${key}="${value}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute(key, value); document.head.appendChild(el); }
    el.setAttribute("content", content);
  };

  const updateSEO = (cityData) => {
    const title       = `${cityData.name} Travel Guide 2026 — Hotels, Weather & Directions | TravelGo AI`;
    const description = `Planning a trip to ${cityData.name}? Real-time weather ${cityData.temp}°C · Hotel prices from ₹${cityData.rooms[0]?.priceVal || 950} · Car ${cityData.times.car} · Bus ${cityData.times.bus} · Train ${cityData.times.train} from your location. AI-curated city guide by TravelGo.`;
    const keywords    = `${cityData.name} travel guide, ${cityData.name} hotels, ${cityData.name} weather today, ${cityData.name} travel time, things to do in ${cityData.name}, ${cityData.name} tourism, visit ${cityData.name} 2026, ${cityData.name} trip planner`;
    const pageUrl     = `${window.location.origin}${window.location.pathname}?city=${encodeURIComponent(cityData.name)}`;
    const image       = cityData.imageUrl;

    // Document title
    document.title = title;

    // Canonical URL — always the correct, full, query-param URL
    const canonical = document.getElementById("canonical-link");
    if (canonical) canonical.setAttribute("href", pageUrl);

    // Primary meta
    setMeta("name", "title",       title);
    setMeta("name", "description", description);
    setMeta("name", "keywords",    keywords);

    // Geo meta — update per city
    setMeta("name", "geo.placename", cityData.name);
    setMeta("name", "geo.position",  `${cityData.lat};${cityData.lng}`);
    setMeta("name", "ICBM",          `${cityData.lat}, ${cityData.lng}`);

    // Open Graph
    setMeta("property", "og:title",       title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image",       image);
    setMeta("property", "og:url",         pageUrl);
    setMeta("property", "og:type",        "article");

    // Twitter / X
    setMeta("name", "twitter:title",       title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image",       image);
    setMeta("name", "twitter:card",        "summary_large_image");

    // AI meta — dynamic per city
    setMeta("name", "ai:current-destination", cityData.name);
    setMeta("name", "ai:current-weather",     `${cityData.temp}°C`);
    setMeta("name", "ai:current-coordinates", `${cityData.lat}, ${cityData.lng}`);
    setMeta("name", "ai:hotel-count",         String(cityData.rooms.length));
    setMeta("name", "ai:lowest-hotel-price",  `₹${cityData.rooms[0]?.priceVal || 950}`);
    setMeta("name", "ai:travel-car",          cityData.times.car);
    setMeta("name", "ai:travel-bus",          cityData.times.bus);
    setMeta("name", "ai:travel-train",        cityData.times.train);

    // Dublin Core — update per city
    setMeta("name", "DC.title",   title);
    setMeta("name", "DC.subject", `${cityData.name}, Travel, Tourism, Weather, Hotels`);

    // JSON-LD — rich structured data for Google Rich Snippets
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "TouristDestination",
          "@id": `${pageUrl}#destination`,
          "name": cityData.name,
          "description": description,
          "image": {
            "@type": "ImageObject",
            "url": image,
            "width": 1200,
            "height": 800
          },
          "url": pageUrl,
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": cityData.lat,
            "longitude": cityData.lng
          },
          "touristType": ["Leisure", "Business", "Sightseeing", "Adventure", "Culture"],
          "includesAttraction": cityData.rooms.map(r => ({
            "@type": "LodgingBusiness",
            "name": r.name,
            "priceRange": `₹${r.priceVal}`,
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": r.rating,
              "bestRating": "5"
            }
          }))
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home",        "item": window.location.origin },
            { "@type": "ListItem", "position": 2, "name": cityData.name, "item": pageUrl }
          ]
        },
        {
          "@type": "WeatherObservation",
          "@id": `${pageUrl}#weather`,
          "name": `Current Weather in ${cityData.name}`,
          "description": `Current temperature in ${cityData.name} is ${cityData.temp}°C as reported by Open-Meteo.`,
          "observationDate": new Date().toISOString().split("T")[0],
          "location": {
            "@type": "Place",
            "name": cityData.name,
            "geo": { "@type": "GeoCoordinates", "latitude": cityData.lat, "longitude": cityData.lng }
          }
        }
      ]
    };

    let script = document.getElementById("json-ld-schema");
    if (!script) {
      script = document.createElement("script");
      script.id = "json-ld-schema";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(jsonLd, null, 2);
  };

  // --- 2. LOGIC HELPERS ---

  // Derive currency symbol from DB currency string e.g. "Indian Rupee (INR)" → "₹"
  const getCurrencySymbol = (currencyStr) => {
    if (!currencyStr) return '₹';
    const map = {
      INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', AED: 'د.إ',
      SGD: 'S$', AUD: 'A$', CAD: 'C$', CHF: 'Fr', THB: '฿', MYR: 'RM', IDR: 'Rp',
      KRW: '₩', BRL: 'R$', MXN: '$', ZAR: 'R', TRY: '₺', SAR: '﷼', PKR: '₨',
      BDT: '৳', NPR: '₨', LKR: '₨', MMK: 'K', VND: '₫', PHP: '₱', HKD: 'HK$',
      NZD: 'NZ$', SEK: 'kr', NOK: 'kr', DKK: 'kr', RUB: '₽', PLN: 'zł',
    };
    const code = currencyStr.match(/\(([A-Z]{3})\)/)?.[1];
    return map[code] || code || '₹';
  };

  // Format minutes → "2h 30m" or "45m"
  const fmtTime = (mins) => {
    if (!mins || isNaN(mins)) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  // Single Overpass query — hotels + destination attractions + nearby (if far away)
  // Returns { hotels, attractions, nearbyPlaces }
  const fetchOverpassData = async (destLat, destLng, userLat, userLng, isNearby) => {
    const destQ = `
      node["tourism"~"hotel|guest_house|hostel"](around:10000,${destLat},${destLng});
      node["tourism"~"attraction|museum|viewpoint|artwork|gallery|theme_park"]["name"](around:15000,${destLat},${destLng});
      node["historic"~"monument|castle|ruins|archaeological_site|memorial"]["name"](around:15000,${destLat},${destLng});
      node["leisure"~"park|nature_reserve"]["name"](around:15000,${destLat},${destLng});
      ${isNearby ? `
      node["tourism"~"attraction|museum|viewpoint|artwork|gallery|theme_park"]["name"](around:15000,${userLat},${userLng});
      node["historic"~"monument|castle|ruins|archaeological_site|memorial"]["name"](around:15000,${userLat},${userLng});
      node["leisure"~"park|nature_reserve"]["name"](around:15000,${userLat},${userLng});
      ` : ""}
    `;
    try {
      const res = await axios.post(
        "/overpass/api/interpreter",
        `[out:json][timeout:20];(${destQ});out body 60;`
      );
      const els = res.data.elements;

      const hotels = els
        .filter(e => ["hotel","guest_house","hostel"].includes(e.tags?.tourism) && e.tags?.name)
        .map(e => ({
          name: e.tags.name,
          priceVal: Math.floor(Math.random() * 2000) + 950,
          rating: (Math.random() * (4.8 - 3.5) + 3.5).toFixed(1),
          tag: e.tags.tourism === "hotel" ? "Premium" : "Value Stay"
        })).sort((a, b) => a.priceVal - b.priceVal);

      const toPlace = e => ({
        name: e.tags.name,
        type: e.tags.tourism || e.tags.historic || e.tags.leisure || "attraction",
        lat: e.lat, lng: e.lon,
      });

      const isDestNode = e => {
        const dlat = Math.abs(e.lat - destLat), dlng = Math.abs(e.lon - destLng);
        return dlat < 0.15 && dlng < 0.15;
      };
      const isUserNode = e => {
        const dlat = Math.abs(e.lat - userLat), dlng = Math.abs(e.lon - userLng);
        return dlat < 0.15 && dlng < 0.15;
      };

      const nonHotel = els.filter(e => e.tags?.name && !["hotel","guest_house","hostel"].includes(e.tags?.tourism));
      const attractions = nonHotel.filter(isDestNode).slice(0, 8).map(toPlace);
      const nearbyPlaces = isNearby ? nonHotel.filter(isUserNode).slice(0, 8).map(toPlace) : [];

      return { hotels, attractions, nearbyPlaces };
    } catch { return { hotels: [], attractions: [], nearbyPlaces: [] }; }
  };

  // Fetch YouTube videos — scrapes ytInitialData from YouTube's own search page via Vite proxy
  const fetchVideos = async (cityName) => {
    const query = encodeURIComponent(cityName + " most visited places travel");

    // ── 1. Scrape YouTube search page (no API key, no third-party service)
    try {
      const res = await axios.get(`/ytsearch/results?search_query=${query}&hl=en`, {
        timeout: 10000,
        responseType: "text",
      });

      // YouTube embeds all search data as ytInitialData in the HTML
      const match = res.data.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
      if (match) {
        const ytData = JSON.parse(match[1]);
        const sectionContents =
          ytData?.contents?.twoColumnSearchResultsRenderer
            ?.primaryContents?.sectionListRenderer
            ?.contents?.[0]?.itemSectionRenderer?.contents || [];

        const videos = sectionContents
          .filter(c => c.videoRenderer?.videoId)
          .slice(0, 4)
          .map(c => {
            const v = c.videoRenderer;
            return {
              id:      v.videoId,
              title:   v.title?.runs?.[0]?.text || `${cityName} Travel`,
              channel: v.ownerText?.runs?.[0]?.text || "YouTube",
              views:   v.viewCountText?.simpleText || "Trending",
              thumb:   `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
              url:     `https://www.youtube.com/watch?v=${v.videoId}`,
            };
          });

        if (videos.length > 0) return videos;
      }
    } catch { /* fall through */ }

    // ── 2. Wikipedia external YouTube links
    try {
      const wRes = await axios.get(
        `/wikipedia/w/api.php?action=query&titles=${encodeURIComponent(cityName)}&prop=extlinks&ellimit=50&format=json&origin=*`,
        { timeout: 6000 }
      );
      const pages = Object.values(wRes.data.query?.pages || {});
      const ytUrls = (pages[0]?.extlinks || [])
        .map(l => l["*"])
        .filter(u => u?.includes("youtube.com/watch?v="))
        .slice(0, 4);

      if (ytUrls.length > 0) {
        return ytUrls.map(url => {
          const videoId = new URL(url).searchParams.get("v");
          return {
            id:      videoId,
            title:   `${cityName} — Featured Video`,
            channel: "YouTube",
            views:   "Featured",
            thumb:   `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            url:     `https://www.youtube.com/watch?v=${videoId}`,
          };
        });
      }
    } catch { /* fall through */ }

    // ── 3. Guaranteed fallback — always show search cards so section is never empty
    return [
      {
        id:      null,
        title:   `Top Places to Visit in ${cityName}`,
        channel: "Search on YouTube",
        views:   "Click to Watch",
        thumb:   `https://picsum.photos/seed/${cityName}yt1/800/450`,
        url:     `https://www.youtube.com/results?search_query=${encodeURIComponent(cityName + " top places to visit")}`,
      },
      {
        id:      null,
        title:   `${cityName} Travel Guide 2025`,
        channel: "Search on YouTube",
        views:   "Click to Watch",
        thumb:   `https://picsum.photos/seed/${cityName}yt2/800/450`,
        url:     `https://www.youtube.com/results?search_query=${encodeURIComponent(cityName + " travel guide")}`,
      },
    ];
  };

  // Fetch latest news headlines via Google News RSS
  const fetchLatestNews = async (placeName) => {
    try {
      const q = encodeURIComponent(placeName);
      const res = await axios.get(`/gnews/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, {
        timeout: 8000,
        responseType: "text",
      });
      const parser = new DOMParser();
      const xml = parser.parseFromString(res.data, "text/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0, 3);
      return items.map(item => ({
        title:  item.querySelector("title")?.textContent?.replace(/ - [^-]+$/, "").trim() || "",
        url:    item.querySelector("link")?.textContent?.trim() || "#",
        source: item.querySelector("source")?.textContent?.trim() || "News",
        date:   item.querySelector("pubDate")?.textContent?.trim() || "",
      })).filter(n => n.title);
    } catch { return []; }
  };

  const getKM = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // Map star rating number to a price estimate
  const starToPrice = (star, priceRange) => {
    const match = priceRange?.match(/[\d,]+/);
    if (match) return parseInt(match[0].replace(/,/g, ""));
    const base = { 5: 8000, 4: 4500, 3: 2500, 2: 1500, 1: 950 };
    return base[star] || 1500;
  };

  const starToTag = (star) => {
    if (star >= 5) return "Luxury";
    if (star >= 4) return "Premium";
    if (star >= 3) return "Value Stay";
    return "Budget";
  };

  // Fetch multiple real Wikipedia photos for the hero carousel
  // Step 1: get image filename list from the article
  // Step 2: resolve filenames → actual CDN URLs, filter out icons/flags/maps
  const fetchPlaceImages = async (placeName, mainImageUrl) => {
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
  // Strategy 1: direct article title match (fast, works for famous places)
  // Strategy 2: Wikipedia search generator (works for hotel chains, variants, misspellings)
  const fetchWikiImage = async (name, size = 400) => {
    // Direct article lookup
    try {
      const res = await axios.get(
        `/wikipedia/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&pithumbsize=${size}&format=json&origin=*`,
        { timeout: 5000 }
      );
      const pages = Object.values(res.data.query?.pages || {});
      if (pages[0]?.pageid !== -1 && pages[0]?.thumbnail?.source) {
        return pages[0].thumbnail.source;
      }
    } catch {}

    // Search-generator fallback — finds closest Wikipedia article and returns its lead image
    try {
      const res = await axios.get(
        `/wikipedia/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1&prop=pageimages&pithumbsize=${size}&format=json&origin=*`,
        { timeout: 5000 }
      );
      const pages = Object.values(res.data.query?.pages || {});
      if (pages[0]?.thumbnail?.source) return pages[0].thumbnail.source;
    } catch {}

    return null;
  };

  const fetchLocationData = async (lat, lng, shouldUpdateUrl = true, overrideName = null) => {
    setLoading(true);
    setSuggestions([]);

    try {
      const [geo, weather] = await Promise.all([
        overrideName
          ? Promise.resolve({ data: {} })
          : axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`),
        axios.get(`/openmeteo/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
      ]);

      const cityName = overrideName || geo.data.city || geo.data.locality || geo.data.principalSubdivision || "Location";

      if (shouldUpdateUrl) {
        const url = new URL(window.location);
        url.searchParams.set("city", cityName);
        window.history.pushState({ city: cityName }, '', url);
      }

      const dist = userCoords ? getKM(userCoords.lat, userCoords.lng, lat, lng) : null;

      // ── Step 1: Call backend DB first (checks DB, if missing calls Azure OpenAI & saves) ──
      let dbPlace = null;
      try {
        const backendRes = await axios.post("/api/places/search", { place: cityName });
        dbPlace = backendRes.data;
      } catch (e) {
        console.warn("Backend unavailable, falling back to Overpass/Wiki:", e.message);
      }

      let rooms = [{ name: "Local Stay", priceVal: 1100, rating: "4.1", tag: "Value" }];
      let attractions = [];
      let nearbyPlaces = [];
      let imageUrl = `https://picsum.photos/seed/${cityName}/1200/800`;
      let summary = `Explore the beautiful sights and sounds of ${cityName}.`;
      let finalLat = lat;
      let finalLng = lng;

      if (dbPlace) {
        // ── Map DB data to UI format ──
        finalLat = dbPlace.latitude || lat;
        finalLng = dbPlace.longitude || lng;

        // Hotels → rooms
        if (dbPlace.hotels?.length > 0) {
          rooms = dbPlace.hotels
            .map(h => ({
              name:     h.name,
              priceVal: starToPrice(h.star_rating, h.price_range),
              rating:   h.star_rating ? Math.min(5, (2.5 + h.star_rating * 0.5)).toFixed(1) : "4.0",
              tag:      starToTag(h.star_rating),
            }))
            .sort((a, b) => a.priceVal - b.priceVal);
        }

        // Attractions → attractions
        if (dbPlace.attractions?.length > 0) {
          attractions = dbPlace.attractions.map(a => ({
            name:      a.name,
            type:      a.type || "attraction",
            entry_fee: a.entry_fee || null,
            lat:       finalLat,
            lng:       finalLng,
          }));
        }

        // Nearby areas → nearbyPlaces
        if (dbPlace.nearby_areas?.length > 0) {
          nearbyPlaces = dbPlace.nearby_areas.map(n => ({
            name: n.name,
            type: "nearby",
            lat:  finalLat,
            lng:  finalLng,
          }));
        }

        // Description from DB
        if (dbPlace.description) summary = dbPlace.description;

        // Hero image from Wikipedia
        try {
          const wikiRes = await axios.get(
            `/wikipedia/api/rest_v1/page/summary/${encodeURIComponent(dbPlace.place_name || cityName)}`
          );
          if (wikiRes.data.originalimage?.source) imageUrl = wikiRes.data.originalimage.source;
          if (!dbPlace.description && wikiRes.data.extract) summary = wikiRes.data.extract;
        } catch { /* keep picsum fallback */ }

        // If DB has no hotels or attractions, supplement with Overpass
        if (rooms.length <= 1 || attractions.length === 0) {
          const userLat = userCoords?.lat ?? finalLat;
          const userLng = userCoords?.lng ?? finalLng;
          const dist0 = userCoords ? getKM(userCoords.lat, userCoords.lng, finalLat, finalLng) : 0;
          try {
            const opData = await fetchOverpassData(finalLat, finalLng, userLat, userLng, dist0 > 5);
            if (rooms.length <= 1 && opData.hotels.length > 0) rooms = opData.hotels;
            if (attractions.length === 0 && opData.attractions.length > 0) attractions = opData.attractions;
            if (nearbyPlaces.length === 0 && opData.nearbyPlaces.length > 0) nearbyPlaces = opData.nearbyPlaces;
          } catch { /* keep existing data */ }
        }

      } else {
        // ── Fallback: Overpass + Wikipedia when backend is down ──
        const userLat = userCoords?.lat ?? lat;
        const userLng = userCoords?.lng ?? lng;
        const dist0 = userCoords ? getKM(userCoords.lat, userCoords.lng, lat, lng) : 0;
        const isNearby = dist0 > 5;

        const [overpassResult, wikiRes] = await Promise.allSettled([
          fetchOverpassData(lat, lng, userLat, userLng, isNearby),
          axios.get(`/wikipedia/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`),
        ]);

        const { hotels: sortedRooms = [], attractions: oAttractions = [], nearbyPlaces: oNearby = [] } =
          overpassResult.status === "fulfilled" ? overpassResult.value : {};

        rooms       = sortedRooms.length > 0 ? sortedRooms : rooms;
        attractions = oAttractions;
        nearbyPlaces = oNearby;

        if (wikiRes.status === "fulfilled") {
          if (wikiRes.value.data.originalimage?.source) imageUrl = wikiRes.value.data.originalimage.source;
          if (wikiRes.value.data.extract) summary = wikiRes.value.data.extract;
        }
      }

      // ── Step 2: Fetch videos + real images for hero/attractions/hotels/restaurants/foods/souvenirs — all in parallel ──
      const restaurants = dbPlace?.restaurants || [];
      const famousFoods = dbPlace?.famous_foods || [];
      const souvenirs   = dbPlace?.souvenirs || [];

      const [videosData, heroImages, attractionImgs, hotelImgs, restaurantImgs, foodImgs, souvenirImgs, headlines] = await Promise.all([
        fetchVideos(cityName).catch(() => []),
        fetchPlaceImages(dbPlace?.place_name || cityName, imageUrl),
        Promise.all(attractions.slice(0, 6).map(a => fetchWikiImage(a.name, 400))),
        Promise.all(rooms.slice(0, 6).map(r =>
          fetchWikiImage(r.name, 200).then(img => img || fetchWikiImage(`${r.name} ${cityName}`, 200))
        )),
        Promise.all(restaurants.slice(0, 8).map(r =>
          fetchWikiImage(r.name, 300).then(img => img || fetchWikiImage(`${r.cuisine} food ${cityName}`, 300))
        )),
        Promise.all(famousFoods.slice(0, 8).map(f =>
          fetchWikiImage(f.name, 300).then(img => img || fetchWikiImage(`${f.name} dish`, 300))
        )),
        Promise.all(souvenirs.slice(0, 8).map(s =>
          fetchWikiImage(s.name, 300).then(img => img || fetchWikiImage(`${s.name} craft`, 300))
        )),
        fetchLatestNews(dbPlace?.place_name || cityName).catch(() => []),
      ]);

      // Attach real Wikipedia images; picsum keyed by hotel tag as last resort so it's at least thematic
      const hotelFallbackSeeds = { Luxury: "luxury-hotel-room", Premium: "hotel-lobby", "Value Stay": "hotel-room", Budget: "hostel-room" };
      attractions = attractions.map((a, i) => ({
        ...a,
        imageUrl: attractionImgs[i] || `https://picsum.photos/seed/${encodeURIComponent(a.name)}/400/300`,
      }));
      rooms = rooms.map((r, i) => ({
        ...r,
        imageUrl: hotelImgs[i] || `https://picsum.photos/seed/${encodeURIComponent(hotelFallbackSeeds[r.tag] || "hotel") + i}/200/150`,
      }));

      // Attach images to restaurants, foods, souvenirs
      const restaurantsWithImgs = restaurants.map((r, i) => ({
        ...r,
        imageUrl: restaurantImgs[i] || `https://picsum.photos/seed/restaurant${i}/300/200`,
      }));
      const famousFoodsWithImgs = famousFoods.map((f, i) => ({
        ...f,
        imageUrl: foodImgs[i] || `https://picsum.photos/seed/food${i}/300/200`,
      }));
      const souvenirsWithImgs = souvenirs.map((s, i) => ({
        ...s,
        imageUrl: souvenirImgs[i] || `https://picsum.photos/seed/souvenir${i}/300/200`,
      }));

      const locationData = {
        name: dbPlace?.place_name || cityName,
        temp: weather.data.current_weather.temperature,
        lat: finalLat,
        lng: finalLng,
        times: dist ? {
          car:    fmtTime(Math.round((dist / 40) * 60)),
          bus:    fmtTime(Math.round((dist / 25) * 60 + 10)),
          train:  fmtTime(Math.round((dist / 55) * 60 + 15)),
          flight: dist < 150 ? fmtTime(Math.round((dist / 700) * 60 + 60)) : fmtTime(Math.round((dist / 700) * 60 + 90)),
          rawDist: dist
        } : { car: "--", bus: "--", train: "--", flight: "--", rawDist: 0 },
        imageUrl,
        heroImages,
        attractions,
        nearbyPlaces,
        videos: videosData,
        rooms,
        news: [{ summary }],
        headlines,
        dbData: dbPlace ? {
          ...dbPlace,
          restaurants:  restaurantsWithImgs,
          famous_foods: famousFoodsWithImgs,
          souvenirs:    souvenirsWithImgs,
        } : null,
      };

      setData(locationData);
      updateSEO(locationData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUrlSearch = async (query) => {
    try {
      const res = await axios.get(`/nominatim/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      if (res.data.length > 0) fetchLocationData(parseFloat(res.data[0].lat), parseFloat(res.data[0].lon), false, query);
    } catch (e) { console.error(e); }
  };

  // --- 3. LIFECYCLE EFFECTS ---

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    const params = new URLSearchParams(window.location.search);
    const cityInUrl = params.get("city");
    if (cityInUrl) {
      handleUrlSearch(cityInUrl);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchLocationData(pos.coords.latitude, pos.coords.longitude, false),
        () => fetchLocationData(17.4933, 78.3498, false)
      );
    }
  }, []);

  // Recalculate distance once when userCoords arrives and rawDist is still 0
  useEffect(() => {
    if (!userCoords) return;
    setData(prev => {
      if (!prev || prev.times.rawDist > 0) return prev;
      const dist = getKM(userCoords.lat, userCoords.lng, prev.lat, prev.lng);
      return {
        ...prev,
        times: {
          car:    fmtTime(Math.round((dist / 40) * 60)),
          bus:    fmtTime(Math.round((dist / 25) * 60 + 10)),
          train:  fmtTime(Math.round((dist / 55) * 60 + 15)),
          flight: dist < 150 ? fmtTime(Math.round((dist / 700) * 60 + 60)) : fmtTime(Math.round((dist / 700) * 60 + 90)),
          rawDist: dist,
        },
      };
    });
  }, [userCoords]);

  // Back button watcher
  useEffect(() => {
    const onPop = () => {
      const city = new URLSearchParams(window.location.search).get("city");
      if (city) handleUrlSearch(city);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="bg-[#f2f2f2] min-h-screen font-sans text-slate-900">

      {/* ── HEADER ── */}
      <header className="bg-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4">
          {/* Brand */}
          <a href="/" className="flex items-center shrink-0 group">
            <img
              src={logo}
              alt="GlideMyWay"
              className="h-16 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-all duration-300"
            />
          </a>

          {/* Search */}
          <div className="flex-1 relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text" value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                clearTimeout(searchDebounce.current);
                if (e.target.value.length > 2) {
                  searchDebounce.current = setTimeout(() => {
                    axios.get(`/nominatim/search?q=${e.target.value}&format=json&limit=5`).then(res => setSuggestions(res.data));
                  }, 500);
                } else {
                  setSuggestions([]);
                }
              }}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-full text-sm outline-none focus:ring-0 focus:border-green-500 bg-gray-50 transition-colors"
              placeholder="Search destinations, attractions, hotels..."
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-100">
                {suggestions.map((p, i) => (
                  <div key={i}
                    onClick={() => { setSearch(""); fetchLocationData(parseFloat(p.lat), parseFloat(p.lon), true, p.display_name.split(",")[0].trim()); }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-slate-100 last:border-0 transition"
                  >
                    <MapPin size={14} className="text-green-500 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{p.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share */}
          {data && (
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }}
              className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-green-600 transition shrink-0"
            >
              <Share2 size={16} /> Share
            </button>
          )}
        </div>
      </header>

      {/* ── LOADING ── */}
      {loading ? (
        <div className="flex h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-semibold text-sm">{search ? `Searching for ${search}…` : "Detecting your location…"}</p>
          </div>
        </div>
      ) : data && (
        <>
          {/* ── HERO BANNER CAROUSEL ── */}
          <div className="relative h-72 md:h-[26rem] overflow-hidden bg-slate-900 rounded-3xl mx-4 mt-5 md:mx-8 shadow-2xl">
            {/* Images */}
            {data.heroImages.map((src, i) => (
              <img
                key={src}
                src={src}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === heroIdx ? "opacity-100" : "opacity-0"}`}
                alt={`${data.name} photo ${i + 1}`}
                onError={e => { e.target.src = `https://picsum.photos/seed/${data.name}${i}/1200/800`; }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

            {/* Left arrow */}
            <button
              onClick={() => setHeroIdx(i => (i - 1 + data.heroImages.length) % data.heroImages.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2.5 rounded-full transition z-10 border border-white/30"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Right arrow */}
            <button
              onClick={() => setHeroIdx(i => (i + 1) % data.heroImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2.5 rounded-full transition z-10 border border-white/30"
            >
              <ChevronRight size={20} />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-20 right-5 flex gap-1.5 z-10">
              {data.heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className={`rounded-full transition-all ${i === heroIdx ? "bg-white w-5 h-2" : "bg-white/45 hover:bg-white/70 w-2 h-2"}`}
                />
              ))}
            </div>

            {/* Image counter */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 border border-white/20">
              {heroIdx + 1} / {data.heroImages.length}
            </div>

            {/* City info */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 text-white z-10">
              {data.dbData && (
                <p className="text-xs text-white/55 mb-2 flex items-center gap-1 flex-wrap">
                  <span>Home</span>
                  {data.dbData.continent   && <><ChevronRight size={10}/><span>{data.dbData.continent}</span></>}
                  {data.dbData.country_name && <><ChevronRight size={10}/><span>{data.dbData.country_name}</span></>}
                  {data.dbData.state       && <><ChevronRight size={10}/><span>{data.dbData.state}</span></>}
                  <ChevronRight size={10}/><span className="text-white font-semibold">{data.name}</span>
                </p>
              )}
              <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-lg">{data.name}</h1>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/25">
                  <Cloud size={13}/> {data.temp}°C
                </span>
                {data.times.rawDist > 0 && (
                  <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/25">
                    <MapPin size={12}/> {data.times.rawDist.toFixed(1)} km away</span>
                )}
              </div>
            </div>
          </div>

          {/* ── QUICK INFO STRIP ── */}
          {data.dbData && (
            <div className="bg-white border-b border-slate-200 shadow-sm">
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {data.dbData.country_name && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default"><Globe size={11} className="text-green-500"/>{data.dbData.country_name}</span>}
                {data.dbData.language     && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default">🗣 {data.dbData.language}</span>}
                {data.dbData.currency     && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default"><Coins size={11} className="text-green-500"/>{data.dbData.currency}</span>}
                {data.dbData.timezone     && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default"><Clock size={11} className="text-slate-400"/>{data.dbData.timezone}</span>}
                {data.dbData.best_time_to_visit && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default">📅 {data.dbData.best_time_to_visit}</span>}
                {data.dbData.famous_for   && <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 cursor-default">⭐ {data.dbData.famous_for}</span>}
              </div>
            </div>
          )}

          {/* ── MOBILE TOP STRIP: About + Weather ── */}
          <div className="lg:hidden max-w-7xl mx-auto px-4 pt-5 space-y-3">
            {/* Weather — compact horizontal */}
            <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weather</p>
                <div className="text-2xl font-black text-slate-800 leading-none mt-0.5">{data.temp}°C</div>
                {data.times.rawDist > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5"><MapPin size={9}/> {data.times.rawDist.toFixed(1)} km away</p>
                )}
              </div>
              <Cloud size={36} className="text-blue-300" />
            </div>
            {/* About — mobile */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h2 className="text-sm font-bold text-slate-800 mb-2">About {data.name}</h2>
              {/* Always-visible summary */}
              <p className={`text-sm text-slate-600 leading-relaxed ${showFullAbout ? '' : 'line-clamp-3'}`}>
                {data.news[0].summary}
              </p>
              {/* Expanded details */}
              {showFullAbout && data.dbData && (
                <div className="mt-3 space-y-3">
                  {/* Key facts grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: '🌍', label: 'Country',    val: data.dbData.country_name },
                      { icon: '🗺️', label: 'State',      val: data.dbData.state },
                      { icon: '📍', label: 'District',   val: data.dbData.district },
                      { icon: '🌐', label: 'Continent',  val: data.dbData.continent },
                      { icon: '👥', label: 'Population', val: data.dbData.population },
                      { icon: '🗣️', label: 'Language',   val: data.dbData.language },
                      { icon: '💰', label: 'Currency',   val: data.dbData.currency },
                      { icon: '🕐', label: 'Timezone',   val: data.dbData.timezone },
                    ].filter(r => r.val).map(r => (
                      <div key={r.label} className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{r.icon} {r.label}</p>
                        <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">{r.val}</p>
                      </div>
                    ))}
                  </div>
                  {data.dbData.famous_for && (
                    <div className="bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-100">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-amber-500 mb-0.5">⭐ Famous For</p>
                      <p className="text-xs text-slate-700">{data.dbData.famous_for}</p>
                    </div>
                  )}
                  {data.dbData.best_time_to_visit && (
                    <div className="bg-emerald-50 rounded-lg px-3 py-2.5 border border-emerald-100">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 mb-0.5">📅 Best Time to Visit</p>
                      <p className="text-xs text-slate-700">{data.dbData.best_time_to_visit}</p>
                    </div>
                  )}
                  {/* Restaurants */}
                  {data.dbData.restaurants?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">🍽️ Restaurants</p>
                      <div className="space-y-1.5">
                        {data.dbData.restaurants.map((r, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-slate-700 truncate">{r.name}</p>
                              <p className="text-[9px] text-slate-400">{r.cuisine}</p>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 shrink-0 ml-2 whitespace-nowrap">{r.price_range}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Famous Foods */}
                  {data.dbData.famous_foods?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">🍛 Famous Foods</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {data.dbData.famous_foods.map((food, i) => (
                          <div key={i} className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                            <p className="text-[11px] font-bold text-slate-800 leading-tight">{food.name}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{food.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Souvenirs */}
                  {data.dbData.souvenirs?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">🛍️ Things to Take Home</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {data.dbData.souvenirs.map((item, i) => (
                          <div key={i} className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                            <p className="text-[11px] font-bold text-slate-800 leading-tight">{item.name}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowFullAbout(v => !v)}
                className="mt-3 text-xs font-bold text-green-600 hover:text-green-800 transition flex items-center gap-1 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-full bg-green-50 hover:bg-green-100"
              >
                {showFullAbout ? 'Show less ▲' : 'Show more info ▼'}
              </button>
            </div>
          </div>

          {/* ── MAIN LAYOUT ── */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT / MAIN COLUMN ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* About — desktop only */}
              <section className="hidden lg:block bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-xl font-black text-slate-800 mb-1">About {data.name}</h2>
                <div className="w-10 h-1 bg-green-500 rounded-full mb-4" />
                <p className={`text-sm text-slate-600 leading-relaxed ${showFullAbout ? '' : 'line-clamp-4'}`}>
                  {data.news[0].summary}
                </p>

                {/* Expanded details */}
                {showFullAbout && data.dbData && (
                  <div className="mt-4 space-y-4">
                    {/* Key facts grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { icon: '🌍', label: 'Country',    val: data.dbData.country_name },
                        { icon: '🗺️', label: 'State',      val: data.dbData.state },
                        { icon: '📍', label: 'District',   val: data.dbData.district },
                        { icon: '🌐', label: 'Continent',  val: data.dbData.continent },
                        { icon: '👥', label: 'Population', val: data.dbData.population },
                        { icon: '🗣️', label: 'Language',   val: data.dbData.language },
                        { icon: '💰', label: 'Currency',   val: data.dbData.currency },
                        { icon: '🕐', label: 'Timezone',   val: data.dbData.timezone },
                      ].filter(r => r.val).map(r => (
                        <div key={r.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{r.icon} {r.label}</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{r.val}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data.dbData.famous_for && (
                        <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-amber-500 mb-1">⭐ Famous For</p>
                          <p className="text-sm text-slate-700">{data.dbData.famous_for}</p>
                        </div>
                      )}
                      {data.dbData.best_time_to_visit && (
                        <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 mb-1">📅 Best Time to Visit</p>
                          <p className="text-sm text-slate-700">{data.dbData.best_time_to_visit}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowFullAbout(v => !v)}
                  className="mt-4 text-xs font-bold text-green-600 hover:text-green-800 transition flex items-center gap-1 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-full bg-green-50 hover:bg-green-100"
                >
                  {showFullAbout ? 'Show less ▲' : 'Show more info ▼'}
                </button>
              </section>

              {/* How to Get There + Latest News */}
              <section className="bg-white rounded-2xl shadow-md p-5">
                <div className="flex gap-5">
                  {/* Transport buttons — compact */}
                  <div className="shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2.5">🗺 Get There</p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { mode: 'car',    emoji: '🚗', label: 'Car',    travelMode: 'driving', activeClass: 'border-green-400 bg-green-50 shadow-md',   textClass: 'text-green-700' },
                        { mode: 'bus',    emoji: '🚌', label: 'Bus',    travelMode: 'transit', activeClass: 'border-blue-400 bg-blue-50 shadow-md',     textClass: 'text-blue-700' },
                        { mode: 'train',  emoji: '🚂', label: 'Train',  travelMode: 'transit', activeClass: 'border-purple-400 bg-purple-50 shadow-md', textClass: 'text-purple-700' },
                        { mode: 'flight', emoji: '✈️', label: 'Flight', travelMode: 'driving', activeClass: 'border-sky-400 bg-sky-50 shadow-md',       textClass: 'text-sky-700' },
                      ].map(({ mode, emoji, label, travelMode, activeClass, textClass }) => {
                        const active = selectedTransport?.mode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => setSelectedTransport(active ? null : { mode, emoji, label, travelMode })}
                            className={`flex items-center gap-2 border-2 rounded-xl px-3 py-2 transition-all text-left ${
                              active ? activeClass : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                            }`}
                          >
                            <span className="text-base">{emoji}</span>
                            <span className="text-[10px] font-bold text-slate-500 w-8">{label}</span>
                            <span className={`text-xs font-black transition ${active ? textClass : 'text-slate-800'}`}>{data.times[mode]}</span>
                            <span className={`ml-auto text-[9px] transition ${active ? 'text-slate-500' : 'text-slate-300'}`}>{active ? '▲' : '▼'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px bg-slate-100 shrink-0" />

                  {/* Latest News — scrollable */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Latest News
                    </p>
                    {data.headlines && data.headlines.length > 0 ? (
                      <div className="overflow-y-auto max-h-[110px] space-y-2 pr-1">
                        {data.headlines.map((h, i) => (
                          <a key={i} href={h.url} target="_blank" rel="noopener noreferrer" className="block group">
                            <p className="text-[11px] font-semibold text-slate-700 leading-snug line-clamp-2 group-hover:text-green-600 transition">{h.title}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{h.source}</p>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No recent news found.</p>
                    )}
                  </div>
                </div>

                {/* Expandable directions panel */}
                {selectedTransport && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{selectedTransport.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">By {selectedTransport.label} to {data.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Est. travel time: <span className="font-bold text-slate-700">{data.times[selectedTransport.mode]}</span>
                            {data.times.rawDist > 0 && <> · {data.times.rawDist.toFixed(1)} km away</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}&travelmode=${selectedTransport.travelMode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition"
                        >
                          Open in Maps
                        </a>
                        <button
                          onClick={() => setSelectedTransport(null)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition"
                        >
                          Show Less
                        </button>
                      </div>
                    </div>
                    {/* Route map */}
                    <div className="rounded-2xl overflow-hidden border border-slate-200 h-56 shadow-sm">
                      <Suspense fallback={<div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">Loading map…</div>}>
                        <RouteMap
                          fromLat={userCoords?.lat}
                          fromLng={userCoords?.lng}
                          toLat={data.lat}
                          toLng={data.lng}
                          mode={selectedTransport.mode}
                          placeName={data.name}
                        />
                      </Suspense>
                    </div>
                  </div>
                )}
              </section>

              {/* Top Things to Do */}
              {data.attractions.length > 0 && (
                <section className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Top Things to Do</h2>
                      <div className="w-8 h-1 bg-green-500 rounded-full mt-1" />
                    </div>
                  </div>
                  {/* Mobile: horizontal scroll | Desktop: 3-col grid */}
                  <div className="p-4 flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
                    {data.attractions.slice(0, 6).map((place, idx) => (
                      <a
                        key={idx}
                        href={`/?city=${encodeURIComponent(place.name)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 shrink-0 snap-start w-[46vw] sm:w-auto border border-slate-100"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          <img
                            src={place.imageUrl}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                            alt={place.name}
                            onError={e => { e.target.src = `https://picsum.photos/seed/place${idx + 10}/400/300`; }}
                          />
                          {/* Entry fee badge */}
                          {place.entry_fee && (
                            <div className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md ${
                              String(place.entry_fee).toLowerCase() === 'free'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-amber-400 text-slate-900'
                            }`}>
                              {String(place.entry_fee).toLowerCase() === 'free' ? '✓ Free' : `${getCurrencySymbol(data.dbData?.currency)}${place.entry_fee}`}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-emerald-300 mb-0.5">
                              {place.type.replace(/_/g, " ")}
                            </span>
                            <p className="text-xs font-bold text-white leading-tight line-clamp-2">{place.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 bg-white">
                          <span className="text-[10px] text-slate-500 font-semibold truncate">Explore</span>
                          <ChevronRight size={12} className="text-slate-300 group-hover:text-green-500 shrink-0 transition" />
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Famous Restaurants */}
              {data.dbData?.restaurants?.length > 0 && (
                <section className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Famous Restaurants</h2>
                      <div className="w-8 h-1 bg-orange-500 rounded-full mt-1" />
                    </div>
                  </div>
                  <div className="p-4 flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
                    {data.dbData.restaurants.map((r, i) => (
                      <a
                        key={i}
                        href={`https://www.google.com/search?q=${encodeURIComponent(r.name + " " + data.name)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="group shrink-0 snap-start w-[70vw] sm:w-auto bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-slate-100"
                      >
                        <div className="relative h-32 overflow-hidden bg-orange-50">
                          <img
                            src={r.imageUrl}
                            alt={r.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            onError={e => { e.target.src = `https://picsum.photos/seed/restaurant${i}/300/200`; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full">{r.cuisine}</span>
                        </div>
                        <div className="px-3 py-2.5 flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-orange-700 truncate">{r.name}</p>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2 whitespace-nowrap">{r.price_range}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Famous Foods */}
              {data.dbData?.famous_foods?.length > 0 && (
                <section className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Famous Foods</h2>
                      <div className="w-8 h-1 bg-amber-400 rounded-full mt-1" />
                    </div>
                  </div>
                  <div className="p-4 flex sm:grid sm:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
                    {data.dbData.famous_foods.map((food, i) => (
                      <div key={i} className="shrink-0 snap-start w-[58vw] sm:w-auto bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-slate-100">
                        <div className="relative h-28 overflow-hidden bg-amber-50">
                          <img
                            src={food.imageUrl}
                            alt={food.name}
                            className="w-full h-full object-cover hover:scale-105 transition duration-500"
                            onError={e => { e.target.src = `https://picsum.photos/seed/food${i}/300/200`; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{food.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">{food.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Trending Videos */}
              <section className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                    <PlayCircle size={16} className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Travel Videos</h2>
                    <div className="w-8 h-1 bg-red-400 rounded-full mt-0.5" />
                  </div>
                </div>
                {/* Mobile: horizontal scroll | Desktop: 2-col grid */}
                <div className="p-4 flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
                  {data.videos.map((v, idx) => (
                    <div
                      key={idx}
                      className="group cursor-pointer shrink-0 snap-start w-[72vw] sm:w-auto"
                      onMouseEnter={() => v.id && setHoveredVideo(idx)}
                      onMouseLeave={() => setHoveredVideo(null)}
                    >
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-200 shadow-md">
                        {hoveredVideo === idx && v.id ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${v.id}?autoplay=1&mute=1&controls=1&rel=0`}
                            className="w-full h-full"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={v.title}
                          />
                        ) : (
                          <>
                            <img
                              src={v.thumb}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              alt={v.title}
                              onError={e => { e.target.src = `https://picsum.photos/seed/${idx}/800/450`; }}
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center">
                              <PlayCircle className="text-white opacity-90" size={44} />
                            </div>
                            {v.id && (
                              <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">YT</span>
                            )}
                          </>
                        )}
                      </div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer">
                        <p className="text-sm font-bold text-slate-800 mt-2.5 leading-snug line-clamp-2 hover:text-red-600 transition">{v.title}</p>
                      </a>
                      <p className="text-[10px] text-slate-400 mt-0.5">{v.channel} · {v.views}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── RIGHT / SIDEBAR COLUMN ── */}
            <div className="space-y-5">

              {/* Weather card — hidden on mobile (shown in top strip instead) */}
              <div className="hidden lg:block bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl shadow-lg p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">Current Weather</p>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-5xl font-black">{data.temp}°C</div>
                    <div className="text-xs text-white/70 mt-1 flex items-center gap-1"><MapPin size={11}/> {data.name}</div>
                  </div>
                  <Cloud size={52} className="text-white/50" />
                </div>
                {data.times.rawDist > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/70 flex items-center gap-1">
                    <MapPin size={11}/> {data.times.rawDist.toFixed(1)} km from your location
                  </div>
                )}
              </div>

              {/* Hotels — room photo grid */}
              <section className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-800">Top Rated Hotels</h3>
                    <div className="w-6 h-0.5 bg-green-500 rounded-full mt-1" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <ArrowDownWideNarrow size={11}/> Price
                  </span>
                </div>
                {/* Mobile: horizontal scroll | Desktop: 2-col photo grid */}
                <div className="p-3 flex lg:grid lg:grid-cols-2 gap-2 overflow-x-auto lg:overflow-visible snap-x snap-mandatory lg:snap-none scrollbar-none">
                  {data.rooms.map((room, idx) => (
                    <div
                      key={idx}
                      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(room.name + " " + data.name)}`, "_blank")}
                      className="shrink-0 snap-start w-[44vw] lg:w-auto cursor-pointer group"
                    >
                      {/* Room photo */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-sm group-hover:shadow-lg transition-shadow duration-300">
                        <img
                          src={room.imageUrl}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                          alt={room.name}
                          onError={e => { e.target.src = `https://picsum.photos/seed/hotel${idx + 20}/200/150`; }}
                        />
                        {/* Rating badge top-right */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-green-600 text-white rounded-full px-2 py-0.5 shadow-md">
                          <Star size={8} fill="white" />
                          <span className="text-[10px] font-black">{room.rating}</span>
                        </div>
                        {/* Gradient + name overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-1.5 left-2 right-2">
                          <p className="text-[10px] font-bold text-white leading-tight line-clamp-1">{room.name}</p>
                          <p className="text-[9px] text-white/80">{getCurrencySymbol(data.dbData?.currency)}{room.priceVal?.toLocaleString() ?? '–'}<span className="text-white/60">/night</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Places to Buy ── */}
              {data.dbData?.souvenirs?.length > 0 && (
                <section className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800">Things to take home</h3>
                      <div className="w-6 h-0.5 bg-purple-500 rounded-full mt-1" />
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3">
                    {data.dbData.souvenirs.map((item, idx) => (
                      <div key={idx} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-slate-100 cursor-default">
                        <div className="relative h-24 overflow-hidden bg-purple-50">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            onError={e => { e.target.src = `https://picsum.photos/seed/souvenir${idx}/300/200`; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        </div>
                        <div className="px-2.5 py-2">
                          <p className="text-[11px] font-bold text-slate-800 leading-tight group-hover:text-purple-700 transition">{item.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Nearby Areas */}
              {data.nearbyPlaces.length > 0 && (
                <section className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-base font-black text-slate-800">Nearby Areas</h3>
                    <div className="w-6 h-0.5 bg-slate-300 rounded-full mt-1" />
                  </div>
                  <div>
                    {data.nearbyPlaces.map((place, idx) => (
                      <a
                        key={idx}
                        href={`/?city=${encodeURIComponent(place.name)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-green-50 transition group"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-green-100 flex items-center justify-center transition shrink-0">
                          <MapPin size={12} className="text-slate-400 group-hover:text-green-600 transition" />
                        </div>
                        <span className="text-sm text-slate-700 group-hover:text-green-700 font-semibold transition">{place.name}</span>
                        <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-green-400 transition" />
                      </a>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </main>
        </>
      )}
    </div>
  );
}

export default App;