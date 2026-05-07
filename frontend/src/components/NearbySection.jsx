import { MapPin, ChevronRight } from "lucide-react";

// Props: nearbyPlaces, onSelect (calls fetchLocationData)
export default function NearbySection({ nearbyPlaces }) {
  if (!nearbyPlaces || nearbyPlaces.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-base font-black text-slate-800">Nearby Areas</h3>
        <div className="w-6 h-0.5 bg-slate-300 rounded-full mt-1" />
      </div>
      <div>
        {nearbyPlaces.map((place, idx) => (
          <a
            key={idx}
            href={`/Tourism-${place.name.trim().replace(/\s+/g, '_')}-Tourism`}
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
  );
}
