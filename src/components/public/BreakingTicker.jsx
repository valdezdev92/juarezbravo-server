import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import { api } from "@/api/client";

export default function BreakingTicker() {
  const [paused, setPaused] = useState(false);
  const { data: items = [] } = useQuery({
    queryKey: ["ticker", "active"],
    queryFn: () => api.ticker.filter({ is_active: true }, "order", 30),
    staleTime: 60_000,
  });

  if (!items.length) return null;

  const headlines = items.map((item) => (
    <li key={item.id} className="shrink-0 border-r border-border px-3 sm:px-4">
      {item.headline}
    </li>
  ));

  return (
    <section aria-label="Última hora" className="border-b border-border bg-card">
      <div className="site-container flex items-stretch">
        <span className="flex shrink-0 items-center bg-primary px-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground sm:px-4 sm:text-xs">
          Última hora
        </span>
        <div
          className={`ticker-viewport min-w-0 flex-1 ${paused ? "overflow-x-auto" : "overflow-hidden motion-reduce:overflow-x-auto"}`}
          role="group"
          aria-label="Titulares"
          tabIndex={0}
        >
          <div className={`flex w-max py-2.5 text-xs font-semibold sm:text-sm ${paused ? "" : "ticker-track"}`}>
            <ul className="ticker-list flex items-center whitespace-nowrap">{headlines}</ul>
            {!paused && (
              <ul aria-hidden="true" className="ticker-list flex items-center whitespace-nowrap motion-reduce:hidden">
                {headlines}
              </ul>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          className="ml-1 flex w-9 shrink-0 items-center justify-center hover:bg-secondary hover:text-primary motion-reduce:hidden"
          aria-label={paused ? "Reanudar titulares" : "Pausar titulares"}
        >
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
