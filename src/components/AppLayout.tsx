import React, { useState } from 'react';
import Navbar from './Navbar';
import Notification from './Notification';
import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <div className="max-w-[1200px] mx-auto h-full flex flex-col">{children}</div>
        </main>
      </div>

      <Notification />
    </div>
  );
}
