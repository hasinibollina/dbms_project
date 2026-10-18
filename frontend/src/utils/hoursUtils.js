/**
 * Operating Hours Utilities
 * Schema: day_of_week 0=Monday ... 6=Sunday
 */

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Returns current day of week in schema index:
 * 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
 */
export function getTodayDbDay() {
  const jsDay = new Date().getDay(); // 0 is Sunday, 1 is Monday
  return (jsDay + 6) % 7;
}

/**
 * Formats "09:00:00" or "09:00" to "9:00 AM"
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Computes whether a venue is open right now based on its operating hours array
 */
export function computeIsOpen(hours) {
  if (!Array.isArray(hours) || hours.length === 0) {
    return { isOpen: null, statusText: 'Hours unavailable' };
  }

  const todayDbDay = getTodayDbDay();
  const todaySchedule = hours.find((h) => Number(h.day_of_week) === todayDbDay);

  if (!todaySchedule || todaySchedule.is_closed) {
    return { isOpen: false, statusText: 'Closed' };
  }

  if (!todaySchedule.open_time || !todaySchedule.close_time) {
    return { isOpen: false, statusText: 'Closed' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = todaySchedule.open_time.split(':').map(Number);
  const [closeH, closeM] = todaySchedule.close_time.split(':').map(Number);

  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);

  const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

  return {
    isOpen,
    statusText: isOpen ? 'Open now' : 'Closed',
    openTimeFormatted: formatTime(todaySchedule.open_time),
    closeTimeFormatted: formatTime(todaySchedule.close_time),
  };
}
