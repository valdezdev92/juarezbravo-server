import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { CATEGORIES, slugify } from "@/lib/categories";
import { ArrowLeft, Save, X, Image as ImageIcon } from "lucide-react";

const EMPTY = {
  title: "", slug: "", excerpt: "", body: "", cover_image: "",
  category: "", tags: [], status: "draft",
  is_breaking_news: false, is_featured: false, author: "", published_at: "",
};

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link"],
    [{ align: [] }],
    ["clean"],
  ],
};

export default function AdminArticleEditor() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const isEdit       = Boolean(id);

  const [form, setForm]             = useState(EMPTY);
  const [tagInput, setTagInput]     = useState("");
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState("");
  const [slugTouched, setSlugTouch] = useState(false);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin", "article", id],
    queryFn: async () => {
      const cached = queryClient.getQueryData(["admin", "articles"]);
      if (cached) {
        const found = cached.find((a) => a.id === id);
        if (found) return found;
      }
      const all = await api.articles.list("-created_date", 500);
      return all.find((a) => a.id === id) ?? null;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({ ...EMPTY, ...existing, tags: existing.tags || [] });
      setSlugTouch(true);
    }
  }, [existing]);

  useEffect(() => {
    if (!slugTouched && !isEdit) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) return api.articles.update(id, payload);
      return api.articles.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      queryClient.invalidateQueries({ queryKey: ["articles", "published"] });
      navigate("/admin/articulos");
    },
    onError: (err) => setError(err?.message || "Error al guardar"),
  });

  const handleSubmit = (e, publishNow = false) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("El título es obligatorio."); return; }
    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      tags: form.tags || [],
    };
    if (publishNow) payload.status = "published";
    if (payload.status === "published" && !payload.published_at) {
      payload.published_at = new Date().toISOString();
    }
    saveMutation.mutate(payload);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await api.upload(file);
      setField("cover_image", file_url);
    } catch {
      setError("No se pudo subir la imagen.");
    }
    setUploading(false);
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!form.tags.includes(v)) setField("tags", [...form.tags, v]);
    setTagInput("");
  };

  const removeTag = (t) => setField("tags", form.tags.filter((x) => x !== t));

  const wordCount = useMemo(() => {
    return (form.body || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  }, [form.body]);

  if (isEdit && loadingExisting) {
    return <div className="text-center text-muted-foreground py-10">Cargando artículo...</div>;
  }

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/admin/articulos")} className="p-2 hover:bg-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl">
            {isEdit ? "Editar Noticia" : "Nueva Noticia"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground text-sm font-semibold uppercase hover:bg-secondary/80"
          >
            <Save className="w-4 h-4" />Guardar Borrador
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase hover:bg-primary/90"
          >
            {saveMutation.isPending ? "Guardando..." : "Publicar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-primary/10 border border-primary text-primary px-4 py-2 text-sm">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-border p-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Título *</label>
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Titular impactante de la noticia"
                className="w-full mt-1 font-serif font-bold text-2xl bg-transparent border-b border-border focus:border-primary outline-none py-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">URL (slug)</label>
              <input
                value={form.slug}
                onChange={(e) => { setSlugTouch(true); setField("slug", slugify(e.target.value)); }}
                placeholder="url-de-la-noticia"
                className="w-full mt-1 bg-secondary border border-border px-3 py-2 text-sm font-mono outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">/noticias/{form.slug || "..."}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Resumen</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setField("excerpt", e.target.value)}
                placeholder="Breve descripción que aparecerá en la portada y previews."
                rows={2}
                className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="bg-white border border-border">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <label className="text-xs uppercase tracking-widest font-bold">Cuerpo del artículo</label>
              <span className="text-[11px] text-muted-foreground">{wordCount} palabras</span>
            </div>
            <ReactQuill
              theme="snow"
              value={form.body}
              onChange={(v) => setField("body", v)}
              modules={quillModules}
              placeholder="Escribe el contenido de la nota..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="bg-white border border-border p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Publicación</h3>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_breaking_news} onChange={(e) => setField("is_breaking_news", e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium">Marcar como urgente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setField("is_featured", e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium">Mostrar en hero principal</span>
            </label>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Autor</label>
              <input
                value={form.author}
                onChange={(e) => setField("author", e.target.value)}
                placeholder="Redacción JuarezBravo"
                className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="bg-white border border-border p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Imagen de portada</h3>
            {form.cover_image ? (
              <div className="relative">
                <img src={form.cover_image} alt="cover" className="w-full aspect-[16/10] object-cover" />
                <button
                  type="button"
                  onClick={() => setField("cover_image", "")}
                  className="absolute top-2 right-2 w-7 h-7 bg-white border border-border flex items-center justify-center hover:bg-primary hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border py-8 cursor-pointer hover:border-primary hover:bg-secondary/40">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{uploading ? "Subiendo..." : "Haz clic para subir imagen"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">O pega una URL</label>
              <input
                value={form.cover_image}
                onChange={(e) => setField("cover_image", e.target.value)}
                placeholder="https://..."
                className="w-full mt-1 bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="bg-white border border-border p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Categoría</h3>
            <select
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>

          <div className="bg-white border border-border p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Etiquetas</h3>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Agregar etiqueta"
                className="flex-1 bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
              />
              <button type="button" onClick={addTag} className="px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold uppercase">+</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-secondary px-2 py-1 text-xs">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-primary"><X className="w-3 h-3" /></button>
                </span>
              ))}
              {form.tags.length === 0 && <span className="text-xs text-muted-foreground">Sin etiquetas</span>}
            </div>
          </div>
        </aside>
      </div>

      <div className="sm:hidden flex gap-2">
        <button type="submit" disabled={saveMutation.isPending} className="flex-1 px-4 py-3 bg-secondary text-sm font-semibold uppercase">Guardar Borrador</button>
        <button type="button" onClick={(e) => handleSubmit(e, true)} disabled={saveMutation.isPending} className="flex-1 px-4 py-3 bg-primary text-primary-foreground text-sm font-semibold uppercase">Publicar</button>
      </div>
    </form>
  );
}
