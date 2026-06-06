import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AlertCircle } from "lucide-react";

export default function BreakingTicker() {
  const { data: items = [] } = useQuery({
    queryKey: ["ticker", "active"],
    queryFn: () => api.ticker.filter({ is_active: true }, "order", 30),
    staleTime: 60_000,
  });

  if (!items.length) return null;

  const loop = [...items, ...items];

  return (
    <div className="bg-primary text-primary-foreground border-b border-primary/40 overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center gap-2 px-4 py-2 bg-black/20 shrink-0 z-10">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Último Momento</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="ticker-track flex whitespace-nowrap py-2">
            {loop.map((item, idx) => (
              <span
                key={`${item.id}-${idx}`}
                className="px-6 text-sm font-medium tracking-tight border-r border-white/20"
              >
                {item.headline}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
