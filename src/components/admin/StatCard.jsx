import React from "react";

/** @param {{label: string, value: string|number, icon: import('lucide-react').LucideIcon, accent?: boolean}} props */
export default function StatCard({ label, value, icon: Icon, accent = false }) {
  return (
    <div className="admin-panel flex min-w-0 flex-wrap items-start justify-between gap-2 p-4 sm:p-5">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-muted-foreground sm:text-sm">{label}</div>
        <div className="mt-1 break-all font-serif text-2xl font-bold tabular-nums sm:text-3xl">
          {typeof value === "number" ? value.toLocaleString("es-MX") : value}
        </div>
      </div>
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${accent ? "bg-primary/10 text-primary" : "bg-background text-foreground"}`}>
        <Icon size={17} aria-hidden="true" />
      </span>
    </div>
  );
}
