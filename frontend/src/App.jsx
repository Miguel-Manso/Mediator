import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { ClientsPage } from './pages/ClientsPage';
import { EquipmentsPage } from './pages/EquipmentsPage';
import { ProductsPage } from './pages/ProductsPage';
import { UsersPage } from './pages/UsersPage';

const RotaPrivada = ({ children }) => {
  const { autenticado, isAuthenticated, carregando, loading } = useAuth();
  const estaAutenticado = autenticado ?? isAuthenticated;
  const estaCarregando = carregando ?? loading;

  if (estaCarregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"></div>
      </div>
    );
  }

  return estaAutenticado ? children : <Navigate to="/login" replace />;
};

// Protecao de rotas exclusivas para ADMIN
const RotaAdmin = ({ children }) => {
  const { usuario, user, carregando, loading } = useAuth();
  const estaCarregando = carregando ?? loading;
  const usuarioAtual = usuario || user;
  const cargo = String(usuarioAtual?.cargo || usuarioAtual?.role || '').toUpperCase();

  if (estaCarregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"></div>
      </div>
    );
  }

  if (cargo !== 'ADMIN') {
    return <Navigate to="/clientes" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <RotaPrivada>
                <AppLayout />
              </RotaPrivada>
            }
          >
            <Route index element={<Navigate to="/clientes" replace />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="equipamentos" element={<EquipmentsPage />} />
            <Route path="produtos" element={<ProductsPage />} />
            
            {/* Rota de Usuarios protegida para perfil ADMIN */}
            <Route
              path="usuarios"
              element={
                <RotaAdmin>
                  <UsersPage />
                </RotaAdmin>
              }
            />

            {/* Redirecionamentos para compatibilidade */}
            <Route path="clients" element={<Navigate to="/clientes" replace />} />
            <Route path="equipments" element={<Navigate to="/equipamentos" replace />} />
            <Route path="products" element={<Navigate to="/produtos" replace />} />
            <Route
              path="users"
              element={
                <RotaAdmin>
                  <UsersPage />
                </RotaAdmin>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
