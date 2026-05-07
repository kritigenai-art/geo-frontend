import { ChevronRight } from "lucide-react";

// Props: headlines, cityName
export default function NewsSection({ headlines, cityName }) {
  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-800">Latest News</h2>
          <div className="w-6 h-0.5 bg-red-400 rounded-full mt-0.5" />
        </div>
        <span className="ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Live</span>
      </div>
      <div className="divide-y divide-slate-50">
        {headlines && headlines.length > 0 ? (
          headlines.slice(0, 6).map((h, i) => (
            <a
              key={i}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-5 py-1.5 hover:bg-slate-50 transition-colors group"
            >
              <span className="mt-0.5 shrink-0 text-[11px] font-black text-slate-300 w-4 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-700 leading-snug line-clamp-2 group-hover:text-green-600 transition-colors">
                  {h.title} <span className="text-[10px] text-slate-400 font-medium">— {h.source}</span>
                </p>
              </div>
              <ChevronRight size={14} className="shrink-0 mt-1 text-slate-300 group-hover:text-green-500 transition-colors" />
            </a>
          ))
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400 italic">No recent news found for {cityName}.</p>
          </div>
        )}
      </div>
    </section>
  );
}
