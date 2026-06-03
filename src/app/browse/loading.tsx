export default function BrowseLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-9 bg-bg-card rounded-lg w-64 mb-2 animate-pulse" />
        <div className="h-4 bg-bg-card rounded w-24 animate-pulse" />
      </div>
      <div className="flex gap-8">
        <div className="hidden md:block w-64 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-bg-card rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
