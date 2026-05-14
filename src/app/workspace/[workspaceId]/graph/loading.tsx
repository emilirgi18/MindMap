export default function GraphLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading graph…</span>
      </div>
    </div>
  )
}
