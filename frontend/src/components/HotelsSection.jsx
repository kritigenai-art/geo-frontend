import { ArrowDownWideNarrow, Star } from "lucide-react";
import { getCurrencySymbol } from "../utils/format";

// Props: rooms, currencySymbol (or pass dbData for currency)
export default function HotelsSection({ rooms, dbData, cityName }) {
  const currencySymbol = getCurrencySymbol(dbData?.currency);

  return (
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
        {rooms.map((room, idx) => (
          <div
            key={idx}
            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(room.name + " " + cityName)}`, "_blank")}
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
                <p className="text-[9px] text-white/80">{currencySymbol}{room.priceVal?.toLocaleString() ?? '–'}<span className="text-white/60">/night</span></p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
