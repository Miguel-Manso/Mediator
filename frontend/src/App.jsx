import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
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
                <DashboardLayout />
              </RotaPrivada>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="usuarios" element={<UsersPage />} />

            {/* Redirecionamentos para compatibilidade */}
            <Route path="clients" element={<Navigate to="/clientes" replace />} />
            <Route path="users" element={<Navigate to="/usuarios" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
