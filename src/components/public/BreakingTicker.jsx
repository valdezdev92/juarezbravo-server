import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle } from "lucide-react";

export default function BreakingTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    base44.entities.BreakingNewsTicker.filter({ is_active: true }, "order", 30)
      .then((data) => setItems(data || []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  // Duplicate for seamless loop
  const loop = [...items, ...items];

  return (
    <div className="bg-primary text-primary-foreground border-b border-primary/40 overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center gap-2 px-4 py-2 bg-black/20 shrink-0 z-10">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            Último Momento
          </span>
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