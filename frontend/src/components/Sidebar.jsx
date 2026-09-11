import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  Laptop,
  Package,
  UserCheck,
  Wrench,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const itensMenu = [
  { nome: 'Clientes', caminho: '/clientes', icone: Users },
  { nome: 'Equipamentos', caminho: '/equipamentos', icone: Laptop },
  { nome: 'Produtos', caminho: '/produtos', icone: Package },
  { nome: 'Usuários', caminho: '/usuarios', icone: UserCheck, requerAdmin: true },
];

export const Sidebar = () => {
  const { usuario, user, sair, signOut } = useAuth();
  const usuarioAtual = usuario || user;
  const acaoSair = sair || signOut;

  const nomeExibicao = usuarioAtual?.nome || usuarioAtual?.name || 'Usuário';
  const cargoExibicao =
    usuarioAtual?.cargo ||
    (usuarioAtual?.role === 'ATTENDANT'
      ? 'ATENDENTE'
      : usuarioAtual?.role === 'TECHNICIAN'
      ? 'TECNICO'
      : usuarioAtual?.role) ||
    'ATENDENTE';

  const ehAdmin = String(cargoExibicao).toUpperCase() === 'ADMIN';

  // Ocultar rota/menu de usuários caso não seja ADMIN
  const itensVisiveis = itensMenu.filter((item) => !item.requerAdmin || ehAdmin);

  return (
    <aside className="flex min-h-screen w-60 flex-shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4">
      <div>
        <div className="mb-8 flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-white">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight text-slate-800">Mediator</h2>
          </div>
        </div>

        <nav className="space-y-1">
          {itensVisiveis.map((item) => {
            const Icone = item.icone;
            return (
              <NavLink
                key={item.caminho}
                to={item.caminho}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 font-semibold text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icone className="w-4 h-4" />
                <span>{item.nome}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-800 truncate">{nomeExibicao}</p>
            <span className="text-[11px] text-slate-400 capitalize">
              {cargoExibicao === 'ADMIN' ? 'Administrador' : cargoExibicao === 'TECNICO' ? 'Técnico' : 'Atendente'}
            </span>
          </div>
          <button
            onClick={acaoSair}
            title="Sair do sistema"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
