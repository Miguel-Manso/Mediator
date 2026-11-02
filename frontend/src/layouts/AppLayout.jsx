import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import {
  AnimatedSidebarProvider,
  AnimatedSidebarInset,
  AnimatedSidebarTrigger,
} from '../components/ui/animated-sidebar';
import { PanelLeft } from 'lucide-react';

export const AppLayout = () => {
  return (
    <AnimatedSidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-[#DFE5EB] text-[#14253D] antialiased print:bg-white print:block print:min-h-0 print:h-auto font-sans">
        {/* Animated Sidebar */}
        <Sidebar />

        {/* Painel Principal (Inset) */}
        <AnimatedSidebarInset className="min-h-0 flex-1 flex flex-col h-screen overflow-hidden bg-[#DFE5EB]">
          {/* Header Superior Limpo: apenas o ícone de diminuir/recolher a sidebar, sem z-index conflituoso com modais */}
          <header className="flex h-12 shrink-0 items-center border-b border-[#C8D5E2] bg-[#DFE5EB] px-3 sm:px-4 print:hidden">
            <AnimatedSidebarTrigger className="text-[#437194] hover:bg-[#E8F0F7] hover:text-[#2A4B6E] transition-colors rounded-lg">
              <PanelLeft aria-hidden="true" className="size-4" />
            </AnimatedSidebarTrigger>
          </header>

          {/* Área Principal de Conteúdo (z-10 para que modais internos com fixed cubram a tela inteira, inclusive o topo) */}
          <main className="relative z-10 flex-1 overflow-y-auto bg-[#DFE5EB] p-3 sm:p-5 lg:p-6 print:p-0 print:overflow-visible print:h-auto print:max-h-none print:block">
            <div className="mx-auto max-w-[1600px] w-full print:max-w-none print:w-full print:m-0">
              <Outlet />
            </div>
          </main>
        </AnimatedSidebarInset>
      </div>
    </AnimatedSidebarProvider>
  );
};

export default AppLayout;
