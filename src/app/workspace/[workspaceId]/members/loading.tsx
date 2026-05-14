export default function MembersLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-8 animate-pulse">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-6 w-32 rounded bg-slate-800" />

        {/* Member rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-[#1e293b]">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-slate-800" />
              <div className="h-3 w-48 rounded bg-slate-700" />
            </div>
            <div className="h-5 w-16 rounded-full bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
