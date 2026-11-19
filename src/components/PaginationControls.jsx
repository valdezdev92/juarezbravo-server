export default function PaginationControls({ page, hasMore, onChange, disabled = false }) {
  return (
    <nav aria-label="Paginación de artículos" className="mt-6 flex items-center justify-center gap-4">
      <button type="button" disabled={page <= 1 || disabled} onClick={() => onChange(page - 1)} className="border border-border px-4 py-2 hover:border-primary disabled:opacity-40">Anterior</button>
      <span aria-live="polite" className="text-sm">Página {page}</span>
      <button type="button" disabled={!hasMore || disabled} onClick={() => onChange(page + 1)} className="border border-border px-4 py-2 hover:border-primary disabled:opacity-40">Siguiente</button>
    </nav>
  );
}
