import { lazy, Suspense } from "react";

const RouteMap = lazy(() => import("../RouteMap"));

// Props: data, userCoords, selectedTransport, setSelectedTransport
export default function TransportSection({ data, userCoords, selectedTransport, setSelectedTransport }) {
  return (
    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="text-lg">🗺️</span>
        <div>
          <h2 className="text-base font-black text-slate-800">How to Get There</h2>
          <div className="w-6 h-0.5 bg-green-500 rounded-full mt-0.5" />
        </div>
        {data.times.rawDist > 0 && (
          <span className="ml-auto text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
            {data.times.rawDist.toFixed(1)} km from you
          </span>
        )}
      </div>
      <div className="p-5">
        {/* Transport mode cards — 2×2 grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { mode: 'car',    emoji: '🚗', label: 'By Car',    travelMode: 'driving', accent: 'green' },
            { mode: 'bus',    emoji: '🚌', label: 'By Bus',    travelMode: 'transit', accent: 'blue' },
            { mode: 'train',  emoji: '🚂', label: 'By Train',  travelMode: 'transit', accent: 'purple' },
            { mode: 'flight', emoji: '✈️', label: 'By Flight', travelMode: 'driving', accent: 'sky' },
          ].map(({ mode, emoji, label, travelMode, accent }) => {
            const active = selectedTransport?.mode === mode;
            const accentMap = {
              green:  { card: 'border-green-400 bg-green-50 shadow-green-100',  time: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
              blue:   { card: 'border-blue-400 bg-blue-50 shadow-blue-100',     time: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
              purple: { card: 'border-purple-400 bg-purple-50 shadow-purple-100', time: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
              sky:    { card: 'border-sky-400 bg-sky-50 shadow-sky-100',         time: 'text-sky-700',    badge: 'bg-sky-100 text-sky-700' },
            }[accent];
            return (
              <button
                key={mode}
                onClick={() => setSelectedTransport(active ? null : { mode, emoji, label: label.replace('By ', ''), travelMode })}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2.5 transition-all duration-200 shadow-sm ${
                  active ? `${accentMap.card} shadow-md scale-[1.03]` : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                }`}
              >
                <span className="text-xs leading-none">{emoji}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                <span className={`text-xs font-black ${active ? accentMap.time : 'text-slate-700'}`}>{data.times[mode]}</span>
                {active && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${accentMap.badge}`}>Selected ✓</span>}
              </button>
            );
          })}
        </div>

        {/* Expandable directions panel */}
        {selectedTransport && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedTransport.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    By {selectedTransport.label} to {data.name}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">— {data.times[selectedTransport.mode]}{data.times.rawDist > 0 ? ` · ${data.times.rawDist.toFixed(1)} km` : ''}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}&travelmode=${selectedTransport.travelMode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition"
                >
                  Open in Maps
                </a>
                <button
                  onClick={() => setSelectedTransport(null)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="h-56">
              <Suspense fallback={<div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">Loading map…</div>}>
                <RouteMap
                  fromLat={userCoords?.lat}
                  fromLng={userCoords?.lng}
                  toLat={data.lat}
                  toLng={data.lng}
                  mode={selectedTransport.mode}
                  placeName={data.name}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
