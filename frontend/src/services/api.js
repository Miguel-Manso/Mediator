import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api',
});

// Injeta o token JWT no cabecalho de autorizacao se disponivel
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@RochaMagazine:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para o login caso o token seja invalido 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('@RochaMagazine:token');
      localStorage.removeItem('@RochaMagazine:usuario');
      localStorage.removeItem('@RochaMagazine:user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
