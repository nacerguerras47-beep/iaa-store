export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-2.5">
        <div className="h-3 skeleton w-1/3" />
        <div className="h-4 skeleton w-full" />
        <div className="h-4 skeleton w-2/3" />
        <div className="h-6 skeleton w-1/2 mt-3" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function HeroSkeleton() {
  return (
    <div className="h-[70vh] skeleton rounded-none" />
  )
}
