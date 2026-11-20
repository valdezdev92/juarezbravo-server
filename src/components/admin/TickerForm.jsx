import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarDays, Search, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import { articleKeys } from "@/lib/article-queries";
import { useDebounce } from "@/hooks/use-debounce";
import { localDateTime } from "@/lib/ticker";
import { tickerUrl } from "../../../shared/ticker";

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DURATIONS = [[1, "1 hora"], [6, "6 horas"], [24, "24 horas"]];

export default function TickerForm({ item, article, close, onSave }) {
  const [headline, setHeadline] = useState(item?.headline ?? article?.title ?? "");
  const [url, setUrl] = useState(item?.article_id ? "" : item?.url ?? "");
  const [linked, setLinked] = useState(article || (item?.article_id
    ? { id: item.article_id, title: item.article_title || "Noticia eliminada", slug: item.article_slug }
    : null));
  const [linkType, setLinkType] = useState(linked ? "article" : url ? "url" : "none");
  const [start, setStart] = useState(item?.starts_at ?? null);
  const [end, setEnd] = useState(item?.ends_at ?? null);
  const [active, setActive] = useState(item?.is_active ?? true);
  const [search, setSearch] = useState("");
  const [validation, setValidation] = useState("");
  const debouncedSearch = useDebounce(search, 300).trim();
  const filters = { status: "published", sort: "-published_at", search: debouncedSearch, limit: 8 };
  const articles = useQuery({
    queryKey: articleKeys.adminList(filters),
    queryFn: ({ signal }) => api.articles.adminPage(filters, signal),
    enabled: linkType === "article" && !linked,
  });

  const save = useMutation({
    /** @param {{headline?: string, url?: string|null, article_id?: string|null, starts_at?: string|null, ends_at?: string|null, is_active?: boolean}} data */
    mutationFn: (data) => item?.id ? api.ticker.update(item.id, data) : api.ticker.create(data),
    onSuccess: onSave,
  });

  const submit = (event) => {
    event.preventDefault();
    setValidation("");
    save.reset();
    if (!headline.trim()) return setValidation("Escribe un titular.");
    if (linkType === "url" && !tickerUrl(url)) {
      return setValidation("Escribe una ruta del sitio o un enlace que empiece con https:// o http://.");
    }
    if (linkType === "article" && !linked) return setValidation("Selecciona una noticia publicada.");
    if (start && end && new Date(end) <= new Date(start)) {
      return setValidation("El fin debe ser posterior al inicio.");
    }
    const data = {
      headline: headline.trim(),
      url: linkType === "url" ? tickerUrl(url) : null,
      article_id: linkType === "article" ? linked?.id ?? null : null,
      starts_at: start,
      ends_at: end,
      is_active: active,
    };
    if (item) {
      const previous = { ...item, url: item.article_id ? null : item.url };
      const changes = Object.entries(data).filter(([key, value]) => value !== (previous[key] ?? null));
      if (!changes.length) return close();
      save.mutate(/** @type {Partial<typeof data>} */ (Object.fromEntries(changes)));
      return;
    }
    save.mutate(data);
  };

  const setDuration = (hours) => {
    const anchor = start ? new Date(start) : new Date();
    anchor.setMilliseconds(0);
    setEnd(new Date(anchor.getTime() + hours * 3_600_000).toISOString());
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) close(); }}>
      <DialogContent className="max-h-[90dvh] max-w-[min(94vw,38rem)] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item ? "Editar titular" : "Nuevo titular"}</DialogTitle>
          <DialogDescription>Configura el texto, el enlace y su vigencia en Última hora.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <label className="grid gap-1.5 text-sm font-semibold">
            Titular
            <input className="admin-input" value={headline} maxLength={500} required placeholder="Escribe el titular de la cabecera" onChange={(e) => setHeadline(e.target.value)} />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Destino
            <select className="admin-input" value={linkType} onChange={(e) => setLinkType(e.target.value)}>
              <option value="none">Solo texto</option>
              <option value="article">Noticia publicada</option>
              <option value="url">Enlace personalizado</option>
            </select>
          </label>
          {linkType === "url" && (
            <label className="grid gap-1.5 text-sm font-semibold">
              Enlace
              <input className="admin-input" value={url} required maxLength={1000} placeholder="https://… o /noticias/…" onChange={(e) => setUrl(e.target.value)} />
            </label>
          )}
          {linkType === "article" && (linked ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm">
              <div className="min-w-0">
                <p className="break-words font-semibold">{linked.title}</p>
                {!linked.slug && <p className="text-xs text-primary">La noticia debe estar publicada para aparecer en la cabecera.</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Cambiar noticia" onClick={() => setLinked(null)}><X size={16} /></Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="relative block">
                <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input className="admin-input pl-9" value={search} aria-label="Buscar noticia publicada" placeholder="Buscar noticia publicada" onChange={(e) => setSearch(e.target.value)} />
              </label>
              {articles.isError ? <p role="alert" className="text-sm text-primary">No se pudieron buscar noticias. <button type="button" className="underline" onClick={() => articles.refetch()}>Reintentar</button></p> : (
                <ul className="max-h-36 divide-y overflow-y-auto rounded-lg border border-border text-sm">
                  {articles.data?.items.filter(a => a.slug).map(a => (
                    <li key={a.id}>
                      <button type="button" className="w-full px-3 py-2 text-left hover:bg-secondary" onClick={() => { setLinked(a); if (!headline.trim()) setHeadline(a.title); }}>
                        {a.title}
                      </button>
                    </li>
                  ))}
                  {!articles.data?.items.some(a => a.slug) && <li className="px-3 py-2 text-muted-foreground">{articles.isFetching ? "Buscando…" : "Sin resultados"}</li>}
                </ul>
              )}
            </div>
          ))}

          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="px-2 text-sm font-semibold"><CalendarDays size={15} className="mr-1 inline" /> Vigencia</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5 text-sm font-semibold">Inicio
                <input type="datetime-local" className="admin-input min-w-0" value={localDateTime(start)} onChange={(e) => setStart(e.target.value ? new Date(e.target.value).toISOString() : null)} />
                <span className="text-xs font-normal text-muted-foreground">Vacío para empezar al activar.</span>
              </label>
              <label className="grid min-w-0 gap-1.5 text-sm font-semibold">Fin
                <input type="datetime-local" className="admin-input min-w-0" value={localDateTime(end)} onChange={(e) => setEnd(e.target.value ? new Date(e.target.value).toISOString() : null)} />
                <span className="text-xs font-normal text-muted-foreground">Vacío para mantenerlo sin vencimiento.</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map(([hours, label]) => (
                <Button type="button" key={hours} size="sm" variant="outline" onClick={() => setDuration(hours)}>{label}</Button>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => setEnd(null)}>Sin vencimiento</Button>
            </div>
            <p className="text-xs text-muted-foreground">Los atajos calculan el fin desde el inicio indicado o desde ahora. Hora de {TIME_ZONE}.</p>
          </fieldset>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-primary" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Habilitar dentro del horario
          </label>
          {(validation || save.isError) && <p role="alert" className="text-sm font-medium text-primary">{validation || save.error.message}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={close}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar titular"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
