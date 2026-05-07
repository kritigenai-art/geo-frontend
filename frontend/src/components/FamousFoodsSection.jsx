// Props: famousFoods
export default function FamousFoodsSection({ famousFoods }) {
  if (!famousFoods || famousFoods.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Famous Foods</h2>
          <div className="w-8 h-1 bg-amber-400 rounded-full mt-1" />
        </div>
      </div>
      <div className="p-4 flex sm:grid sm:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
        {famousFoods.map((food, i) => (
          <div key={i} className="shrink-0 snap-start w-[58vw] sm:w-auto bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-slate-100">
            <div className="relative h-28 overflow-hidden bg-amber-50">
              <img
                src={food.imageUrl}
                alt={food.name}
                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                onError={e => { e.target.src = `https://picsum.photos/seed/food${i}/300/200`; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-slate-800 leading-tight">{food.name}</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">{food.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
