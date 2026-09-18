import React from 'react';

/**
 * Lightweight, non-blocking skeleton loader for route transitions
 * Matches STREAK's dark luxury aesthetic (#0a0b0e / #11131a / #1d222e).
 */
export function RouteSkeleton() {
  return (
    <div
      className="w-full max-w-md mx-auto p-4 sm:p-6 space-y-4 animate-pulse pt-2 select-none pointer-events-none"
      aria-hidden="true"
    >
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-[#191d26] rounded-md" />
          <div className="h-6 w-32 bg-[#212633] rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-[#191d26] rounded-xl" />
          <div className="h-9 w-9 bg-[#191d26] rounded-xl" />
        </div>
      </div>

      {/* Main card skeleton (Calendar strip / Habit ring) */}
      <div className="rounded-[28px] bg-[#11131a] border border-[#1d222e] p-4 sm:p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-[#1f2430] rounded-md" />
          <div className="h-5 w-16 bg-[#1f2430] rounded-full" />
        </div>

        {/* 7-day pill row */}
        <div className="grid grid-cols-7 gap-2 pt-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-14 bg-[#171b23] rounded-2xl flex flex-col items-center justify-center gap-1.5">
              <div className="h-2 w-3.5 bg-[#252b39] rounded" />
              <div className="h-3.5 w-3.5 bg-[#252b39] rounded-full" />
            </div>
          ))}
        </div>

        <div className="h-1.5 w-full bg-[#181c25] rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-[#243320] rounded-full" />
        </div>
      </div>

      {/* Section label */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div className="h-3.5 w-24 bg-[#191d26] rounded" />
        <div className="h-3 w-14 bg-[#191d26] rounded" />
      </div>

      {/* Item list skeletons */}
      <div className="space-y-2.5">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-[#11131a] border border-[#1d222e] p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1a1e27] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/5 bg-[#202532] rounded" />
              <div className="h-2.5 w-2/5 bg-[#171b24] rounded" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#191d26] flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default RouteSkeleton;
