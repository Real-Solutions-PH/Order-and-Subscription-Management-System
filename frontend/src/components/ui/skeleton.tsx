import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className,
      )}
      {...props}
    />
  );
}

/** Card-shaped skeleton block. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-white p-6 space-y-4', className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Table row skeleton. */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** Meal card skeleton matching MealCard dimensions. */
export function SkeletonMealCard() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden border border-border">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** KPI card skeleton for admin dashboard. */
export function SkeletonKPI() {
  return (
    <div className="rounded-2xl bg-white p-5 space-y-3 border border-muted">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Chart area skeleton. */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-white p-6 border border-muted', className)}>
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
