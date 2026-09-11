import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#f4f5f7] text-slate-800">
      <Sidebar />
      <main className="max-h-screen flex-1 overflow-y-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
