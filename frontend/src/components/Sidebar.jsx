import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Laptop,
  Package,
  UserCheck,
  LogOut,
  ClipboardList,
  BarChart3,
  ShieldAlert,
  X,
  Columns3,
  List,
  } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebarRail,
} from './ui/animated-sidebar';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { usuario, user, sair, signOut, ehAdmin, cargo } = useAuth();
  const usuarioAtual = usuario || user;
  const acaoSair = sair || signOut;

  const nomeExibicao = usuarioAtual?.nome || usuarioAtual?.name || 'Administrador Rocha Magazine';
  const cargoExibicao = cargo || usuarioAtual?.cargo || 'ADMIN';
  const cargoFormatado =
    cargoExibicao === 'ADMIN'
      ? 'Administrador'
      : cargoExibicao === 'TECNICO'
      ? 'Técnico Especialista'
      : 'Atendente';

  const iniciaisUsuario = nomeExibicao
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'AR';

  const rotaAtual = location.pathname;
  const currentView = searchParams.get('view') || 'kanban';

  const [secaoAberta, setSecaoAberta] = useState(
    rotaAtual.includes('/ordens-servico') ? 'Ordens de Serviço' : null
  );

  return (
    <AnimatedSidebar
      ariaLabel="Mediator Navegação"
      collapsible="icon"
      className="h-screen max-h-screen overflow-hidden bg-[#0D223A] border-r border-[#1B3654] text-white font-sans shrink-0"
      panelClassName="h-screen max-h-screen flex flex-col justify-between overflow-hidden bg-[#0D223A] border-r border-[#1B3654] text-white"
    >
      {/* Cabeçalho da Sidebar */}
      <AnimatedSidebarHeader className="p-3 pb-2 border-b border-[#1B3654]/80 shrink-0">
        <div className="flex min-h-12 items-center gap-3 overflow-hidden px-1">
          <img
            src="/logo.png"
            alt="Mediator Logo"
            className="h-9 w-9 shrink-0 object-contain drop-shadow-sm"
          />
          <div className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
            <span className="block truncate text-base font-extrabold tracking-tight text-white leading-tight">
              MEDIATOR
            </span>
          </div>
          <AnimatedSidebarClose className="ml-auto text-[#8FAFC7] hover:bg-[#163252] hover:text-white md:hidden">
            <X aria-hidden="true" className="size-4" />
          </AnimatedSidebarClose>
        </div>
      </AnimatedSidebarHeader>

      {/* Conteúdo Principal da Sidebar com rolagem independente */}
      <AnimatedSidebarContent className="flex-1 min-h-0 overflow-y-auto px-2 pt-2 scrollbar-thin">
        {/* Grupo 1: OPERACIONAL (Fonte ampliada e nome renovado) */}
        <AnimatedSidebarGroup className="pt-1">
          <AnimatedSidebarGroupLabel className="text-[#8FAFC7] text-xs font-bold uppercase tracking-wider mb-2.5 px-2">
            OPERACIONAL
          </AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {/* Item: Ordens de Serviço (com Badge 14 e Submenus Kanban e Lista) */}
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  isActive={rotaAtual.includes('/ordens-servico') || rotaAtual === '/'}
                  activePillClassName="bg-[#DE6C20] shadow-sm"
                  className="text-[#9BB4CC] hover:text-white hover:bg-[#163252]"
                  ariaExpanded={secaoAberta === 'Ordens de Serviço'}
                  icon={<ClipboardList className="size-4 shrink-0 text-current" />}
                  onSelect={() => {
                    navigate(`/ordens-servico?view=${currentView}`);
                    setSecaoAberta((prev) =>
                      prev === 'Ordens de Serviço' ? null : 'Ordens de Serviço'
                    );
                  }}
                >
                  Ordens de Serviço
                </AnimatedSidebarMenuButton>

                <AnimatedSidebarMenuSub open={secaoAberta === 'Ordens de Serviço'} className="border-[#1B3654]">
                  <AnimatedSidebarMenuSubItem>
                    <AnimatedSidebarMenuSubButton
                      icon={<Columns3 className="size-3.5 text-current" />}
                      isActive={rotaAtual.includes('/ordens-servico') && currentView === 'kanban'}
                      onSelect={() => navigate('/ordens-servico?view=kanban')}
                    >
                      Quadro Kanban
                    </AnimatedSidebarMenuSubButton>
                  </AnimatedSidebarMenuSubItem>
                  <AnimatedSidebarMenuSubItem>
                    <AnimatedSidebarMenuSubButton
                      icon={<List className="size-3.5 text-current" />}
                      isActive={rotaAtual.includes('/ordens-servico') && currentView === 'tabela'}
                      onSelect={() => navigate('/ordens-servico?view=tabela')}
                    >
                      Lista Tabular
                    </AnimatedSidebarMenuSubButton>
                  </AnimatedSidebarMenuSubItem>
                </AnimatedSidebarMenuSub>
              </AnimatedSidebarMenuItem>

              {/* Item: Clientes */}
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  isActive={rotaAtual.includes('/clientes')}
                  activePillClassName="bg-[#DE6C20] shadow-sm"
                  className="text-[#9BB4CC] hover:text-white hover:bg-[#163252]"
                  icon={<Users className="size-4 shrink-0 text-current" />}
                  onSelect={() => navigate('/clientes')}
                >
                  Clientes
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>

              {/* Item: Equipamentos */}
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  isActive={rotaAtual.includes('/equipamentos')}
                  activePillClassName="bg-[#DE6C20] shadow-sm"
                  className="text-[#9BB4CC] hover:text-white hover:bg-[#163252]"
                  icon={<Laptop className="size-4 shrink-0 text-current" />}
                  onSelect={() => navigate('/equipamentos')}
                >
                  Equipamentos
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>

              {/* Item: Peças & Produtos */}
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  isActive={rotaAtual.includes('/produtos')}
                  activePillClassName="bg-[#DE6C20] shadow-sm"
                  className="text-[#9BB4CC] hover:text-white hover:bg-[#163252]"
                  icon={<Package className="size-4 shrink-0 text-current" />}
                  onSelect={() => navigate('/produtos')}
                >
                  Peças & Produtos
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>

        {/* Grupo 2: GESTÃO & CONTROLE (Nova Label acima de Relatórios & Métricas) */}
        <AnimatedSidebarGroup className="pt-3 border-t border-[#1B3654]/60 mt-2">
          <AnimatedSidebarGroupLabel className="text-[#8FAFC7] text-xs font-bold uppercase tracking-wider mb-2.5 px-2">
            GESTÃO & CONTROLE
          </AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {/* Item: Relatórios & Métricas */}
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  isActive={rotaAtual.includes('/relatorios')}
                  activePillClassName="bg-[#DE6C20] shadow-sm"
                  className="text-[#9BB4CC] hover:text-white hover:bg-[#163252]"
                  icon={<BarChart3 className="size-4 shrink-0 text-current" />}
                  onSelect={() => navigate('/relatorios')}
                >
                  Relatórios & Métricas
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>

              {/* Item: Usuário (Apenas ADMIN) */}
              {ehAdmin && (
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    isActive={rotaAtual.includes('/usuarios')}
                    activePillClassName="bg-[#DE6C20] shadow-sm"
                    className="text-[#9BB4CC] hover:text-white hover:bg-[#163252]"
                    icon={<UserCheck className="size-4 shrink-0 text-current" />}
                    onSelect={() => navigate('/usuarios')}
                  >
                    Usuário
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              )}

              {/* Item: Auditoria de Logs */}
              {ehAdmin && (
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    isActive={rotaAtual.includes('/auditoria')}
                    activePillClassName="bg-[#DE6C20] shadow-sm"
                    className="text-[#9BB4CC] hover:text-white hover:bg-[#163252]"
                    icon={<ShieldAlert className="size-4 shrink-0 text-current" />}
                    onSelect={() => navigate('/auditoria')}
                  >
                    Auditoria de Logs
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              )}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>

      {/* Rodapé Fixo com Card de Perfil Operador (Permanente em todas as telas) */}
      <AnimatedSidebarFooter className="shrink-0 mt-auto border-t border-[#1B3654]/80 p-2.5 bg-[#0D223A] z-10">
        <div className="rounded-xl bg-[#091B30] border border-[#163252] p-2.5 space-y-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1D3B5E] text-xs font-bold text-white shadow-xs">
              {iniciaisUsuario}
            </span>
            <div className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
              <p className="truncate text-xs font-bold text-white leading-tight">
                {nomeExibicao}
              </p>
              <span className="inline-block rounded bg-[#142A42] px-1.5 py-0.5 text-[9px] font-semibold text-[#8FAFC7] uppercase tracking-wider">
                {cargoFormatado}
              </span>
            </div>
            <button
              type="button"
              onClick={acaoSair}
              title="Sair do sistema"
              className="p-1.5 text-[#8FAFC7] hover:text-[#DE6C20] hover:bg-[#163252] rounded-lg transition-colors group-data-[state=collapsed]/sidebar:hidden"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </AnimatedSidebarFooter>

      {/* Trilho de recolhimento no Desktop */}
      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
};

export default Sidebar;
