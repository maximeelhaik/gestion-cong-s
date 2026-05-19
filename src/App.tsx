/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { CalendarDays, PenSquare, LayoutDashboard } from 'lucide-react';
import LeaveForm from './components/LeaveForm';
import LeaveDashboard from './components/LeaveDashboard';
import { Formateur, Discipline, Conge } from './types';
import { cn } from './lib/utils';
import { motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('dashboard');
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [conges, setConges] = useState<Conge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch('/api/init');
      if (res.ok) {
        const data = await res.json();
        setFormateurs(data.formateurs);
        setDisciplines(data.disciplines);
        setConges(data.conges);
      }
    } catch(err) {
      console.error("Backend unavailable, app needs the express server running.", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar Area */}
      <aside className="bg-white border-r border-slate-200 w-[240px] flex flex-col p-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3 mb-10 text-indigo-600">
          <CalendarDays className="w-7 h-7" />
          <span className="font-bold text-xl tracking-tight">ACADEMY.26</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('form')}
            className={cn(
              "w-full p-3 flex items-center gap-3 rounded-lg transition-colors text-left",
              activeTab === 'form' 
                ? "bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600 font-medium" 
                : "text-slate-600 hover:bg-slate-100 font-medium"
            )}
          >
            <PenSquare className="w-5 h-5" /> Saisie des Congés
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full p-3 flex items-center gap-3 rounded-lg transition-colors text-left",
              activeTab === 'dashboard' 
                ? "bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600 font-medium" 
                : "text-slate-600 hover:bg-slate-100 font-medium"
            )}
          >
            <LayoutDashboard className="w-5 h-5" /> Monitoring
          </button>
        </nav>
        
        <div className="mt-auto p-4 bg-indigo-50 rounded-xl">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Planification</div>
          <div className="text-sm font-bold text-indigo-900 truncate">Saison 2026</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0 z-10">
          <h1 className="text-lg font-semibold text-slate-800">
            {activeTab === 'dashboard' ? 'Tableau de Bord des Formateurs' : 'Saisie des Indisponibilités'}
          </h1>
          <div className="flex items-center gap-4 text-sm z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <span>Live Data</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xs">JS</div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            Chargement... (Le backend Express démarre)
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col overflow-hidden"
              >
                <div className="flex-1 flex flex-col overflow-hidden">
                   <LeaveDashboard formateurs={formateurs} disciplines={disciplines} conges={conges} />
                </div>
              </motion.div>
            )}
            {activeTab === 'form' && (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 overflow-y-auto w-full p-8"
              >
                <LeaveForm formateurs={formateurs} disciplines={disciplines} onRefreshData={loadData} />
              </motion.div>
            )}
          </>
        )}
        </div>
      </main>
    </div>
  );
}

