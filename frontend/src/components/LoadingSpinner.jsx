export default function LoadingSpinner({ search }) {
  return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-semibold text-sm">{search ? `Searching for ${search}…` : "Detecting your location…"}</p>
      </div>
    </div>
  );
}
