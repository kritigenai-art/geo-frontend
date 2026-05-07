import { PlayCircle } from "lucide-react";

// Props: videos, hoveredVideo, setHoveredVideo
export default function VideosSection({ videos, hoveredVideo, setHoveredVideo }) {
  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
          <PlayCircle size={16} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Travel Videos</h2>
          <div className="w-8 h-1 bg-red-400 rounded-full mt-0.5" />
        </div>
      </div>
      {/* Mobile: horizontal scroll | Desktop: 2-col grid */}
      <div className="p-4 flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none">
        {videos.map((v, idx) => (
          <div
            key={idx}
            className="group cursor-pointer shrink-0 snap-start w-[72vw] sm:w-auto"
            onMouseEnter={() => v.id && setHoveredVideo(idx)}
            onMouseLeave={() => setHoveredVideo(null)}
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-200 shadow-md">
              {hoveredVideo === idx && v.id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${v.id}?autoplay=1&mute=1&controls=1&rel=0`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={v.title}
                />
              ) : (
                <>
                  <img
                    src={v.thumb}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    alt={v.title}
                    onError={e => { e.target.src = `https://picsum.photos/seed/${idx}/800/450`; }}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center">
                    <PlayCircle className="text-white opacity-90" size={44} />
                  </div>
                  {v.id && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">YT</span>
                  )}
                </>
              )}
            </div>
            <a href={v.url} target="_blank" rel="noopener noreferrer">
              <p className="text-sm font-bold text-slate-800 mt-2.5 leading-snug line-clamp-2 hover:text-red-600 transition">{v.title}</p>
            </a>
            <p className="text-[10px] text-slate-400 mt-0.5">{v.channel} · {v.views}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
