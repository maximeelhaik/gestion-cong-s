import { useState } from "react";
import { Formateur, Discipline, Conge } from "../types";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, parseISO, startOfWeek, endOfWeek, isWithinInterval, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, AlertTriangle, X } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface LeaveDashboardProps {
  formateurs: Formateur[];
  disciplines: Discipline[];
  conges: Conge[];
}

export default function LeaveDashboard({ formateurs, disciplines, conges }: LeaveDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Start at Jan 2026
  const [filterDisciplineId, setFilterDisciplineId] = useState<string>("all");
  const [filterFormateurId, setFilterFormateurId] = useState<string>("all");
  const [selectedConge, setSelectedConge] = useState<Conge | null>(null);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getFormateurName = (id: string) => formateurs.find(f => f.id === id)?.nom || 'Inconnu';
  const getDiscipline = (id: string) => disciplines.find(d => d.id === id);

  // Filter conges
  const filteredConges = conges.filter(c => {
    if (filterDisciplineId !== "all" && c.disciplineId !== filterDisciplineId) return false;
    if (filterFormateurId !== "all" && c.formateurId !== filterFormateurId) return false;
    return true;
  });

  const getCongesForDay = (date: Date) => {
    return filteredConges.filter(c => {
      const start = parseISO(c.dateDebut);
      const end = parseISO(c.dateFin);
      // set hours to 0 to properly compare dates without time zone issues
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      
      return isWithinInterval(date, { start, end });
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Top Controls */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 mx-8 mt-8 mb-6 z-10">
        
        <div className="flex-1 space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-400">Mois (Année 2026)</label>
          <div className="flex items-center bg-slate-50 rounded">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-200 rounded transition"><ChevronLeft className="w-4 h-4"/></button>
            <div className="flex-1 text-center text-sm font-medium capitalize text-slate-800">
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </div>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded transition"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>

        <div className="w-px h-10 bg-slate-200"></div>

        <div className="flex-1 space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-400">Discipline</label>
          <select 
            value={filterDisciplineId} 
            onChange={e => setFilterDisciplineId(e.target.value)}
            className="w-full bg-slate-50 border-none text-sm font-medium focus:ring-0 cursor-pointer p-1 rounded outline-none"
          >
            <option value="all">Toutes les Disciplines</option>
            {disciplines.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
          </select>
        </div>

        <div className="w-px h-10 bg-slate-200"></div>

        <div className="flex-1 space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-400">Formateur</label>
          <select 
            value={filterFormateurId} 
            onChange={e => setFilterFormateurId(e.target.value)}
            className="w-full bg-slate-50 border-none text-sm font-medium focus:ring-0 cursor-pointer p-1 rounded outline-none"
          >
            <option value="all">Tous les Formateurs</option>
            {formateurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mx-8 mb-8">
        
        {/* Days Header */}
        <div className="grid grid-cols-7 text-center shrink-0">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
            <div key={day} className="bg-slate-50 py-3 border-b border-r border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto text-center">
          {calendarDays.map((date, i) => {
            const isCurrentMonth = isSameMonth(date, monthStart);
            const dayConges = getCongesForDay(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div 
                key={date.toISOString()} 
                className={cn(
                  "border-b border-r border-slate-100 p-2 relative text-left min-h-[100px]",
                  !isCurrentMonth ? "opacity-30" : "",
                  isWeekend ? "bg-slate-50/50" : ""
                )}
              >
                <div className="text-xs font-semibold mb-1">{format(date, "d")}</div>

                <div className="flex flex-col gap-1 w-full absolute left-0 right-0 top-6 px-1 z-10 max-h-[calc(100%-24px)] overflow-y-auto no-scrollbar">
                  {dayConges.map(conge => {
                    const discipline = getDiscipline(conge.disciplineId);
                    const color = discipline?.colorHex || "#3b82f6";
                    
                    return (
                      <div
                        key={conge.id}
                        onClick={() => setSelectedConge(conge)}
                        className={cn(
                          "text-[9px] p-1 rounded font-bold cursor-pointer relative truncate",
                          conge.aConflit ? "conflict-pulse bg-red-50 text-red-700 z-20 flex items-center gap-1" : ""
                        )}
                        style={!conge.aConflit ? { backgroundColor: `${color}20`, borderColor: `${color}40`, color: color, border: '1px solid' } : {}}
                      >
                         {conge.aConflit && <AlertTriangle className="w-3 h-3 inline-block shrink-0" />}
                         {getFormateurName(conge.formateurId)} - {discipline?.nom}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedConge && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedConge(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              <div className={cn(
                "px-6 py-5 border-b relative",
                selectedConge.aConflit ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
              )}>
                <button onClick={() => setSelectedConge(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  {selectedConge.aConflit && <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />}
                  <h3 className="text-xl font-semibold text-slate-900">Détails du congé</h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Formateur</div>
                  <div className="font-medium text-lg text-slate-800">{getFormateurName(selectedConge.formateurId)}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Discipline</div>
                    <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-sm font-medium border border-slate-200">
                      {getDiscipline(selectedConge.disciplineId)?.nom}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Statut</div>
                    {selectedConge.aConflit ? (
                      <span className="text-sm font-bold text-red-600">Conflit détecté</span>
                    ) : (
                      <span className="text-sm font-bold text-green-600">Planifié</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Période</div>
                  <div className="font-medium text-slate-800 flex justify-between items-center">
                    <span>{format(parseISO(selectedConge.dateDebut), "dd MMMM yyyy", { locale: fr })}</span>
                    <span className="text-slate-400 mx-2">-&gt;</span>
                    <span>{format(parseISO(selectedConge.dateFin), "dd MMMM yyyy", { locale: fr })}</span>
                  </div>
                </div>

                {selectedConge.commentaire && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Commentaire</div>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">
                      {selectedConge.commentaire}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
