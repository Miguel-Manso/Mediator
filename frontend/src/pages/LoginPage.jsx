import React, { useState } from 'react';
import { Wrench, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const { entrar } = useAuth();
  const navegar = useNavigate();

  const aoSubmeter = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await entrar({ email: email.trim(), senha });
      navegar('/clientes');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao conectar. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  const loginRapido = (emailDemonstracao, senhaDemonstracao) => {
    setEmail(emailDemonstracao);
    setSenha(senhaDemonstracao);
    setErro('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f7] p-4">
      {/* Card Principal */}
      <div className="flex w-full max-w-md flex-col items-center rounded-lg border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        
        {/* Icone Mediator */}
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-slate-800 text-white">
          <Wrench className="h-5 w-5" />
        </div>

        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-800">Mediator</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Sistema de Gestão de Ordens de Serviço
        </p>

        {erro && (
          <div className="mb-4 w-full rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {erro}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={aoSubmeter} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              maxLength={180}
              required
              className="form-control"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              maxLength={100}
              required
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="primary-action w-full"
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
          </button>
        </form>

        {/* Credenciais para Teste Rapido */}
        <div className="mt-6 flex w-full flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Info className="h-4 w-4 text-slate-500" />
            <span>Contas de Acesso Rápido:</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => loginRapido('admin@mediator.com', 'admin123')}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="font-semibold text-slate-800 text-[11px]">Admin (Rocha)</div>
              <div className="text-[10px] text-slate-500">admin123</div>
            </button>
            <button
              type="button"
              onClick={() => loginRapido('miguel@mediator.com', 'admin123')}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="font-semibold text-slate-800 text-[11px]">Miguel (Admin)</div>
              <div className="text-[10px] text-slate-500">admin123</div>
            </button>
            <button
              type="button"
              onClick={() => loginRapido('ana@mediator.com', '123456')}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="font-semibold text-slate-800 text-[11px]">Ana (Atendente)</div>
              <div className="text-[10px] text-slate-500">123456</div>
            </button>
            <button
              type="button"
              onClick={() => loginRapido('carlos@mediator.com', '123456')}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="font-semibold text-slate-800 text-[11px]">Carlos (Técnico)</div>
              <div className="text-[10px] text-slate-500">123456</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PaginaLogin = LoginPage;
