import { Link, useLocation } from "react-router-dom";

export default function PageNotFound() {
  const { pathname } = useLocation();
  const pageName = pathname.substring(1);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md border-t-4 border-brand-red bg-card px-6 py-10 text-center sm:px-10">
        <img src="/juarez-bravo-logo-mark.png" alt="Juárez Bravo" width="88" height="88" className="mx-auto mb-6" />
        <p className="font-display text-5xl text-primary">404</p>
        <h1 className="mt-3 font-serif text-2xl font-bold">Página no encontrada</h1>
        <p className="mt-3 break-words text-sm text-muted-foreground">
          La página «{pageName}» no existe en este sitio.
        </p>
        <Link to="/" className="mt-6 inline-block bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
