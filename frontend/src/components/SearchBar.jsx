import { useRef } from "react";
import axios from "axios";
import { Search, MapPin } from "lucide-react";

// Props: search, setSearch, suggestions, setSuggestions, onSelect
// onSelect(lat, lon, displayName) → calls fetchLocationData in App
export default function SearchBar({ search, setSearch, suggestions, setSuggestions, onSelect }) {
  const searchDebounce = useRef(null);

  return (
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
              onClick={() => { setSearch(""); onSelect(parseFloat(p.lat), parseFloat(p.lon), p.display_name.split(",")[0].trim()); }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-slate-100 last:border-0 transition"
            >
              <MapPin size={14} className="text-green-500 shrink-0" />
              <span className="text-sm text-slate-700 truncate">{p.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
