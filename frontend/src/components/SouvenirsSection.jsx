// Props: souvenirs
export default function SouvenirsSection({ souvenirs }) {
  if (!souvenirs || souvenirs.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-800">Things to take home</h3>
          <div className="w-6 h-0.5 bg-purple-500 rounded-full mt-1" />
        </div>
      </div>
      <div className="p-3 grid grid-cols-2 gap-3">
        {souvenirs.map((item, idx) => (
          <div key={idx} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-slate-100 cursor-default">
            <div className="relative h-24 overflow-hidden bg-purple-50">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                onError={e => { e.target.src = `https://picsum.photos/seed/souvenir${idx}/300/200`; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="px-2.5 py-2">
              <p className="text-[11px] font-bold text-slate-800 leading-tight group-hover:text-purple-700 transition">{item.name}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
