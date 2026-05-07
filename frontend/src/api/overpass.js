import axios from "axios";

// Single Overpass query — hotels + destination attractions + nearby (if far away)
// Returns { hotels, attractions, nearbyPlaces }
export const fetchOverpassData = async (destLat, destLng, userLat, userLng, isNearby) => {
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
