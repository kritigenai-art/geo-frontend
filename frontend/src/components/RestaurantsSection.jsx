// Props: restaurants, cityName
export default function RestaurantsSection({ restaurants, cityName }) {
  if (!restaurants || restaurants.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Famous Restaurants</h2>
          <div className="w-8 h-1 bg-orange-500 rounded-full mt-1" />
        </div>
      </div>
      <div className="p-4 flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
        {restaurants.map((r, i) => (
          <a
            key={i}
            href={`https://www.google.com/search?q=${encodeURIComponent(r.name + " " + cityName)}`}
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
  );
}
