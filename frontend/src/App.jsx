import { useState, useEffect } from "react";
import axios from "axios";
import logo from "./assets/logo.jpeg";
import { Share2, Cloud, MapPin } from "lucide-react";

// Utils
import { fmtTime, getKM, starToPrice, starToTag } from "./utils/format";
import { buildSlug, parseSlug, updateSEO } from "./utils/seo";
import { wikiQueue } from "./utils/wikiQueue";

// API helpers
import { fetchWikiImage, fetchPlaceImages } from "./api/wikipedia";
import { fetchOverpassData } from "./api/overpass";
import { fetchVideos } from "./api/videos";
import { fetchLatestNews } from "./api/news";

// Components
import LoadingSpinner from "./components/LoadingSpinner";
import SearchBar from "./components/SearchBar";
import HeroCarousel from "./components/HeroCarousel";
import QuickInfoStrip from "./components/QuickInfoStrip";
import AboutSection from "./components/AboutSection";
import TransportSection from "./components/TransportSection";
import NewsSection from "./components/NewsSection";
import AttractionsSection from "./components/AttractionsSection";
import RestaurantsSection from "./components/RestaurantsSection";
import FamousFoodsSection from "./components/FamousFoodsSection";
import VideosSection from "./components/VideosSection";
import WeatherCard from "./components/WeatherCard";
import HotelsSection from "./components/HotelsSection";
import SouvenirsSection from "./components/SouvenirsSection";
import NearbySection from "./components/NearbySection";
import PlanModal from "./components/PlanModal";

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
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planDays, setPlanDays]           = useState(3);
  const [planTravelers, setPlanTravelers] = useState(2);
  const [planInterests, setPlanInterests] = useState([]);
  const [planLoading, setPlanLoading]     = useState(false);
  const [planData, setPlanData]           = useState(null);

  // Reset state whenever destination changes
  useEffect(() => {
    setHeroIdx(0);
    setShowFullAbout(false);
    setShowPlanModal(false);
    setPlanData(null);
    setPlanInterests([]);
    setPlanDays(3);
    setPlanTravelers(2);
  }, [data?.name]);

  // fetchLocationData must stay here because it uses state setters as closures
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

      // Push a simple slug immediately so the URL updates right away
      if (shouldUpdateUrl) {
        const simpleSlug = buildSlug(cityName, null);
        window.history.pushState({ city: cityName }, '', simpleSlug);
      }

      const dist = userCoords ? getKM(userCoords.lat, userCoords.lng, lat, lng) : null;

      // ── Step 1: Call backend DB first (checks DB, if missing calls Azure OpenAI & saves) ──
      let dbPlace = null;
      try {
        const backendRes = await axios.post("/api/places/search", { place: cityName });
        dbPlace = backendRes.data;
        // Update URL with full slug (including state & country) once DB data is available
        if (shouldUpdateUrl) {
          const fullSlug = buildSlug(dbPlace.place_name || cityName, dbPlace);
          window.history.replaceState({ city: cityName }, '', fullSlug);
        }
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

      // ── Step 2: Fetch images — use saved DB images when available, only hit Wikipedia for missing ones ──
      const restaurants = dbPlace?.restaurants || [];
      const famousFoods = dbPlace?.famous_foods || [];
      const souvenirs   = dbPlace?.souvenirs || [];
      const placeName   = dbPlace?.place_name || cityName;

      const needHero        = !dbPlace?.hero_images?.length;
      const attractionsNeed = attractions.slice(0, 6).map(a => !a.image_url);
      const hotelsNeed      = rooms.slice(0, 6).map(r => !r.image_url);
      const restaurantsNeed = restaurants.slice(0, 8).map(r => !r.image_url);
      const foodsNeed       = famousFoods.slice(0, 8).map(f => !f.image_url);
      const souvenirsNeed   = souvenirs.slice(0, 8).map(s => !s.image_url);

      const fetchIfNeeded = (needed, fn) => needed ? wikiQueue(fn) : Promise.resolve(null);

      const [videosData, heroImages, attractionImgs, hotelImgs, restaurantImgs, foodImgs, souvenirImgs, headlines] = await Promise.all([
        fetchVideos(placeName).catch(() => []),
        needHero ? fetchPlaceImages(placeName, imageUrl) : Promise.resolve(dbPlace.hero_images),
        Promise.all(attractions.slice(0, 6).map((a, i) =>
          fetchIfNeeded(attractionsNeed[i], () =>
            fetchWikiImage(`${a.name} ${placeName}`, 400).then(img => img || fetchWikiImage(a.name, 400))
          )
        )),
        Promise.all(rooms.slice(0, 6).map((r, i) =>
          fetchIfNeeded(hotelsNeed[i], () =>
            fetchWikiImage(`${r.name} ${placeName}`, 200).then(img => img || fetchWikiImage(r.name, 200))
          )
        )),
        Promise.all(restaurants.slice(0, 8).map((r, i) =>
          fetchIfNeeded(restaurantsNeed[i], () =>
            fetchWikiImage(r.name, 300).then(img => img || fetchWikiImage(`${r.cuisine} restaurant`, 300))
          )
        )),
        Promise.all(famousFoods.slice(0, 8).map((f, i) =>
          fetchIfNeeded(foodsNeed[i], () =>
            fetchWikiImage(f.name, 300).then(img => img || fetchWikiImage(`${f.name} food dish`, 300))
          )
        )),
        Promise.all(souvenirs.slice(0, 8).map((s, i) =>
          fetchIfNeeded(souvenirsNeed[i], () =>
            fetchWikiImage(s.name, 300).then(img => img || fetchWikiImage(`${s.name} handicraft`, 300))
          )
        )),
        fetchLatestNews(placeName).catch(() => []),
      ]);

      // Attach real Wikipedia images; picsum keyed by hotel tag as last resort so it's at least thematic
      const hotelFallbackSeeds = { Luxury: "luxury-hotel-room", Premium: "hotel-lobby", "Value Stay": "hotel-room", Budget: "hostel-room" };
      attractions = attractions.map((a, i) => ({
        ...a,
        imageUrl: attractionImgs[i] || a.image_url || `https://picsum.photos/seed/${encodeURIComponent(a.name)}/400/300`,
      }));
      rooms = rooms.map((r, i) => ({
        ...r,
        imageUrl: hotelImgs[i] || r.image_url || `https://picsum.photos/seed/${encodeURIComponent(hotelFallbackSeeds[r.tag] || "hotel") + i}/200/150`,
      }));

      // Attach images to restaurants, foods, souvenirs
      const restaurantsWithImgs = restaurants.map((r, i) => ({
        ...r,
        imageUrl: restaurantImgs[i] || r.image_url || `https://picsum.photos/seed/restaurant${i}/300/200`,
      }));
      const famousFoodsWithImgs = famousFoods.map((f, i) => ({
        ...f,
        imageUrl: foodImgs[i] || f.image_url || `https://picsum.photos/seed/food${i}/300/200`,
      }));
      const souvenirsWithImgs = souvenirs.map((s, i) => ({
        ...s,
        imageUrl: souvenirImgs[i] || s.image_url || `https://picsum.photos/seed/souvenir${i}/300/200`,
      }));

      // ── Save newly fetched images back to DB (fire and forget) ──
      if (dbPlace?.id) {
        const anyNewImages =
          (needHero && heroImages?.length) ||
          attractionImgs.some(Boolean) ||
          hotelImgs.some(Boolean) ||
          restaurantImgs.some(Boolean) ||
          foodImgs.some(Boolean) ||
          souvenirImgs.some(Boolean);

        if (anyNewImages) {
          axios.post(`/api/places/${dbPlace.id}/save-images`, {
            hero_images:  needHero ? heroImages : undefined,
            attractions:  attractions.slice(0, 6).map((a, i) => ({ id: a.id, image_url: attractionImgs[i] || null })).filter(x => x.image_url),
            hotels:       rooms.slice(0, 6).map((r, i) => ({ id: r.id, image_url: hotelImgs[i] || null })).filter(x => x.image_url),
            restaurants:  restaurants.slice(0, 8).map((r, i) => ({ id: r.id, image_url: restaurantImgs[i] || null })).filter(x => x.image_url),
            famous_foods: famousFoods.slice(0, 8).map((f, i) => ({ name: f.name, image_url: foodImgs[i] || null })).filter(x => x.image_url),
            souvenirs:    souvenirs.slice(0, 8).map((s, i) => ({ name: s.name, image_url: souvenirImgs[i] || null })).filter(x => x.image_url),
          }).catch(() => {});
        }
      }

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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUrlSearch = async (query) => {
    try {
      const res = await axios.get(`/nominatim/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      if (res.data.length > 0) {
        fetchLocationData(parseFloat(res.data[0].lat), parseFloat(res.data[0].lon), false, query);
      } else {
        // Nominatim found nothing — load by name directly via backend fallback
        fetchLocationData(0, 0, false, query);
      }
    } catch (e) {
      console.error(e);
      // Network error — still try to load by name so the page isn't stuck
      fetchLocationData(0, 0, false, query);
    }
  };

  // --- LIFECYCLE EFFECTS ---

  // Reactively update all title/OG/Twitter/JSON-LD meta tags whenever data changes
  useEffect(() => { if (data) updateSEO(data); }, [data]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    const cityFromSlug = parseSlug(window.location.pathname);
    const cityInUrl = cityFromSlug || new URLSearchParams(window.location.search).get("city");
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
      const city = parseSlug(window.location.pathname) || new URLSearchParams(window.location.search).get("city");
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
          <SearchBar
            search={search}
            setSearch={setSearch}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            onSelect={(lat, lon, name) => fetchLocationData(lat, lon, true, name)}
          />

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
        <LoadingSpinner search={search} />
      ) : data && (
        <>
          {/* ── HERO BANNER CAROUSEL ── */}
          <HeroCarousel
            data={data}
            heroIdx={heroIdx}
            setHeroIdx={setHeroIdx}
            onPlanClick={() => { setPlanData(null); setShowPlanModal(true); }}
          />

          {/* ── QUICK INFO STRIP ── */}
          <QuickInfoStrip dbData={data.dbData} />

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
            <AboutSection
              data={data}
              showFullAbout={showFullAbout}
              setShowFullAbout={setShowFullAbout}
              mobile={true}
            />
          </div>

          {/* ── MAIN LAYOUT ── */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT / MAIN COLUMN ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* About — desktop only */}
              <AboutSection
                data={data}
                showFullAbout={showFullAbout}
                setShowFullAbout={setShowFullAbout}
                mobile={false}
              />

              {/* ── How to Get There ── */}
              <TransportSection
                data={data}
                userCoords={userCoords}
                selectedTransport={selectedTransport}
                setSelectedTransport={setSelectedTransport}
              />

              {/* ── Latest News ── */}
              <NewsSection headlines={data.headlines} cityName={data.name} />

              {/* Top Things to Do */}
              <AttractionsSection
                attractions={data.attractions}
                cityName={data.name}
                dbData={data.dbData}
              />

              {/* Famous Restaurants */}
              <RestaurantsSection
                restaurants={data.dbData?.restaurants}
                cityName={data.name}
              />

              {/* Famous Foods */}
              <FamousFoodsSection famousFoods={data.dbData?.famous_foods} />

              {/* Trending Videos */}
              <VideosSection
                videos={data.videos}
                hoveredVideo={hoveredVideo}
                setHoveredVideo={setHoveredVideo}
              />
            </div>

            {/* ── RIGHT / SIDEBAR COLUMN ── */}
            <div className="space-y-5">

              {/* Weather card — hidden on mobile (shown in top strip instead) */}
              <WeatherCard
                temp={data.temp}
                dist={data.times.rawDist}
                name={data.name}
              />

              {/* Hotels — room photo grid */}
              <HotelsSection
                rooms={data.rooms}
                dbData={data.dbData}
                cityName={data.name}
              />

              {/* ── Places to Buy ── */}
              <SouvenirsSection souvenirs={data.dbData?.souvenirs} />

              {/* Nearby Areas */}
              <NearbySection nearbyPlaces={data.nearbyPlaces} />

            </div>
          </main>
        </>
      )}

      {/* ── PLAN WITH AI MODAL ── */}
      <PlanModal
        data={data}
        show={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        planDays={planDays}
        setPlanDays={setPlanDays}
        planTravelers={planTravelers}
        setPlanTravelers={setPlanTravelers}
        planInterests={planInterests}
        setPlanInterests={setPlanInterests}
        planLoading={planLoading}
        setPlanLoading={setPlanLoading}
        planData={planData}
        setPlanData={setPlanData}
      />

    </div>
  );
}

export default App;
