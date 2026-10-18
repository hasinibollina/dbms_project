import React from 'react';
import { DAYS_OF_WEEK } from '../utils/hoursUtils';
import { Clock, Copy, AlertTriangle, Check, RotateCcw } from 'lucide-react';

export default function HoursEditor({ hours, onChange }) {
  // Update a single day's property
  const handleDayChange = (dayIndex, field, value) => {
    const updated = hours.map((item) => {
      if (item.day_of_week === dayIndex) {
        return {
          ...item,
          [field]: value,
        };
      }
      return item;
    });
    onChange(updated);
  };

  // Copy Monday's schedule (index 0) to all days
  const handleCopyMonday = () => {
    const monday = hours.find((h) => h.day_of_week === 0) || {
      open_time: '09:00',
      close_time: '22:00',
      is_closed: false,
    };

    const updated = hours.map((item) => ({
      ...item,
      open_time: monday.open_time,
      close_time: monday.close_time,
      is_closed: monday.is_closed,
    }));
    onChange(updated);
  };

  // Reset to standard college/commercial defaults (Mon-Sat 9 AM - 10 PM, Sun closed)
  const handleResetDefaults = () => {
    const standard = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      open_time: i === 6 ? '' : '09:00',
      close_time: i === 6 ? '' : '22:00',
      is_closed: i === 6,
    }));
    onChange(standard);
  };

  return (
    <div className="bg-sand rounded-2xl border border-sand-dark overflow-hidden shadow-sm space-y-4">
      {/* Header with Action Buttons */}
      <div className="bg-sand-dark/40 px-5 py-4 border-b border-sand-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-wine" />
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-ink">
              Operating Hours Editor
            </h3>
            <p className="text-[11px] text-ink/70">
              Specify daily opening and closing times. Schedule enforces open time &lt; close time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMonday}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand border border-sand-dark text-ink font-semibold text-xs hover:bg-wine hover:text-sand transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-wine"
            title="Duplicate Monday hours to Tuesday through Sunday"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Mon to all</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="p-1.5 rounded-lg border border-sand-dark text-ink/70 hover:text-ink hover:bg-sand-dark/40 transition-colors"
            title="Reset to default schedule (Mon-Sat 9am-10pm, Sun closed)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rows for Each Day (0 = Monday ... 6 = Sunday) */}
      <div className="divide-y divide-sand-dark/60 px-4 sm:px-5 pb-2">
        {hours.map((item) => {
          const dayIndex = item.day_of_week;
          const dayName = DAYS_OF_WEEK[dayIndex];
          const isClosed = Boolean(item.is_closed);

          // Format for input value: strip trailing seconds if present (e.g., "09:00:00" -> "09:00")
          const openValue = item.open_time ? item.open_time.slice(0, 5) : '';
          const closeValue = item.close_time ? item.close_time.slice(0, 5) : '';

          const hasTimeError =
            !isClosed &&
            openValue &&
            closeValue &&
            openValue >= closeValue;

          return (
            <div
              key={dayIndex}
              className={`py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                isClosed ? 'opacity-75 bg-sand-dark/10' : ''
              }`}
            >
              {/* Day Label & Closed Toggle */}
              <div className="flex items-center justify-between md:justify-start gap-4 md:w-52">
                <span className="font-semibold text-sm text-ink w-28">
                  {dayName}
                </span>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={(e) => handleDayChange(dayIndex, 'is_closed', e.target.checked)}
                    className="w-4 h-4 text-wine rounded border-sand-dark focus:ring-wine focus:ring-offset-sand"
                  />
                  <span className={`text-xs font-semibold ${isClosed ? 'text-red-700 font-bold' : 'text-ink/70'}`}>
                    {isClosed ? 'Closed' : 'Open'}
                  </span>
                </label>
              </div>

              {/* Time Pickers or Closed State Banner */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                {isClosed ? (
                  <div className="text-xs text-ink/60 italic bg-sand-dark/40 px-3 py-1.5 rounded-lg border border-sand-dark/50 flex-1">
                    Closed all day — no hours scheduled
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`open-time-${dayIndex}`} className="text-xs text-ink/70 font-medium">
                        Opens:
                      </label>
                      <input
                        id={`open-time-${dayIndex}`}
                        type="time"
                        value={openValue}
                        onChange={(e) => handleDayChange(dayIndex, 'open_time', e.target.value)}
                        required={!isClosed}
                        className="px-2.5 py-1.5 bg-sand border border-sand-dark rounded-lg text-xs font-mono font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                      />
                    </div>

                    <span className="text-ink/40 text-xs font-bold">to</span>

                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`close-time-${dayIndex}`} className="text-xs text-ink/70 font-medium">
                        Closes:
                      </label>
                      <input
                        id={`close-time-${dayIndex}`}
                        type="time"
                        value={closeValue}
                        onChange={(e) => handleDayChange(dayIndex, 'close_time', e.target.value)}
                        required={!isClosed}
                        className="px-2.5 py-1.5 bg-sand border border-sand-dark rounded-lg text-xs font-mono font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                      />
                    </div>
                  </div>
                )}

                {/* Validation Warning */}
                {hasTimeError && (
                  <div className="flex items-center gap-1 text-xs text-red-700 font-semibold bg-red-100 px-2.5 py-1 rounded-md border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Open time must be earlier than close time</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
