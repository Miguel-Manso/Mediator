import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  Laptop,
  Package,
  UserCheck,
  Wrench,
  LogOut,
  ClipboardList,
  Sliders,
  X,
<<<<<<< HEAD
  BarChart3,
  ShieldAlert,
=======
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const itensMenu = [
  { nome: 'Ordens de Serviço', caminho: '/ordens-servico', icone: ClipboardList },
  { nome: 'Clientes', caminho: '/clientes', icone: Users },
  { nome: 'Equipamentos', caminho: '/equipamentos', icone: Laptop },
  { nome: 'Produtos', caminho: '/produtos', icone: Package },
<<<<<<< HEAD
  { nome: 'Relatórios', caminho: '/relatorios', icone: BarChart3 },
  { nome: 'Usuários', caminho: '/usuarios', icone: UserCheck, requerAdmin: true },
  { nome: 'Auditoria', caminho: '/auditoria', icone: ShieldAlert, requerAdmin: true },
=======
  { nome: 'Usuários', caminho: '/usuarios', icone: UserCheck, requerAdmin: true },
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
];

export const Sidebar = ({ aberta, aoFechar }) => {
  const { usuario, user, sair, signOut, ehAdmin, cargo } = useAuth();
  const usuarioAtual = usuario || user;
  const acaoSair = sair || signOut;

  const nomeExibicao = usuarioAtual?.nome || usuarioAtual?.name || 'Usuário';
  const cargoExibicao = cargo || 'ATENDENTE';

  // Ocultar menus exclusivos (Status da OS e Usuários apenas para ADMIN)
  const itensVisiveis = itensMenu.filter((item) => !item.requerAdmin || ehAdmin);

  return (
    <>
      {/* Backdrop para mobile */}
      {aberta && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={aoFechar}
          aria-hidden="true"
        />
      )}

      {/* Menu Lateral (Drawer no Mobile / Fixo no Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 transition-transform duration-200 ease-in-out md:static md:h-screen md:w-60 md:flex-shrink-0 md:translate-x-0 ${
          aberta ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Cabeçalho da Sidebar */}
          <div className="mb-6 flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight text-slate-900">Mediator</h2>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Assistência Técnica
                </span>
              </div>
            </div>

            {/* Botão fechar apenas no mobile */}
            <button
              onClick={aoFechar}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links de Navegação */}
          <nav className="space-y-1">
            {itensVisiveis.map((item) => {
              const Icone = item.icone;
              return (
                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  onClick={() => {
                    if (aoFechar) aoFechar();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-900 font-semibold text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  <span>{item.nome}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Rodapé do Usuário Logado */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between px-2">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-slate-900 truncate">{nomeExibicao}</p>
              <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                {cargoExibicao === 'ADMIN'
                  ? 'Administrador'
                  : cargoExibicao === 'TECNICO'
                  ? 'Técnico'
                  : 'Atendente'}
              </span>
            </div>
            <button
              onClick={acaoSair}
              title="Sair do sistema"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
