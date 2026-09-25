import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('@RochaMagazine:usuario') || localStorage.getItem('@RochaMagazine:user');
    const tokenSalvo = localStorage.getItem('@RochaMagazine:token');

    if (usuarioSalvo && tokenSalvo) {
      try {
        const dados = JSON.parse(usuarioSalvo);
        const usuarioFormatado = {
          id: dados.id,
          nome: dados.nome || dados.name,
          email: dados.email,
          cargo: dados.cargo || (dados.role === 'ATTENDANT' ? 'ATENDENTE' : dados.role === 'TECHNICIAN' ? 'TECNICO' : dados.role) || 'ATENDENTE',
          name: dados.nome || dados.name,
          role: dados.cargo || dados.role,
        };
        setUsuario(usuarioFormatado);
      } catch {
        localStorage.removeItem('@RochaMagazine:usuario');
        localStorage.removeItem('@RochaMagazine:user');
        localStorage.removeItem('@RochaMagazine:token');
      }
    }
    setCarregando(false);
  }, []);

  const entrar = async ({ email, senha, password }) => {
    const senhaFinal = senha || password || '';
    const resposta = await api.post('/auth/login', { email, senha: senhaFinal });
    const { token, usuario: dadosUsuario, user: dadosUser } = resposta.data;
    const bruto = dadosUsuario || dadosUser;

    const usuarioObj = {
      id: bruto.id,
      nome: bruto.nome || bruto.name,
      email: bruto.email,
      cargo: bruto.cargo || (bruto.role === 'ATTENDANT' ? 'ATENDENTE' : bruto.role === 'TECHNICIAN' ? 'TECNICO' : bruto.role) || 'ATENDENTE',
      name: bruto.nome || bruto.name,
      role: bruto.cargo || bruto.role,
    };

    localStorage.setItem('@RochaMagazine:token', token);
    localStorage.setItem('@RochaMagazine:usuario', JSON.stringify(usuarioObj));
    localStorage.setItem('@RochaMagazine:user', JSON.stringify(usuarioObj));
    setUsuario(usuarioObj);
  };

  const sair = () => {
    localStorage.removeItem('@RochaMagazine:token');
    localStorage.removeItem('@RochaMagazine:usuario');
    localStorage.removeItem('@RochaMagazine:user');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        user: usuario,
        autenticado: !!usuario,
        isAuthenticated: !!usuario,
        carregando,
        loading: carregando,
        entrar,
        signIn: entrar,
        sair,
        signOut: sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const useAutenticacao = useAuth;
export const ProvedorAutenticacao = AuthProvider;
