import { useEffect, useReducer } from 'react';

// Actualiza la interfaz justo cuando cambia una vigencia, sin animar un contador.
export function useScheduleClock(items, tickByMinute = false) {
  const [, refresh] = useReducer(value => value + 1, 0);
  const now = Date.now();
  const boundary = items.reduce((earliest, item) => {
    for (const value of [item.starts_at, item.ends_at]) {
      const time = Date.parse(value);
      if (time > now) earliest = Math.min(earliest, time);
    }
    return earliest;
  }, Infinity);

  const next = tickByMinute && Number.isFinite(boundary)
    ? Math.min(boundary, now + 60_000)
    : boundary;

  useEffect(() => {
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(refresh, Math.min(Math.max(next - Date.now(), 0), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [next, now]);

  return now;
}
