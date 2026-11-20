import { queryOptions } from '@tanstack/react-query';
import { api } from '@/api/client';

export const TICKER_LIMIT = 30;
export const tickerKeys = {
  all: ['ticker'],
  admin: ['ticker', 'admin'],
  visible: ['ticker', 'visible'],
};

export const visibleTickerQuery = queryOptions({
  queryKey: tickerKeys.visible,
  queryFn: ({ signal }) => api.ticker.visible(TICKER_LIMIT, signal),
  staleTime: 15_000,
  refetchInterval: 15_000,
  refetchOnWindowFocus: 'always',
});

export const tickerStates = {
  queued: { label: 'Fuera de la cabecera', className: 'bg-secondary text-foreground/80' },
  live: { label: 'En cabecera', className: 'bg-emerald-50 text-emerald-800' },
  scheduled: { label: 'Programado', className: 'bg-blue-50 text-blue-800' },
  paused: { label: 'Pausado', className: 'bg-secondary text-foreground/80' },
  expired: { label: 'Vencido', className: 'bg-amber-50 text-amber-900' },
  unavailable: { label: 'Noticia no disponible', className: 'bg-primary/10 text-primary' },
};

export function tickerStatus(item, now) {
  if (!item.is_active) return 'paused';
  if (item.ends_at && Date.parse(item.ends_at) <= now) return 'expired';
  if (item.article_id && !item.article_slug) return 'unavailable';
  if (item.starts_at && Date.parse(item.starts_at) > now) return 'scheduled';
  return 'live';
}

export function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function formatScheduleDate(value) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatScheduleDuration(milliseconds) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} d ${hours % 24} h` : `${days} d`;
}
