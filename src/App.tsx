import { Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CatalogPage } from './pages/CatalogPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { DealsPage } from './pages/DealsPage';
import { WorkshopPage } from './pages/WorkshopPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/ofertas" element={<DealsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/taller"
          element={
            <ProtectedRoute allowedRoles={['taller', 'admin']}>
              <WorkshopPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}