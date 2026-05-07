import { Cloud, MapPin, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

// Props: data, heroIdx, setHeroIdx, onPlanClick
export default function HeroCarousel({ data, heroIdx, setHeroIdx, onPlanClick }) {
  return (
    <div className="relative h-72 md:h-[26rem] overflow-hidden bg-slate-900 rounded-3xl mx-4 mt-5 md:mx-8 shadow-2xl">
      {/* Images */}
      {data.heroImages.map((src, i) => (
        <img
          key={src}
          src={src}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === heroIdx ? "opacity-100" : "opacity-0"}`}
          alt={`${data.name} photo ${i + 1}`}
          onError={e => { e.target.src = `https://picsum.photos/seed/${data.name}${i}/1200/800`; }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {/* Left arrow */}
      <button
        onClick={() => setHeroIdx(i => (i - 1 + data.heroImages.length) % data.heroImages.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2.5 rounded-full transition z-10 border border-white/30"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Right arrow */}
      <button
        onClick={() => setHeroIdx(i => (i + 1) % data.heroImages.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2.5 rounded-full transition z-10 border border-white/30"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-20 right-5 flex gap-1.5 z-10">
        {data.heroImages.map((_, i) => (
          <button
            key={i}
            onClick={() => setHeroIdx(i)}
            className={`rounded-full transition-all ${i === heroIdx ? "bg-white w-5 h-2" : "bg-white/45 hover:bg-white/70 w-2 h-2"}`}
          />
        ))}
      </div>

      {/* Image counter */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 border border-white/20">
        {heroIdx + 1} / {data.heroImages.length}
      </div>

      {/* City info */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 text-white z-10">
        {data.dbData && (
          <p className="text-xs text-white/55 mb-2 flex items-center gap-1 flex-wrap">
            <span>Home</span>
            {data.dbData.continent   && <><ChevronRight size={10}/><span>{data.dbData.continent}</span></>}
            {data.dbData.country_name && <><ChevronRight size={10}/><span>{data.dbData.country_name}</span></>}
            {data.dbData.state       && <><ChevronRight size={10}/><span>{data.dbData.state}</span></>}
            <ChevronRight size={10}/><span className="text-white font-semibold">{data.name}</span>
          </p>
        )}
        <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-lg">{data.name}</h1>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/25">
            <Cloud size={13}/> {data.temp}°C
          </span>
          {data.times.rawDist > 0 && (
            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/25">
              <MapPin size={12}/> {data.times.rawDist.toFixed(1)} km away</span>
          )}
          {/* Plan with AI CTA */}
          <button
            onClick={onPlanClick}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg shadow-green-900/40 transition-all duration-200 border border-green-400/60 backdrop-blur-sm ml-auto"
          >
            <Sparkles size={15} className="shrink-0" />
            Plan with AI
          </button>
        </div>
      </div>
    </div>
  );
}
