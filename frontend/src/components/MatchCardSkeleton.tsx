import { Skeleton } from "@/components/ui/skeleton";

const MatchCardSkeleton = () => (
  <div className="cricket-card p-5 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-10 h-4 rounded" />
        <Skeleton className="w-6 h-3 rounded" />
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-10 h-4 rounded" />
      </div>
      <Skeleton className="w-16 h-6 rounded-full" />
    </div>
    <div className="flex gap-4">
      <Skeleton className="w-32 h-3 rounded" />
      <Skeleton className="w-24 h-3 rounded" />
    </div>
    <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
      <Skeleton className="w-28 h-3 rounded" />
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="flex-1 h-10 rounded-lg" />
      </div>
      <Skeleton className="w-36 h-3 rounded" />
    </div>
  </div>
);

export default MatchCardSkeleton;
