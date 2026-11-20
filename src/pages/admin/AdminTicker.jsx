import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, CalendarClock, Clock3, Megaphone, Pause, Pencil, Play, Plus, Radio, Search, Trash2,
} from "lucide-react";
import { api } from "@/api/client";
import { useScheduleClock } from "@/hooks/use-schedule-clock";
import { articleKeys } from "@/lib/article-queries";
import { TICKER_LIMIT, formatScheduleDate, formatScheduleDuration, tickerKeys, tickerStates, tickerStatus } from "@/lib/ticker";
import { TickerStrip } from "@/components/public/BreakingTicker";
import TickerForm from "@/components/admin/TickerForm";
import StatCard from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminTicker() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const articleId = params.get("articulo");
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const itemsQuery = useQuery({ queryKey: tickerKeys.admin, queryFn: ({ signal }) => api.ticker.adminList(signal) });
  const fromArticle = useQuery({
    queryKey: articleKeys.adminList({ id: articleId, status: "published" }),
    queryFn: ({ signal }) => api.articles.adminPage({ id: articleId, status: "published", limit: 1 }, signal),
    enabled: Boolean(articleId),
  });
  const article = fromArticle.data?.items[0];
  const items = itemsQuery.data || [];
  const now = useScheduleClock(items, true);
  const preview = [];
  const rows = items.map((item, index) => {
    const status = tickerStatus(item, now);
    if (status !== "live") return { item, index, status };
    if (preview.length === TICKER_LIMIT) return { item, index, status: "queued" };
    preview.push(item);
    return { item, index, status };
  });
  const term = search.trim().toLocaleLowerCase("es-MX");
  const filtered = rows.filter(({ item, status }) =>
    (filter === "all" || status === filter) &&
    `${item.headline} ${item.article_title || ""}`.toLocaleLowerCase("es-MX").includes(term)
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: tickerKeys.all });
  const closeEditor = () => {
    setEditor(null);
    if (articleId) {
      const next = new URLSearchParams(params);
      next.delete("articulo");
      setParams(next, { replace: true });
    }
  };
  const action = useMutation({
    /** @param {{type: 'move'|'toggle'|'delete', item: {id: string, is_active: boolean}, direction?: -1|1}} action */
    mutationFn: ({ type, item, direction }) => {
      if (type === "move") return api.ticker.move(item.id, direction);
      if (type === "toggle") return api.ticker.update(item.id, { is_active: !item.is_active });
      return api.ticker.delete(item.id);
    },
    onSettled: refresh,
  });

  return (
    <div className="space-y-6">
      <div className="admin-page-heading">
        <div>
          <h1>Última hora</h1>
          <p>Organiza los titulares que aparecen en la cabecera del sitio.</p>
        </div>
        <Button onClick={() => setEditor({})}><Plus size={17} /> Nuevo titular</Button>
      </div>

      {articleId && !article?.slug && (
        <div role={fromArticle.isFetching ? "status" : "alert"} className="admin-panel px-4 py-3 text-sm">
          {fromArticle.isFetching ? "Cargando noticia…" : "La noticia ya no está publicada o no tiene enlace público."}
          <Button type="button" variant="ghost" size="sm" onClick={closeEditor}>Cerrar</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="En cabecera" value={itemsQuery.data ? preview.length : "—"} icon={Radio} accent />
        <StatCard label="Programados" value={itemsQuery.data ? rows.filter(row => row.status === "scheduled").length : "—"} icon={CalendarClock} />
        <StatCard label="Pausados" value={itemsQuery.data ? rows.filter(row => row.status === "paused").length : "—"} icon={Pause} />
        <StatCard label="Vencidos" value={itemsQuery.data ? rows.filter(row => row.status === "expired").length : "—"} icon={Clock3} />
      </div>

      <section className="rounded-xl bg-foreground p-4 text-white sm:p-5" aria-labelledby="ticker-preview">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="ticker-preview" className="flex items-center gap-2 font-sans text-sm font-semibold"><Radio size={16} /> Vista previa de la cabecera</h2>
        </div>
        <div className="overflow-hidden rounded-md text-foreground">
          {itemsQuery.isError || itemsQuery.isLoading ? (
            <p className="bg-card px-4 py-3 text-sm text-muted-foreground">{itemsQuery.isLoading ? "Cargando vista previa…" : "Vista previa no disponible"}</p>
          ) : <TickerStrip items={preview} preview />}
        </div>
        {rows.some(row => row.status === "queued") && <p className="mt-2 text-xs text-white/85">La cabecera muestra los primeros {TICKER_LIMIT} titulares habilitados según el orden de la lista.</p>}
      </section>

      <section className="admin-panel" aria-labelledby="ticker-list">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <h2 id="ticker-list" className="font-serif text-lg font-semibold">Titulares <span className="ml-1 text-sm font-normal text-muted-foreground">{itemsQuery.data ? filtered.length : ""}</span></h2>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <label className="relative min-w-40 flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input className="admin-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar titulares" placeholder="Buscar titular" />
            </label>
            <select className="admin-input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar titulares por estado">
              <option value="all">Todos los estados</option>
              {Object.entries(tickerStates).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        {action.isError && <p role="alert" className="border-b px-4 py-3 text-sm text-primary">{action.error.message}</p>}
        {itemsQuery.isLoading ? <p role="status" className="p-6 text-sm text-muted-foreground">Cargando titulares…</p>
          : itemsQuery.isError ? <p role="alert" className="p-6 text-sm">No se pudieron cargar los titulares. <button type="button" onClick={() => itemsQuery.refetch()} className="text-primary underline">Reintentar</button></p>
            : !filtered.length ? (
              <div className="grid justify-items-center gap-2 px-4 py-9 text-center text-sm text-muted-foreground">
                <Megaphone size={22} aria-hidden="true" />
                {items.length ? "No hay titulares que coincidan con la búsqueda." : "Aún no hay titulares en Última hora."}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map(({ item, index, status }) => {
                  const state = tickerStates[status];
                  const duration = item.ends_at && (status === "scheduled" || status === "live")
                    ? formatScheduleDuration(Date.parse(item.ends_at) - (status === "scheduled" ? Date.parse(item.starts_at) : now))
                    : null;
                  return (
                    <li key={item.id} className="grid items-center gap-3 px-4 py-4 hover:bg-secondary/25 sm:px-5 md:grid-cols-[auto_minmax(0,1fr)_minmax(9.5rem,auto)_auto]">
                      <div className="flex items-center gap-1 md:grid">
                        <span className="mr-1 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Subir ${item.headline}`} disabled={index === 0 || action.isPending} onClick={() => action.mutate({ type: "move", item, direction: -1 })}><ArrowUp size={15} /></Button>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Bajar ${item.headline}`} disabled={index === items.length - 1 || action.isPending} onClick={() => action.mutate({ type: "move", item, direction: 1 })}><ArrowDown size={15} /></Button>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${state.className}`}>{state.label}</span>
                        <p className="break-words text-sm font-semibold">{item.headline}</p>
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-muted-foreground hover:text-primary hover:underline">{item.article_title === item.headline ? "Abrir noticia" : item.article_title || item.url}</a>}
                      </div>
                      <div className="text-xs leading-5 text-muted-foreground">
                        <div>{item.starts_at ? `Inicio ${formatScheduleDate(item.starts_at)}` : "Inicio al activar"}</div>
                        <div>{item.ends_at ? `Fin ${formatScheduleDate(item.ends_at)}` : "Sin vencimiento"}</div>
                        {duration && <p className="font-semibold text-foreground">{status === "live" ? "Restan" : "Duración"} {duration}</p>}
                      </div>
                      <div className="flex gap-1 md:justify-end">
                        <Button variant="ghost" size="icon" aria-label={`Editar ${item.headline}`} title="Editar" onClick={() => setEditor(item)}><Pencil size={16} /></Button>
                        <Button variant="ghost" size="icon" aria-label={`${item.is_active ? "Pausar" : "Habilitar"} ${item.headline}`} title={item.is_active ? "Pausar" : "Habilitar"} disabled={action.isPending} onClick={() => action.mutate({ type: "toggle", item })}>
                          {item.is_active ? <Pause size={16} /> : <Play size={16} />}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Eliminar ${item.headline}`} title="Eliminar" disabled={action.isPending} onClick={() => setDeleteTarget(item)}><Trash2 size={16} /></Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
      </section>

      {(editor || article?.slug) && (
        <TickerForm
          key={editor?.id ?? article?.id ?? "new"}
          item={editor?.id ? editor : null}
          article={editor ? null : article}
          close={closeEditor}
          onSave={async () => { await refresh(); closeEditor(); }}
        />
      )}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar titular?</AlertDialogTitle>
            <AlertDialogDescription>«{deleteTarget?.headline}» se retirará de Última hora.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => action.mutate({ type: "delete", item: deleteTarget })}>Eliminar titular</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
