import React from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "@/lib/categories";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary text-white flex items-center justify-center font-bold font-serif text-xl">
                J
              </div>
              <div className="font-serif font-bold text-xl">
                JuarezBravo<span className="text-primary">.com</span>
              </div>
            </div>
            <p className="text-sm text-white/70 max-w-md leading-relaxed">
              Tu fuente de noticias confiable en Ciudad Juárez. Cobertura local de
              seguridad, política, sociedad, deportes y entretenimiento las 24 horas.
            </p>
            <div className="flex gap-3 mt-6">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 border border-white/20 hover:bg-primary hover:border-primary flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold uppercase text-sm tracking-wider mb-4 text-white">
              Secciones
            </h4>
            <ul className="space-y-2">
              {CATEGORIES.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/categoria/${cat.slug}`}
                    className="text-sm text-white/70 hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase text-sm tracking-wider mb-4 text-white">
              Sitio
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-white/70 hover:text-primary">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/buscar" className="text-sm text-white/70 hover:text-primary">
                  Buscar
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-sm text-white/70 hover:text-primary">
                  Panel Editorial
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/50">
          <span>
            © {new Date().getFullYear()} JuarezBravo.com — Todos los derechos reservados.
          </span>
          <span>Hecho en Ciudad Juárez, Chihuahua.</span>
        </div>
      </div>
    </footer>
  );
}