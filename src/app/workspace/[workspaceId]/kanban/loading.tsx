export default function KanbanLoading() {
  return (
    <div className="flex-1 flex overflow-hidden animate-pulse">
      <div className="flex gap-4 p-6 overflow-x-auto w-full">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="flex-shrink-0 w-64 flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <div className="h-3.5 w-24 rounded bg-slate-800" />
            </div>
            {/* Cards */}
            {Array.from({ length: col === 0 ? 4 : col === 1 ? 2 : col === 2 ? 3 : 1 }).map((_, card) => (
              <div key={card} className="rounded-lg bg-[#1e293b] border border-[#334155] p-3 space-y-2">
                <div className="h-3.5 w-4/5 rounded bg-slate-700" />
                <div className="h-3 w-full rounded bg-slate-800" />
                <div className="h-3 w-2/3 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
