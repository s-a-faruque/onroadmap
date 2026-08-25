import type { SnapMode } from './types';

const DAY_MS = 86_400_000;

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export function getYearStart(year: number) {
  return new Date(Date.UTC(year, 0, 1));
}

export function getTimelineStart(year: number, startMonth = 0) {
  return new Date(Date.UTC(year, startMonth, 1));
}

export function getTimelineEnd(year: number, startMonth = 0, monthSpan = 12) {
  return addDays(new Date(Date.UTC(year, startMonth + monthSpan, 1)), -1);
}

export function getYearEnd(year: number) {
  return getTimelineEnd(year, 0);
}

export function getYearDayCount(year: number, startMonth = 0, monthSpan = 12) {
  return daysBetween(getTimelineStart(year, startMonth), addDays(getTimelineEnd(year, startMonth, monthSpan), 1));
}

export function clampDay(day: number, year: number, startMonth = 0, monthSpan = 12) {
  return Math.min(Math.max(day, 0), getYearDayCount(year, startMonth, monthSpan) - 1);
}

export function dateToDay(value: string, year: number, startMonth = 0, monthSpan = 12) {
  return clampDay(daysBetween(getTimelineStart(year, startMonth), parseIsoDate(value)), year, startMonth, monthSpan);
}

export function dayToDate(day: number, year: number, startMonth = 0, monthSpan = 12) {
  return isoDate(addDays(getTimelineStart(year, startMonth), clampDay(day, year, startMonth, monthSpan)));
}

export function snapDay(day: number, year: number, snapMode: SnapMode, startMonth = 0, monthSpan = 12) {
  const clampedDay = clampDay(day, year, startMonth, monthSpan);

  if (snapMode === 'day') {
    return clampedDay;
  }

  if (snapMode === 'week') {
    return clampDay(Math.round(clampedDay / 7) * 7, year, startMonth, monthSpan);
  }

  const timelineStart = getTimelineStart(year, startMonth);
  const targetDate = addDays(timelineStart, clampedDay);
  const monthStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 1));
  const startDay = daysBetween(timelineStart, monthStart);
  const nextDay = daysBetween(timelineStart, nextMonthStart);

  return clampDay(clampedDay - startDay < nextDay - clampedDay ? startDay : nextDay, year, startMonth, monthSpan);
}

export function monthSegments(year: number, startMonth = 0, monthSpan = 12) {
  const timelineStart = getTimelineStart(year, startMonth);

  return Array.from({ length: monthSpan }, (_, monthIndex) => {
    const start = new Date(Date.UTC(year, startMonth + monthIndex, 1));
    const end = new Date(Date.UTC(year, startMonth + monthIndex + 1, 1));

    return {
      label: start.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      startDay: daysBetween(timelineStart, start),
      days: daysBetween(start, end),
    };
  });
}

export function quarterSegments(year: number, startMonth = 0, monthSpan = 12) {
  const timelineStart = getTimelineStart(year, startMonth);
  const quarterCount = Math.ceil(monthSpan / 3);

  return Array.from({ length: quarterCount }, (_, quarterIndex) => {
    const start = new Date(Date.UTC(year, startMonth + quarterIndex * 3, 1));
    const end = new Date(Date.UTC(year, startMonth + Math.min(quarterIndex * 3 + 3, monthSpan), 1));

    return {
      label: `Q${quarterIndex + 1} - FY${year}`,
      startDay: daysBetween(timelineStart, start),
      days: daysBetween(start, end),
    };
  });
}
