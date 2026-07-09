// Naptár/menütervező tiszta segédfüggvényei — nem nyúl a storage.js-hez.

import { dateStr, parseDs, addDays } from "./shared.jsx";

const HU_WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const HU_MONTHS = [
  "Január", "Február", "Március", "Április", "Május", "Június",
  "Július", "Augusztus", "Szeptember", "Október", "November", "December",
];

export { HU_WEEKDAYS };

export function monthLabel(year, month) {
  return `${HU_MONTHS[month]} ${year}`;
}

export function addMonths(year, month, delta) {
  const total = month + delta;
  const y = year + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return { year: y, month: m };
}

// month: 0-indexed (JS Date convention). Hétfővel kezdődő, 42 cellás rács.
export function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7; // Hétfő = 0
  const start = new Date(year, month, 1 - mondayOffset);
  const today = dateStr(new Date());

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const ds = dateStr(d);
    cells.push({
      date: d,
      ds,
      inMonth: d.getMonth() === month,
      isToday: ds === today,
    });
  }
  return cells;
}

function entryRange(entry) {
  const end = addDays(entry.startDate, (entry.durationDays || 1) - 1);
  return [entry.startDate, end];
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function getEntriesCoveringDay(mealPlan, ds) {
  return Object.values(mealPlan).filter((entry) => {
    const [start, end] = entryRange(entry);
    return ds >= start && ds <= end;
  });
}

export function findOverlappingEntries(mealPlan, startDate, durationDays, excludeId) {
  const end = addDays(startDate, (durationDays || 1) - 1);
  return Object.values(mealPlan).filter((entry) => {
    if (entry.id === excludeId) return false;
    const [s, e] = entryRange(entry);
    return rangesOverlap(startDate, end, s, e);
  });
}

export function getEntriesInRange(mealPlan, rangeStart, rangeEnd) {
  return Object.values(mealPlan).filter((entry) => {
    const [s, e] = entryRange(entry);
    return rangesOverlap(rangeStart, rangeEnd, s, e);
  });
}

export function daysBetweenInclusive(dsStart, dsEnd) {
  const a = parseDs(dsStart);
  const b = parseDs(dsEnd);
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

export function newEntryId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}
