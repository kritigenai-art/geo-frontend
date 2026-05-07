import axios from "axios";
import {
  Sparkles, X, Plus, Minus, Calendar, Users, CheckCircle2, Loader2, MapPin
} from "lucide-react";

// Props: data, show, onClose, planDays, setPlanDays, planTravelers, setPlanTravelers,
//        planInterests, setPlanInterests, planLoading, setPlanLoading, planData, setPlanData
export default function PlanModal({
  data, show, onClose,
  planDays, setPlanDays,
  planTravelers, setPlanTravelers,
  planInterests, setPlanInterests,
  planLoading, setPlanLoading,
  planData, setPlanData,
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={20} />
              <span className="text-lg font-black">Plan with AI</span>
            </div>
            <p className="text-green-100 text-xs mt-0.5">Personalised itinerary for {data?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition">
            <X size={18} />
          </button>
        </div>

        {/* Form or Itinerary */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {!planData ? (
            <>
              {/* Days */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Calendar size={15} className="text-green-500" /> How many days?
                </label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setPlanDays(d => Math.max(1, d - 1))} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-green-50 hover:text-green-600 flex items-center justify-center transition font-bold text-slate-600">
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-black text-slate-800 w-8 text-center">{planDays}</span>
                  <button onClick={() => setPlanDays(d => Math.min(14, d + 1))} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-green-50 hover:text-green-600 flex items-center justify-center transition font-bold text-slate-600">
                    <Plus size={16} />
                  </button>
                  <span className="text-xs text-slate-400 ml-1">days (max 14)</span>
                </div>
              </div>

              {/* Travelers */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Users size={15} className="text-green-500" /> Number of travelers
                </label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setPlanTravelers(t => Math.max(1, t - 1))} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-green-50 hover:text-green-600 flex items-center justify-center transition font-bold text-slate-600">
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-black text-slate-800 w-8 text-center">{planTravelers}</span>
                  <button onClick={() => setPlanTravelers(t => Math.min(20, t + 1))} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-green-50 hover:text-green-600 flex items-center justify-center transition font-bold text-slate-600">
                    <Plus size={16} />
                  </button>
                  <span className="text-xs text-slate-400 ml-1">people</span>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Sparkles size={15} className="text-green-500" /> Trip style <span className="text-slate-400 font-normal text-xs">(pick any)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '🏛️ Culture & Heritage', val: 'Culture' },
                    { label: '🌿 Nature & Adventure', val: 'Adventure' },
                    { label: '🍽️ Food & Drinks',      val: 'Food' },
                    { label: '👨‍👩‍👧 Family',             val: 'Family' },
                    { label: '❤️ Romance',             val: 'Romance' },
                    { label: '🛍️ Shopping',            val: 'Shopping' },
                    { label: '🙏 Spiritual',           val: 'Spiritual' },
                    { label: '📸 Photography',         val: 'Photography' },
                    { label: '🏖️ Beach & Relaxation', val: 'Beach' },
                    { label: '🎭 Arts & Nightlife',    val: 'Nightlife' },
                  ].map(({ label, val }) => {
                    const active = planInterests.includes(val);
                    return (
                      <button
                        key={val}
                        onClick={() => setPlanInterests(prev =>
                          active ? prev.filter(x => x !== val) : [...prev, val]
                        )}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                          active
                            ? 'bg-green-500 text-white border-green-500 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-green-300 hover:text-green-600'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ── ITINERARY RESULT ── */
            <div className="space-y-5">

              {/* Summary bar */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex flex-wrap gap-4">
                <div className="text-center flex-1 min-w-[60px]">
                  <p className="text-xl font-black text-green-700">{planData.duration}</p>
                  <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide mt-0.5">Duration</p>
                </div>
                <div className="text-center flex-1 min-w-[60px]">
                  <p className="text-xl font-black text-green-700">{planData.travelers}</p>
                  <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide mt-0.5">Travelers</p>
                </div>
                <div className="text-center flex-1 min-w-[80px]">
                  <p className="text-sm font-black text-green-700 leading-tight">{planData.total_budget_estimate || '—'}</p>
                  <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide mt-0.5">Budget/Person</p>
                </div>
                {planData.best_time && (
                  <div className="text-center flex-1 min-w-[80px]">
                    <p className="text-sm font-black text-green-700 leading-tight">{planData.best_time}</p>
                    <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide mt-0.5">Best Time</p>
                  </div>
                )}
              </div>

              {/* Day cards */}
              {planData.itinerary?.map(day => (
                <div key={day.day} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  {/* Day header */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center gap-3">
                    <span className="bg-green-500 text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shrink-0">{day.day}</span>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{day.title}</p>
                      {day.theme && <p className="text-slate-400 text-[10px] mt-0.5">{day.theme}</p>}
                    </div>
                    {day.daily_budget && (
                      <span className="ml-auto text-[10px] font-bold text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full shrink-0">{day.daily_budget}</span>
                    )}
                  </div>

                  {/* Time slots */}
                  <div className="divide-y divide-slate-50">
                    {[
                      { slot: day.morning,   emoji: '🌅', label: 'Morning'   },
                      { slot: day.afternoon, emoji: '☀️',  label: 'Afternoon' },
                      { slot: day.evening,   emoji: '🌙', label: 'Evening'   },
                    ].filter(s => s.slot).map(({ slot, emoji, label }) => (
                      <div key={label} className="px-4 py-3 bg-white">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
                              {slot.time && <span className="text-[10px] text-slate-400">· {slot.time}</span>}
                            </div>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{slot.activity}</p>
                            {slot.place && <p className="text-xs text-green-600 font-medium mt-0.5 flex items-center gap-1"><MapPin size={10}/>{slot.place}</p>}
                            {slot.tip   && <p className="text-[11px] text-slate-500 mt-1 bg-amber-50 rounded-lg px-2 py-1 border border-amber-100">💡 {slot.tip}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Meals */}
                  {day.meals && (
                    <div className="bg-orange-50 px-4 py-3 border-t border-orange-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-2">🍽️ Meals</p>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        {day.meals.breakfast && <div><span className="font-bold text-slate-600">Breakfast</span><br/><span className="text-slate-500">{day.meals.breakfast}</span></div>}
                        {day.meals.lunch     && <div><span className="font-bold text-slate-600">Lunch</span><br/><span className="text-slate-500">{day.meals.lunch}</span></div>}
                        {day.meals.dinner    && <div><span className="font-bold text-slate-600">Dinner</span><br/><span className="text-slate-500">{day.meals.dinner}</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Tips */}
              {planData.travel_tips?.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">✈️ Travel Tips</p>
                  <ul className="space-y-1.5">
                    {planData.travel_tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={14} className="text-blue-400 mt-0.5 shrink-0" />{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Best areas to stay */}
              {planData.best_areas_to_stay?.length > 0 && (
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-purple-500 mb-3">🏨 Best Areas to Stay</p>
                  <ul className="space-y-1.5">
                    {planData.best_areas_to_stay.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <MapPin size={12} className="text-purple-400 mt-0.5 shrink-0" />{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Packing */}
              {planData.packing_essentials?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">🎒 Packing Essentials</p>
                  <div className="flex flex-wrap gap-2">
                    {planData.packing_essentials.map((p, i) => (
                      <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Re-plan button */}
              <button
                onClick={() => setPlanData(null)}
                className="w-full py-3 text-sm font-bold text-green-600 border-2 border-green-200 rounded-2xl hover:bg-green-50 transition"
              >
                ↩ Adjust & Regenerate
              </button>
            </div>
          )}
        </div>

        {/* Footer CTA — only show on config screen */}
        {!planData && (
          <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0">
            <button
              disabled={planLoading}
              onClick={async () => {
                setPlanLoading(true);
                try {
                  const res = await axios.post('/api/places/plan', {
                    place:     data.name,
                    days:      planDays,
                    travelers: planTravelers,
                    interests: planInterests,
                  });
                  setPlanData(res.data);
                } catch (e) {
                  alert('Could not generate itinerary. Please try again.');
                } finally {
                  setPlanLoading(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-base py-3.5 rounded-2xl shadow-lg shadow-green-200 transition-all duration-200"
            >
              {planLoading
                ? <><Loader2 size={18} className="animate-spin" /> Generating your itinerary…</>
                : <><Sparkles size={18} /> Generate {planDays}-Day Itinerary</>
              }
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2">Powered by Azure OpenAI · Results in ~10 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}
