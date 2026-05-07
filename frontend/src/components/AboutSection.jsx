// Props: data, showFullAbout, setShowFullAbout, mobile (boolean for mobile vs desktop variant)
export default function AboutSection({ data, showFullAbout, setShowFullAbout, mobile = false }) {
  if (mobile) {
    return (
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
    );
  }

  // Desktop variant
  return (
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
  );
}
