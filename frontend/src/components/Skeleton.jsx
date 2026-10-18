import React from 'react';

export function Skeleton({ className = '', rounded = 'rounded-xl', ...props }) {
  return (
    <div
      className={`animate-pulse bg-sand-dark/60 ${rounded} ${className}`}
      {...props}
    />
  );
}

export function VenueCardSkeleton() {
  return (
    <div className="bg-sand rounded-2xl border border-sand-dark overflow-hidden p-4 shadow-sm flex flex-col space-y-3">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-sand-dark/50">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-sand rounded-2xl border border-sand-dark overflow-hidden p-4 shadow-sm flex flex-col space-y-3">
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="space-y-2 pt-1">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-sand-dark/50">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export default Skeleton;
