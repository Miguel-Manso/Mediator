import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Menu, Wrench } from 'lucide-react';

export const AppLayout = () => {
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f4f5f7] text-slate-800 antialiased print:bg-white print:block print:min-h-0 print:h-auto">
      {/* Sidebar Desktop e Drawer Mobile */}
      <Sidebar aberta={sidebarAberta} aoFechar={() => setSidebarAberta(false)} />

      {/* Área Principal de Conteúdo */}
      <div className="flex flex-1 flex-col min-w-0 max-h-screen overflow-hidden print:max-h-none print:overflow-visible print:h-auto print:block">
        {/* Barra Superior Mobile (Exibida apenas em telas < md) */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden flex-shrink-0 z-30 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <Wrench className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Mediator</span>
          </div>

          <button
            type="button"
            onClick={() => setSidebarAberta(true)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Conteúdo Dinâmico Rolável (No modo de impressão, expande sem limites de altura ou scroll para paginar folhas) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible print:h-auto print:max-h-none print:block">
          <div className="mx-auto max-w-7xl w-full print:max-w-none print:w-full print:m-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
