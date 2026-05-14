export default function NoteLoading() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-pulse">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1e293b] bg-[#0f1117] flex-shrink-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-6 w-7 rounded bg-slate-800" />
        ))}
        <div className="flex-1" />
        <div className="h-5 w-12 rounded bg-slate-800" />
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-8 py-8 max-w-3xl mx-auto w-full">
          {/* Title */}
          <div className="h-9 w-2/3 rounded-lg bg-slate-800 mb-8" />

          {/* Body lines */}
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-slate-800/70" />
            <div className="h-4 w-5/6 rounded bg-slate-800/70" />
            <div className="h-4 w-4/5 rounded bg-slate-800/70" />
            <div className="h-4 w-full rounded bg-slate-800/70" />
            <div className="h-4 w-3/4 rounded bg-slate-800/70" />
            <div className="mt-6 h-4 w-full rounded bg-slate-800/50" />
            <div className="h-4 w-11/12 rounded bg-slate-800/50" />
            <div className="h-4 w-4/6 rounded bg-slate-800/50" />
          </div>
        </div>

        {/* Side panel */}
        <div className="w-56 border-l border-[#1e293b] px-4 py-5 space-y-5 flex-shrink-0">
          <div className="h-3 w-20 rounded bg-slate-800" />
          <div className="flex flex-wrap gap-1.5">
            <div className="h-5 w-14 rounded-full bg-slate-800" />
            <div className="h-5 w-18 rounded-full bg-slate-800" />
          </div>
          <div className="h-px w-full bg-slate-800" />
          <div className="h-3 w-16 rounded bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-5 w-full rounded bg-slate-800" />
            <div className="h-5 w-3/4 rounded bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  )
}
