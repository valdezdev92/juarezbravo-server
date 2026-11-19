import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { lazy, Suspense } from 'react';

// Public layout + pages
import PublicLayout from '@/components/public/PublicLayout';
import Home from '@/pages/Home';
const ArticleDetail = lazy(() => import('@/pages/ArticleDetail'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const TagPage = lazy(() => import('@/pages/TagPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));

// Admin
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminArticles = lazy(() => import('@/pages/admin/AdminArticles'));
const AdminArticleEditor = lazy(() => import('@/pages/admin/AdminArticleEditor'));
const AdminTicker = lazy(() => import('@/pages/admin/AdminTicker'));
const AdminTags = lazy(() => import('@/pages/admin/AdminTags'));

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <Suspense fallback={<div role="status" className="site-container py-12 text-muted-foreground">Cargando página…</div>}>
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/noticias/:slug" element={<ArticleDetail />} />
                <Route path="/categoria/:slug" element={<CategoryPage />} />
                <Route path="/etiqueta/:slug" element={<TagPage />} />
                <Route path="/buscar" element={<SearchPage />} />
                <Route path="/privacidad" element={<PrivacyPolicy />} />
                <Route path="/terminos" element={<TermsOfService />} />
              </Route>

              {/* Admin routes */}
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/articulos" element={<AdminArticles />} />
                <Route path="/admin/articulos/nuevo" element={<AdminArticleEditor />} />
                <Route path="/admin/articulos/:id/editar" element={<AdminArticleEditor />} />
                <Route path="/admin/ticker" element={<AdminTicker />} />
                <Route path="/admin/etiquetas" element={<AdminTags />} />
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
            </Suspense>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
