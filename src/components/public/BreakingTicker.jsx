import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import { visibleTickerQuery } from "@/lib/ticker";
import { useScheduleClock } from "@/hooks/use-schedule-clock";
import { tickerUrl } from "../../../shared/ticker";

export function TickerStrip({ items, preview = false }) {
  const [paused, setPaused] = useState(false);
  if (!items.length && !preview) return null;

  const renderHeadlines = (duplicate = false) => items.map((item) => {
    const url = tickerUrl(item.url);
    return (
      <li key={item.id} className="shrink-0 border-r border-border px-3 sm:px-4">
        {url && !preview ? (
          <a href={url} tabIndex={duplicate ? -1 : undefined} className="hover:text-primary hover:underline focus-visible:underline">
            {item.headline}
          </a>
        ) : item.headline}
      </li>
    );
  });

  const moving = items.length > 0 && !paused;
  return (
    <section aria-label={preview ? "Vista previa de Última hora" : "Última hora"} className={preview ? "bg-card" : "border-b border-border bg-card"}>
      <div className={preview ? "flex items-stretch" : "site-container flex items-stretch"}>
        <span className="flex shrink-0 items-center bg-primary px-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground sm:px-4 sm:text-xs">
          Última hora
        </span>
        <div
          className={`ticker-viewport min-w-0 flex-1 ${moving ? "overflow-hidden motion-reduce:overflow-x-auto" : "overflow-x-auto"}`}
          role="group"
          aria-label="Titulares"
          tabIndex={items.length ? 0 : undefined}
          onFocus={(event) => { if (event.target !== event.currentTarget) setPaused(true); }}
        >
          <div className={`flex w-max py-3 text-xs font-semibold sm:text-sm ${moving ? "ticker-track" : ""}`}>
            {items.length ? (
              <>
                <ul className="ticker-list flex items-center whitespace-nowrap">{renderHeadlines()}</ul>
                {moving && (
                  <ul aria-hidden="true" className="ticker-list flex items-center whitespace-nowrap motion-reduce:hidden">
                    {renderHeadlines(true)}
                  </ul>
                )}
              </>
            ) : <p className="px-3 font-normal text-muted-foreground">Sin titulares visibles</p>}
          </div>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            className="ml-1 flex w-10 shrink-0 items-center justify-center hover:bg-secondary hover:text-primary motion-reduce:hidden"
            aria-label={paused ? "Reanudar titulares" : "Pausar titulares"}
          >
            {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          </button>
        )}
      </div>
    </section>
  );
}

export default function BreakingTicker() {
  const { data: items = [] } = useQuery(visibleTickerQuery);
  const now = useScheduleClock(items);
  return <TickerStrip items={items.filter(item => !item.ends_at || Date.parse(item.ends_at) > now)} />;
}
