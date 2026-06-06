import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Trash2, Plus, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

export default function AdminTicker() {
  const queryClient = useQueryClient();
  const [headline, setHeadline] = useState("");
  const [url, setUrl]           = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "ticker"],
    queryFn: () => api.ticker.list("order", 100),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "ticker"] });

  const createMutation = useMutation({
    mutationFn: (data) => api.ticker.create(data),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.ticker.update(id, data),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.ticker.delete(id),
    onSuccess: invalidate,
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!headline.trim()) return;
    const order = items.length ? Math.max(...items.map((i) => i.order || 0)) + 1 : 0;
    createMutation.mutate({ headline: headline.trim(), url: url.trim(), is_active: true, order });
    setHeadline("");
    setUrl("");
  };

  const move = (item, dir) => {
    const sorted = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx    = sorted.findIndex((i) => i.id === item.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const other = sorted[newIdx];
    updateMutation.mutate({ id: item.id, data: { order: other.order } });
    updateMutation.mutate({ id: other.id, data: { order: item.order } });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif font-bold text-3xl">Ticker Urgente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Titulares que se muestran en la banda guinda animada en la parte superior del sitio.
        </p>
      </div>

      <form onSubmit={handleAdd} className="bg-white border border-border p-5 space-y-3">
        <h2 className="font-serif font-bold text-sm uppercase tracking-wider">Agregar nuevo titular</h2>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Titular de último momento..."
          className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL relacionada (opcional)"
          className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
        />
        <button
          type="submit"
          disabled={!headline.trim() || createMutation.isPending}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold uppercase disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />Agregar
        </button>
      </form>

      <div className="bg-white border border-border">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-serif font-bold text-sm uppercase tracking-wider">Titulares ({items.length})</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No hay titulares en el ticker.</div>
        ) : (
          <ul className="divide-y divide-border">
            {[...items].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => (
              <li key={item.id} className={`px-5 py-3 flex items-center gap-3 ${!item.is_active ? "opacity-50" : ""}`}>
                <div className="flex flex-col">
                  <button onClick={() => move(item, -1)} className="p-0.5 hover:text-primary"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(item, 1)}  className="p-0.5 hover:text-primary"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.headline}</div>
                  {item.url && <div className="text-[11px] text-muted-foreground truncate">{item.url}</div>}
                </div>
                <button
                  onClick={() => updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } })}
                  className="p-2 hover:text-primary"
                  title={item.is_active ? "Desactivar" : "Activar"}
                >
                  {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { if (window.confirm("¿Eliminar titular?")) deleteMutation.mutate(item.id); }}
                  className="p-2 hover:text-primary"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
