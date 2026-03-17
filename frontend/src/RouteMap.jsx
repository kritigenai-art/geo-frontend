import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

// Fix Leaflet default marker icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const OSRM_PROFILE = { car: "driving", bus: "driving", train: "driving" };

export default function RouteMap({ fromLat, fromLng, toLat, toLng, mode, placeName }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const routeRef     = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Init map once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Remove previous route layer
    if (routeRef.current) {
      map.removeLayer(routeRef.current);
      routeRef.current = null;
    }

    // Destination marker
    map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });

    const destMarker = L.marker([toLat, toLng]).addTo(map).bindPopup(`<b>${placeName}</b>`).openPopup();

    // If we have user origin, fetch route from OSRM
    if (fromLat && fromLng) {
      const profile = OSRM_PROFILE[mode] || "driving";
      axios.get(
        `/osrm/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
        { timeout: 10000 }
      ).then(res => {
        const coords = res.data?.routes?.[0]?.geometry?.coordinates;
        if (!coords) return;
        const latlngs = coords.map(([lng, lat]) => [lat, lng]);
        routeRef.current = L.polyline(latlngs, { color: "#2563eb", weight: 4, opacity: 0.85 }).addTo(map);
        // Origin marker
        L.marker([fromLat, fromLng]).addTo(map).bindPopup("Your location");
        map.fitBounds(routeRef.current.getBounds(), { padding: [30, 30] });
      }).catch(() => {
        // Fallback: just show destination
        map.setView([toLat, toLng], 12);
      });
    } else {
      map.setView([toLat, toLng], 12);
    }

    // Cleanup on unmount
    return () => {};
  }, [fromLat, fromLng, toLat, toLng, mode, placeName]);

  // Destroy map on component unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
