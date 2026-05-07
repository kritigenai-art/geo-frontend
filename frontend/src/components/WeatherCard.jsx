import { Cloud, MapPin } from "lucide-react";

// Props: temp, dist, name
export default function WeatherCard({ temp, dist, name }) {
  return (
    <div className="hidden lg:block bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl shadow-lg p-5 text-white">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">Current Weather</p>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-5xl font-black">{temp}°C</div>
          <div className="text-xs text-white/70 mt-1 flex items-center gap-1"><MapPin size={11}/> {name}</div>
        </div>
        <Cloud size={52} className="text-white/50" />
      </div>
      {dist > 0 && (
        <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/70 flex items-center gap-1">
          <MapPin size={11}/> {dist.toFixed(1)} km from your location
        </div>
      )}
    </div>
  );
}
