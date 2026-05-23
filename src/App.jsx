import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Public layout + pages
import PublicLayout from '@/components/public/PublicLayout';
import Home from '@/pages/Home';
import ArticleDetail from '@/pages/ArticleDetail';
import CategoryPage from '@/pages/CategoryPage';
import TagPage from '@/pages/TagPage';
import SearchPage from '@/pages/SearchPage';

// Admin
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminArticles from '@/pages/admin/AdminArticles';
import AdminArticleEditor from '@/pages/admin/AdminArticleEditor';
import AdminTicker from '@/pages/admin/AdminTicker';
import AdminTags from '@/pages/admin/AdminTags';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Public site is accessible to everyone; admin pages handle their own auth gate
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/noticias/:slug" element={<ArticleDetail />} />
        <Route path="/categoria/:slug" element={<CategoryPage />} />
        <Route path="/etiqueta/:slug" element={<TagPage />} />
        <Route path="/buscar" element={<SearchPage />} />
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
  );
};


function App() {

  return (
    <HelmetProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App