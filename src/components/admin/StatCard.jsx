import React from "react";

export default function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="font-serif font-bold text-3xl mt-2">{value}</div>
        </div>
        {Icon && (
          <div
            className={`w-10 h-10 flex items-center justify-center ${
              accent ? "bg-primary text-white" : "bg-secondary text-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}