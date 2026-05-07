import { Globe, Clock, Coins } from "lucide-react";

// Props: dbData
export default function QuickInfoStrip({ dbData }) {
  if (!dbData) return null;
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {dbData.country_name && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default"><Globe size={11} className="text-green-500"/>{dbData.country_name}</span>}
        {dbData.language     && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default">🗣 {dbData.language}</span>}
        {dbData.currency     && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default"><Coins size={11} className="text-green-500"/>{dbData.currency}</span>}
        {dbData.timezone     && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default"><Clock size={11} className="text-slate-400"/>{dbData.timezone}</span>}
        {dbData.best_time_to_visit && <span className="flex items-center gap-1.5 bg-gray-100 hover:bg-green-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition cursor-default">📅 {dbData.best_time_to_visit}</span>}
        {dbData.famous_for   && <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 cursor-default">⭐ {dbData.famous_for}</span>}
      </div>
    </div>
  );
}
