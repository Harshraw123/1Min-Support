import { Skeleton } from '@/components/ui/skeleton';
import React from 'react'


    const SectionSkeletonCard = () => (
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <div className="shrink-0 space-y-1 text-right">
              <Skeleton className="h-3 w-16 ml-auto" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          </div>
        </div>
      );


export default SectionSkeletonCard