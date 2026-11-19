import React from "react";

export default function SectionHeader({ title, id, children }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-2.5 sm:mb-6">
      <h2 id={id} className="flex items-center gap-3 font-display text-[28px] uppercase leading-tight sm:text-[34px]">
        <span aria-hidden="true" className="h-6 w-1 shrink-0 bg-brand-red" />
        {title}
      </h2>
      {children}
    </div>
  );
}
