import React from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "@/lib/categories";

const siteLinks = [
  { to: "/", label: "Inicio" },
  { to: "/buscar", label: "Buscar" },
  { to: "/admin", label: "Panel editorial" },
  { to: "/privacidad", label: "Política de privacidad" },
  { to: "/terminos", label: "Términos del servicio" },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t-4 border-brand-red bg-foreground text-background">
      <div className="site-container py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/logo-mark.png" alt="" width="60" height="60" loading="lazy" />
              <span className="font-display text-[32px] uppercase leading-none">Juárez Bravo</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/75">
              Noticias de Ciudad Juárez, Chihuahua.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-sans text-xs font-bold uppercase tracking-widest">Secciones</h2>
            <ul className="space-y-2">
              {CATEGORIES.map(({ slug, name }) => (
                <li key={slug}>
                  <Link to={`/categoria/${slug}`} className="text-sm text-background/75 hover:text-background hover:underline">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 font-sans text-xs font-bold uppercase tracking-widest">Sitio</h2>
            <ul className="space-y-2">
              {siteLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-background/75 hover:text-background hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-9 border-t border-background/20 pt-5 text-xs text-background/70">
          © {new Date().getFullYear()} Juárez Bravo. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
