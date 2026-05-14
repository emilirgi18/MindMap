export default function TimelineLoading() {
  return (
    <div className="flex-1 relative overflow-hidden py-8 animate-pulse">
      {/* Center spine */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#1e293b] -translate-x-1/2" />

      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {[true, false, true, false, true].map((isLeft, i) => (
          <div key={i} className="flex items-start">
            {/* Left half */}
            <div className="flex-1 flex justify-end pr-5">
              {isLeft && (
                <div className="w-56 rounded-lg bg-[#1e293b] border border-[#334155] p-3 space-y-2">
                  <div className="h-3.5 w-4/5 rounded bg-slate-700" />
                  <div className="h-3 w-full rounded bg-slate-800" />
                  <div className="h-3 w-2/3 rounded bg-slate-800" />
                </div>
              )}
            </div>

            {/* Center dot */}
            <div className="flex-shrink-0 w-10 flex justify-center pt-3">
              <div className="w-3 h-3 rounded-full bg-slate-700 border-2 border-[#0f172a]" />
            </div>

            {/* Right half */}
            <div className="flex-1 pl-5">
              {!isLeft && (
                <div className="w-56 rounded-lg bg-[#1e293b] border border-[#334155] p-3 space-y-2">
                  <div className="h-3.5 w-4/5 rounded bg-slate-700" />
                  <div className="h-3 w-full rounded bg-slate-800" />
                  <div className="h-3 w-2/3 rounded bg-slate-800" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
