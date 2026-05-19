import { useState, useEffect } from 'react';
import { CalendarDays, PenSquare, LayoutDashboard, Sun, Moon, Monitor, Activity } from 'lucide-react';
import LeaveForm from './components/LeaveForm';
import LeaveDashboard from './components/LeaveDashboard';
import { Formateur, Discipline, Conge } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Theme = 'light' | 'dark' | 'system';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('dashboard');
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [conges, setConges] = useState<Conge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

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

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: Theme) => {
      root.classList.remove('light', 'dark');
      
      let active: 'light' | 'dark' = 'light';
      if (t === 'system') {
        active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        active = t;
      }
      root.classList.add(active);
      setResolvedTheme(active);
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-500">
      
      {/* Sidebar Area */}
      <aside className="bg-white dark:bg-slate-950/60 backdrop-blur-xl border-r border-slate-200/50 dark:border-white/[0.04] w-[260px] flex flex-col p-6 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.015)] z-20 transition-all duration-500">
        
        {/* Glowing Logo */}
        <div className="flex items-center gap-3 mb-10 group cursor-pointer">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all duration-300">
            <CalendarDays className="w-5.5 h-5.5 text-white" />
            <span className="absolute inset-0 rounded-xl bg-indigo-500/30 blur-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </div>
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent group-hover:opacity-90 transition-all">
            ACADEMY
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full p-3 flex items-center gap-3 rounded-xl transition-all duration-300 text-left relative overflow-hidden group cursor-pointer",
              activeTab === 'dashboard' 
                ? "bg-gradient-to-r from-indigo-50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/5 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-150/40 dark:border-indigo-900/30 shadow-xs" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.02] font-semibold"
            )}
          >
            {activeTab === 'dashboard' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <LayoutDashboard className="w-5 h-5 shrink-0" /> 
            <span className="text-sm">Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab('form')}
            className={cn(
              "w-full p-3 flex items-center gap-3 rounded-xl transition-all duration-300 text-left relative overflow-hidden group cursor-pointer",
              activeTab === 'form' 
                ? "bg-gradient-to-r from-indigo-50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/5 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-150/40 dark:border-indigo-900/30 shadow-xs" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.02] font-semibold"
            )}
          >
            {activeTab === 'form' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <PenSquare className="w-5 h-5 shrink-0" /> 
            <span className="text-sm">Saisie des Congés</span>
          </button>
        </nav>
        
        {/* Glassmorphic Info Box */}
        <div className="mt-auto relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-indigo-500/8 to-purple-500/4 dark:from-indigo-500/5 dark:to-purple-500/2 border border-indigo-500/10 dark:border-indigo-500/5 shadow-inner">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-indigo-500/10 blur-xl"></div>
          <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Planification</div>
          <div className="text-sm font-bold text-slate-800 dark:text-indigo-200 truncate">Saison 2026</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Données synchronisées</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="h-18 bg-white/70 dark:bg-slate-950/40 backdrop-blur-xl border-b border-slate-250/20 dark:border-white/[0.03] px-8 flex items-center justify-between shadow-sm shrink-0 z-10 transition-colors duration-500">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase text-[13px] tracking-wider text-slate-400 dark:text-slate-500">
              {activeTab === 'dashboard' ? 'Tableau de Bord des Formateurs' : 'Saisie des Indisponibilités'}
            </h1>
          </div>

          <div className="flex items-center gap-5 text-sm">
            {/* Dynamic Live Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/6 dark:bg-emerald-500/4 border border-emerald-500/20 dark:border-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400 font-semibold text-xs transition-all duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Données Live</span>
            </div>

            {/* Theme Selector (Premium rounded capsule) */}
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shadow-inner transition-colors duration-300">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                  theme === 'light' 
                    ? "bg-white text-amber-500 shadow-xs scale-105" 
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
                title="Thème Clair"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                  theme === 'dark' 
                    ? "bg-white dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 shadow-xs scale-105" 
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
                title="Thème Sombre"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                  theme === 'system' 
                    ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs scale-105" 
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
                title="Thème Système"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>

            {/* Profile Logo */}
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/20 flex items-center justify-center text-white font-extrabold text-xs shadow-md transition-all hover:rotate-6 duration-300 cursor-pointer">
              ME
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <Activity className="w-8 h-8 text-indigo-500 animate-pulse mb-3" />
              <div className="text-sm font-semibold tracking-wide dark:text-slate-300">Chargement de la base Academy.26...</div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' ? (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col overflow-hidden"
                >
                  <LeaveDashboard formateurs={formateurs} disciplines={disciplines} conges={conges} isDark={isDark} />
                </motion.div>
              ) : (
                <motion.div 
                  key="form"
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 overflow-y-auto w-full"
                >
                  <LeaveForm formateurs={formateurs} disciplines={disciplines} onRefreshData={loadData} isDark={isDark} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
