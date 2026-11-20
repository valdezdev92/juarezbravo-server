import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { EDITORIAL_CATEGORIES, slugify } from "@/lib/categories";
import { ArrowLeft, Megaphone, Save, X, Image as ImageIcon } from "lucide-react";
import { articleKeys, invalidateArticles } from "@/lib/article-queries";
import { Button } from "@/components/ui/button";
import { localDateTime, tickerKeys } from "@/lib/ticker";

const EMPTY = {
  title: "", slug: "", excerpt: "", body: "", cover_image: "",
  category: "", tags: [], status: "draft",
  is_breaking_news: false, is_featured: false, author: "", published_at: "", featured_until: "",
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
  const location = useLocation();
  const isEdit       = Boolean(id);

  const [form, setForm]             = useState(EMPTY);
  const [tagInput, setTagInput]     = useState("");
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState(location.state?.error || "");
  const [coverBroken, setCoverBroken] = useState(false);
  const [slugTouched, setSlugTouch] = useState(false);

  const { data: existing, isLoading: loadingExisting, isError: loadError, refetch } = useQuery({
    queryKey: articleKeys.adminDetail(id),
    queryFn: ({ signal }) => api.articles.adminGet(id, signal),
    enabled: isEdit,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (existing) {
      const loaded = { ...EMPTY };
      for (const key of Object.keys(EMPTY)) loaded[key] = existing[key] ?? EMPTY[key];
      setForm(loaded);
      setSlugTouch(true);
    }
  }, [existing]);

  useEffect(() => {
    if (!slugTouched && !isEdit) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCoverBroken(false);
  }, [form.cover_image]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    /** @param {typeof EMPTY} payload */
    mutationFn: async (payload) => {
      if (isEdit) return api.articles.update(id, payload);
      return api.articles.create(payload);
    },
    onSuccess: async (savedArticle, payload) => {
      queryClient.setQueryData(articleKeys.adminDetail(savedArticle.id), savedArticle);
      await Promise.all([
        invalidateArticles(queryClient),
        queryClient.invalidateQueries({ queryKey: tickerKeys.all }),
      ]);

      if (payload.status === "published" && savedArticle.status !== "published") {
        setForm((f) => ({ ...f, status: savedArticle.status }));
        const message = "La noticia se guardó como borrador. Corrige la imagen de portada e intenta publicar de nuevo.";
        setError(message);
        if (!isEdit) navigate(`/admin/articulos/${savedArticle.id}/editar`, { replace: true, state: { error: message } });
        return;
      }

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
      title: form.title.trim(),
      slug: form.slug || slugify(form.title),
      tags: form.tags || [],
      featured_until: form.is_featured && form.featured_until ? form.featured_until : null,
      category: form.category || null,
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
  if (isEdit && loadError) return <p role="alert">No pudimos cargar el artículo. <button type="button" onClick={() => refetch()} className="text-primary underline">Reintentar</button></p>;

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      <div className="admin-page-heading">
        <div>
          <Link to="/admin/articulos" className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={15} /> Noticias</Link>
          <h1>{isEdit ? "Editar noticia" : "Nueva noticia"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {existing?.status === "published" && existing.slug && (
            <Button asChild variant="outline"><Link to={`/admin/ticker?articulo=${encodeURIComponent(id)}`}><Megaphone size={16} /> Enviar a Última hora</Link></Button>
          )}
          {form.status !== "published" && (
            <Button type="button" disabled={saveMutation.isPending || uploading} onClick={(e) => handleSubmit(e, true)}>Publicar</Button>
          )}
          <Button type="submit" variant={form.status === "published" ? "default" : "secondary"} disabled={saveMutation.isPending || uploading}>
            <Save size={16} />{saveMutation.isPending ? "Guardando…" : form.status === "published" ? "Guardar cambios" : "Guardar borrador"}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm text-primary">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="min-w-0 lg:col-span-2 space-y-5">
          <div className="admin-panel p-4 sm:p-5 space-y-4">
            <div>
              <label htmlFor="article-title" className="text-xs font-semibold text-muted-foreground">Título</label>
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                id="article-title"
                maxLength={500}
                placeholder="Título de la noticia"
                className="w-full mt-1 font-serif font-bold text-2xl bg-transparent border-b border-border focus:border-primary outline-none py-2"
              />
            </div>
            <div>
              <label htmlFor="article-slug" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">URL (slug)</label>
              <input
                id="article-slug"
                value={form.slug}
                onChange={(e) => { setSlugTouch(true); setField("slug", slugify(e.target.value)); }}
                placeholder="url-de-la-noticia"
                className="w-full mt-1 bg-secondary border border-border px-3 py-2 text-sm font-mono outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">/noticias/{form.slug || "..."}</p>
            </div>
            <div>
              <label htmlFor="article-excerpt" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Resumen</label>
              <textarea
                id="article-excerpt"
                value={form.excerpt}
                onChange={(e) => setField("excerpt", e.target.value)}
                placeholder="Breve descripción que aparecerá en la portada y previews."
                rows={2}
                className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="admin-panel min-w-0 overflow-hidden">
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
          <div className="admin-panel p-4 sm:p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Publicación</h3>
            <div>
              <label htmlFor="article-status" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Estado</label>
              <select
                id="article-status"
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
              <span className="text-sm font-medium">Destacar en la portada</span>
            </label>
            {form.is_featured && (
              <label className="grid min-w-0 gap-1.5 text-sm font-semibold">
                Mostrar hasta
                <input type="datetime-local" className="admin-input min-w-0" value={localDateTime(form.featured_until)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setField("featured_until", Number.isFinite(date.getTime()) ? date.toISOString() : "");
                  }}
                />
                <span className="text-xs font-normal text-muted-foreground">Usa la hora de tu dispositivo. Vacío para mantener el destaque sin vencimiento.</span>
              </label>
            )}
            <div>
              <label htmlFor="article-author" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Autor</label>
              <input
                id="article-author"
                value={form.author}
                onChange={(e) => setField("author", e.target.value)}
                placeholder="Redacción JuarezBravo"
                className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="admin-panel p-4 sm:p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Imagen de portada</h3>
            {form.cover_image ? (
              <div className="relative">
                <img
                  src={form.cover_image}
                  alt="Vista previa de la portada"
                  onError={() => setCoverBroken(true)}
                  className="w-full aspect-[16/10] object-cover"
                />
                {coverBroken && (
                  <p className="mt-1 text-xs text-primary font-medium">
                    ⚠️ Esta imagen no cargó — no se podrá publicar la nota hasta que la corrijas.
                  </p>
                )}
                <button
                  type="button"
                  aria-label="Quitar imagen de portada"
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
              <label htmlFor="article-cover_image" className="text-[11px] uppercase tracking-wider text-muted-foreground">O pega una URL</label>
              <input
                id="article-cover_image"
                value={form.cover_image}
                onChange={(e) => setField("cover_image", e.target.value)}
                placeholder="https://..."
                className="w-full mt-1 bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="admin-panel p-4 sm:p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Categoría</h3>
            <select
              aria-label="Categoría"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="">Sin categoría</option>
              {EDITORIAL_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>

          <div className="admin-panel p-4 sm:p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm uppercase tracking-wider border-b border-border pb-2">Etiquetas</h3>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Agregar etiqueta"
                aria-label="Nueva etiqueta" className="admin-input min-w-0 flex-1"
              />
              <button type="button" onClick={addTag} aria-label="Agregar etiqueta" className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">+</button>
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

    </form>
  );
}
