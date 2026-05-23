import React from "react";

export default function SectionHeader({ title, subtitle, accent = true }) {
  return (
    <div className="flex items-end justify-between border-b-2 border-foreground pb-2 mb-6">
      <div className="flex items-center gap-3">
        {accent && <span className="w-1.5 h-7 bg-primary" />}
        <div>
          <h2 className="font-serif font-bold text-2xl tracking-tight uppercase">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}