import { ChevronRight } from "lucide-react";
import { getCurrencySymbol } from "../utils/format";

// Props: attractions, cityName, dbData (for currency)
export default function AttractionsSection({ attractions, cityName, dbData }) {
  if (!attractions || attractions.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Top Things to Do</h2>
          <div className="w-8 h-1 bg-green-500 rounded-full mt-1" />
        </div>
      </div>
      {/* Mobile: horizontal scroll | Desktop: 3-col grid */}
      <div className="p-4 flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
        {attractions.slice(0, 6).map((place, idx) => (
          <a
            key={idx}
            href={`/Tourism-${place.name.trim().replace(/\s+/g, '_')}-Tourism`}
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
                  {String(place.entry_fee).toLowerCase() === 'free' ? '✓ Free' : `${getCurrencySymbol(dbData?.currency)}${place.entry_fee}`}
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
  );
}
