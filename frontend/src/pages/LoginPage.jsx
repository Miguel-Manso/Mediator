import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AuroraBackground from '../components/ui/aurora-background';

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
      navegar('/ordens-servico');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao conectar. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  // Cores adaptadas à paleta oficial do Mediator: Laranja (#DE6C20) e Azul Escuro (#0D223A / #2A4B6E)
  const auroraProps = {
    gradientColors: [
      'rgba(222, 108, 32, 0.40)', // Laranja Mediator (#DE6C20)
      'rgba(13, 34, 58, 0.80)',   // Azul Escuro (#0D223A)
      'rgba(42, 75, 110, 0.55)',  // Azul Ardósia (#2A4B6E)
      'rgba(240, 138, 60, 0.30)', // Laranja Dourado
    ],
    pulseDuration: 8,
    starCount: 80,
  };

  return (
    <AuroraBackground {...auroraProps} className="min-h-screen px-4 py-8">
      {/* Card Principal */}
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-white/20 bg-white/95 backdrop-blur-xl p-8 shadow-[0_24px_60px_rgba(13,34,58,0.45)]">
        
        {/* Nova Logo Oficial Mediator Interlocking M */}
        <div className="mb-4 flex items-center justify-center">
          <img src="/logo.png" alt="Mediator Logo" className="h-20 w-auto object-contain drop-shadow-sm" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#14253D]">Mediator</h1>
        <p className="mb-6 text-center text-xs font-medium text-[#437194]">
          Assistência Técnica & Gestão de Ordens de Serviço
        </p>

        {erro && (
          <div className="mb-4 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {erro}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={aoSubmeter} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#14253D] mb-1">
              E-mail de Acesso
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="form-control"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#14253D] mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="primary-action w-full mt-2"
          >
            {carregando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Acessando...</span>
              </>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>
      </div>
    </AuroraBackground>
  );
};

export default LoginPage;
