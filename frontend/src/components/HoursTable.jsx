import React from 'react';
import { DAYS_OF_WEEK, getTodayDbDay, formatTime } from '../utils/hoursUtils';
import { Clock, Check, X } from 'lucide-react';

export default function HoursTable({ hours = [] }) {
  const todayDbDay = getTodayDbDay();

  // Ensure all 7 days (0 to 6) are present
  const fullWeek = Array.from({ length: 7 }, (_, i) => {
    const entry = Array.isArray(hours)
      ? hours.find((h) => Number(h.day_of_week) === i)
      : null;
    return {
      day_of_week: i,
      day_name: DAYS_OF_WEEK[i],
      open_time: entry?.open_time || '09:00:00',
      close_time: entry?.close_time || '22:00:00',
      is_closed: entry ? Boolean(entry.is_closed) : i === 6, // Sunday default closed if unspecified
    };
  });

  return (
    <div className="rounded-2xl border border-sand-dark bg-sand overflow-hidden shadow-sm">
      <div className="bg-sand-dark/40 px-5 py-3 border-b border-sand-dark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-wine" />
          <h3 className="font-heading text-sm uppercase tracking-wider text-ink">
            Weekly Operating Schedule
          </h3>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-wine bg-wine/10 px-2 py-0.5 rounded-md">
          Mon – Sun
        </span>
      </div>

      <div className="divide-y divide-sand-dark/60">
        {fullWeek.map((item) => {
          const isToday = item.day_of_week === todayDbDay;
          return (
            <div
              key={item.day_of_week}
              className={`flex items-center justify-between px-5 py-3 text-sm transition-colors ${
                isToday
                  ? 'bg-wine/10 font-bold text-wine border-l-4 border-l-wine'
                  : 'text-ink/90 hover:bg-sand-dark/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-semibold w-28 text-left">
                  {item.day_name}
                </span>
                {isToday && (
                  <span className="text-[10px] font-heading uppercase tracking-widest bg-wine text-sand px-2 py-0.5 rounded-full shadow-sm">
                    Today
                  </span>
                )}
              </div>

              <div>
                {item.is_closed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">
                    <X className="w-3 h-3 stroke-[3]" />
                    Closed
                  </span>
                ) : (
                  <span className="font-mono text-xs text-ink/80 bg-sand-dark/50 px-2.5 py-1 rounded-lg">
                    {formatTime(item.open_time)} – {formatTime(item.close_time)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
