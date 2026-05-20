import { useState } from "react";
import { Formateur, Discipline, Conge } from "../types";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, parseISO, startOfWeek, endOfWeek, isWithinInterval, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, AlertTriangle, X, Users, FolderHeart, CalendarCheck, ShieldAlert, PenSquare, Trash2 } from "lucide-react";
import { cn, getSafeThemeColor } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface LeaveDashboardProps {
  formateurs: Formateur[];
  disciplines: Discipline[];
  conges: Conge[];
  isDark?: boolean;
  onRefreshData?: () => void;
}

export default function LeaveDashboard({ formateurs, disciplines, conges, isDark = false, onRefreshData }: LeaveDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date()); // Default to current month
  const [filterDisciplineId, setFilterDisciplineId] = useState<string>("all");
  const [filterFormateurId, setFilterFormateurId] = useState<string>("all");
  const [selectedConge, setSelectedConge] = useState<Conge | null>(null);

  // Edit & Delete States
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Form Fields
  const [editFormateurId, setEditFormateurId] = useState("");
  const [editDisciplineId, setEditDisciplineId] = useState("");
  const [editDateDebut, setEditDateDebut] = useState("");
  const [editDateFin, setEditDateFin] = useState("");
  const [editCommentaire, setEditCommentaire] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const closeModal = () => {
    setSelectedConge(null);
    setIsEditing(false);
    setIsConfirmingDelete(false);
    setEditError(null);
  };

  const startEditing = (conge: Conge) => {
    setEditFormateurId(conge.formateurId);
    setEditDisciplineId(conge.disciplineId);
    setEditDateDebut(conge.dateDebut);
    setEditDateFin(conge.dateFin);
    setEditCommentaire(conge.commentaire || "");
    setEditError(null);
    setIsEditing(true);
  };

  const handleDelete = async (congeId: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/conges/${congeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        if (onRefreshData) onRefreshData();
        closeModal();
      } else {
        setEditError(data.error || "Une erreur est survenue lors de la suppression.");
      }
    } catch (err) {
      console.error("[LeaveDashboard] Error deleting leave:", err);
      setEditError("Erreur de connexion au serveur d'API.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (congeId: string) => {
    if (isSaving) return;
    setEditError(null);

    // Validation
    if (!editFormateurId || !editDisciplineId || !editDateDebut || !editDateFin) {
      setEditError("Tous les champs (formateur, discipline, date début et date fin) sont obligatoires.");
      return;
    }
    if (editDateDebut > editDateFin) {
      setEditError("La date de début doit être antérieure ou égale à la date de fin.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/conges/${congeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formateurId: editFormateurId,
          disciplineId: editDisciplineId,
          dateDebut: editDateDebut,
          dateFin: editDateFin,
          commentaire: editCommentaire,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (onRefreshData) onRefreshData();
        setIsEditing(false);
        if (data.conge) {
          setSelectedConge(data.conge);
        } else {
          closeModal();
        }
      } else {
        setEditError(data.error || "Une erreur est survenue lors de la modification.");
      }
    } catch (err) {
      console.error("[LeaveDashboard] Error updating leave:", err);
      setEditError("Erreur de connexion au serveur d'API.");
    } finally {
      setIsSaving(false);
    }
  };

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

  // KPIs Calculations
  const activeFormateursCount = formateurs.length;
  const disciplinesCount = disciplines.length;
  const activeCongesCount = conges.length;
  const conflictsCount = conges.filter(c => c.aConflit).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#090d16] p-8 overflow-y-auto no-scrollbar transition-colors duration-500">
      
      {/* 1. Dashboard Title & Intro */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">MONITORING DES EQUIPES</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Superviser la planification et détecter instantanément les conflits d'indisponibilité.</p>
        </div>
      </div>

      {/* 2. Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* KPI: Formateurs */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Formateurs Actifs</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{activeFormateursCount}</div>
          </div>
        </div>

        {/* KPI: Disciplines */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Secteurs & Disciplines</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{disciplinesCount}</div>
          </div>
        </div>

        {/* KPI: Indisponibilités */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50 dark:border-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Absences Planifiées</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{activeCongesCount}</div>
          </div>
        </div>

        {/* KPI: Conflits (Dynamic warning alert card) */}
        <div className={cn(
          "backdrop-blur-md rounded-2xl p-5 border shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:scale-[1.01] transition-all duration-300 flex items-center gap-4 relative overflow-hidden group",
          conflictsCount > 0 
            ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30 text-red-900 dark:text-red-100" 
            : "bg-white dark:bg-slate-900/50 border-slate-200/50 dark:border-white/[0.04]"
        )}>
          {conflictsCount > 0 && (
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-red-500/10 rounded-full blur-xl animate-pulse"></div>
          )}
          <div className={cn(
            "p-3.5 rounded-xl transition-all",
            conflictsCount > 0 
              ? "bg-red-500/10 dark:bg-red-500/20 text-red-550 dark:text-red-400 animate-pulse" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Conflits Détectés</div>
            <div className={cn(
              "text-2xl font-black mt-0.5",
              conflictsCount > 0 ? "text-red-600 dark:text-red-400 font-black" : "text-slate-800 dark:text-slate-100"
            )}>
              {conflictsCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Controls / Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/[0.03] p-5 rounded-2xl shadow-sm mb-6 transition-all duration-500">
        
        {/* Month Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider">Mois Visé</label>
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/[0.04] p-1.5 rounded-xl transition-all duration-300">
            <button id="prev-month-btn" onClick={prevMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg transition-colors text-slate-650 dark:text-slate-400 cursor-pointer">
              <ChevronLeft className="w-4 h-4"/>
            </button>
            <div className="flex-1 text-center text-sm font-bold capitalize text-slate-800 dark:text-slate-200 select-none">
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </div>
            <button id="next-month-btn" onClick={nextMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg transition-colors text-slate-650 dark:text-slate-400 cursor-pointer">
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Filter Discipline */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider">Filtrer par Discipline</label>
          <div className="relative">
            <select 
              value={filterDisciplineId} 
              onChange={e => setFilterDisciplineId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-205 border border-slate-200/60 dark:border-white/[0.04] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer p-2.5 rounded-xl appearance-none transition-all duration-300"
            >
              <option value="all">Toutes les Disciplines</option>
              {disciplines.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </div>
        </div>

        {/* Filter Formateur */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider">Filtrer par Formateur</label>
          <div className="relative">
            <select 
              value={filterFormateurId} 
              onChange={e => setFilterFormateurId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-205 border border-slate-200/60 dark:border-white/[0.04] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer p-2.5 rounded-xl appearance-none transition-all duration-300"
            >
              <option value="all">Tous les Formateurs</option>
              {formateurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Calendar Container */}
      <div className="bg-white dark:bg-slate-900/20 border border-slate-255/15 dark:border-white/[0.03] rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all duration-500">
        
        {/* Days Header */}
        <div className="grid grid-cols-7 text-center shrink-0 border-b border-slate-100 dark:border-white/[0.03]">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
            <div key={day} className="bg-slate-50/70 dark:bg-slate-950/20 py-4 text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 text-center">
          {calendarDays.map((date, i) => {
            const isCurrentMonth = isSameMonth(date, monthStart);
            const dayConges = getCongesForDay(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div 
                key={date.toISOString()} 
                className={cn(
                  "border-b border-r border-slate-100 dark:border-white/[0.02] p-3 relative text-left min-h-[110px] flex flex-col justify-between group/cell transition-all duration-300",
                  !isCurrentMonth ? "opacity-25" : "",
                  isWeekend 
                    ? "bg-slate-50/30 dark:bg-white/[0.005]" 
                    : "bg-white dark:bg-slate-900/10 hover:bg-slate-50/20 dark:hover:bg-white/[0.015]"
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-xs font-black select-none tracking-tight transition-all duration-200",
                    isCurrentMonth ? "text-slate-700 dark:text-slate-400 group-hover/cell:text-indigo-600 dark:group-hover/cell:text-indigo-400" : "text-slate-350 dark:text-slate-600"
                  )}>
                    {format(date, "d")}
                  </span>
                  
                  {isCurrentMonth && dayConges.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40"></span>
                  )}
                </div>

                {/* Badge Container */}
                <div className="flex-1 flex flex-col gap-1.5 w-full mt-1 max-h-[85px] overflow-y-auto no-scrollbar relative z-10">
                  {dayConges.map(conge => {
                    const discipline = getDiscipline(conge.disciplineId);
                    const safeStyles = getSafeThemeColor(discipline?.colorHex || "#3b82f6", isDark);
                    
                    return (
                      <div
                        key={conge.id}
                        onClick={() => setSelectedConge(conge)}
                        className={cn(
                          "text-[9px] p-1.5 rounded-lg font-extrabold cursor-pointer relative truncate shadow-2xs hover:scale-[1.02] hover:-translate-y-0.5 border transition-all duration-350",
                          conge.aConflit 
                            ? "conflict-pulse bg-red-50/90 dark:bg-red-950/20 border-red-300 dark:border-red-900/40 text-red-750 dark:text-red-350 z-20 flex items-center gap-1 shadow-md shadow-red-500/5" 
                            : ""
                        )}
                        style={!conge.aConflit ? { 
                          backgroundColor: safeStyles.bg, 
                          borderColor: safeStyles.border, 
                          color: safeStyles.text, 
                          borderWidth: '1px' 
                        } : {}}
                      >
                         {conge.aConflit && <AlertTriangle className="w-3 h-3 text-red-650 dark:text-red-400 inline-block shrink-0 animate-bounce" />}
                         <span className="opacity-90">{getFormateurName(conge.formateurId)}</span>
                         <span className="mx-1 opacity-50">•</span>
                         <span className="font-semibold">{discipline?.nom}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Detail Modal */}
      <AnimatePresence>
        {selectedConge && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200/40 dark:border-white/[0.05]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Banner */}
              <div className={cn(
                "px-6 py-6 border-b relative overflow-hidden",
                selectedConge.aConflit 
                  ? "bg-gradient-to-br from-red-500/10 to-red-600/2 dark:from-red-950/20 dark:to-red-950/2 border-red-100 dark:border-red-900/30" 
                  : "bg-gradient-to-br from-indigo-500/10 to-indigo-600/2 dark:from-slate-950/50 dark:to-slate-950/50 border-slate-100 dark:border-white/[0.03]"
              )}>
                <button 
                  onClick={closeModal} 
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    selectedConge.aConflit 
                      ? "bg-red-500/10 text-red-500 animate-pulse" 
                      : "bg-indigo-500/10 text-indigo-500"
                  )}>
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
                      {isEditing ? "MODIFIER LE CONGÉ" : "DÉTAILS DU CONGÉ"}
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-550 tracking-wider mt-0.5">
                      {isEditing ? "Edition d'indisponibilité" : "Fiche d'indisponibilité"}
                    </p>
                  </div>
                </div>
              </div>

              {isEditing ? (
                /* Edit Modal Contents */
                <div className="p-6 space-y-5">
                  {editError && (
                    <div className="p-3.5 rounded-xl bg-red-50/80 dark:bg-red-950/15 text-red-800 dark:text-red-300 border border-red-200/50 dark:border-red-900/30 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  {/* Formateur Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Formateur affecté</label>
                    <select 
                      value={editFormateurId}
                      onChange={e => setEditFormateurId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/[0.04] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer p-2.5 rounded-xl appearance-none transition-all duration-300"
                    >
                      {formateurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                  </div>

                  {/* Discipline Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Discipline</label>
                    <select 
                      value={editDisciplineId}
                      onChange={e => setEditDisciplineId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/[0.04] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer p-2.5 rounded-xl appearance-none transition-all duration-300"
                    >
                      {disciplines.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                    </select>
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Date Début</label>
                      <input 
                        type="date"
                        value={editDateDebut}
                        onChange={e => setEditDateDebut(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/[0.04] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer p-2.5 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Date Fin</label>
                      <input 
                        type="date"
                        value={editDateFin}
                        onChange={e => setEditDateFin(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/[0.04] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer p-2.5 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Commentaire */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Commentaire</label>
                    <textarea 
                      rows={3}
                      placeholder="Raison de l'indisponibilité..."
                      value={editCommentaire}
                      onChange={e => setEditCommentaire(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/[0.04] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 p-3 rounded-xl transition-all duration-300 resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* Regular View Modal Contents */
                <div className="p-6 space-y-6">
                  {editError && (
                    <div className="p-3.5 rounded-xl bg-red-50/80 dark:bg-red-950/15 text-red-800 dark:text-red-355 border border-red-200/50 dark:border-red-900/30 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  {/* Confirm Delete Alert Panel */}
                  {isConfirmingDelete && (
                    <div className="bg-red-50/80 dark:bg-red-950/15 border border-red-200/50 dark:border-red-900/30 rounded-2xl p-4 text-xs space-y-3">
                      <div className="font-extrabold text-red-800 dark:text-red-300 flex items-center gap-2 uppercase tracking-wide">
                        <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 animate-bounce" />
                        Attention : Action irréversible
                      </div>
                      <p className="text-red-700/85 dark:text-red-400/85 font-semibold leading-relaxed">
                        Êtes-vous sûr de vouloir supprimer définitivement cette indisponibilité ?
                        Cette action prendra effet immédiatement sur le calendrier.
                      </p>
                      <div className="flex justify-end gap-2.5 pt-1">
                        <button 
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          disabled={isDeleting}
                          className="px-3.5 py-2 rounded-xl font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 cursor-pointer disabled:opacity-50 text-[10px] transition-colors duration-250"
                        >
                          Annuler
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(selectedConge.id)}
                          disabled={isDeleting}
                          className="px-4 py-2 rounded-xl font-black bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-[10px] transition-all duration-250"
                        >
                          {isDeleting ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              Suppression...
                            </>
                          ) : (
                            "Confirmer la suppression"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Formateur */}
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1.5">Formateur affecté</div>
                    <div className="font-extrabold text-base text-slate-855 dark:text-slate-150 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      {getFormateurName(selectedConge.formateurId)}
                    </div>
                  </div>

                  {/* Discipline & Statut */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1.5">Discipline</div>
                      <div 
                        className="inline-block px-3 py-1.5 rounded-xl text-xs font-bold border"
                        style={(() => {
                          const disc = getDiscipline(selectedConge.disciplineId);
                          const safe = getSafeThemeColor(disc?.colorHex || "#3b82f6", isDark);
                          return { backgroundColor: safe.bg, borderColor: safe.border, color: safe.text };
                        })()}
                      >
                        {getDiscipline(selectedConge.disciplineId)?.nom}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1.5">Statut de Planification</div>
                      {selectedConge.aConflit ? (
                        <span className="text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                          Conflit Détecté
                        </span>
                      ) : (
                        <span className="text-xs font-extrabold text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Planifié & Sûr
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Period */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-100 dark:border-white/[0.02]">
                    <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-2">Période d'absence</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex justify-between items-center">
                      <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200/50 dark:border-white/[0.02]">{format(parseISO(selectedConge.dateDebut), "dd MMMM yyyy", { locale: fr })}</span>
                      <span className="text-slate-400 dark:text-slate-600 mx-2 text-xs font-light">jusqu'au</span>
                      <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200/50 dark:border-white/[0.02]">{format(parseISO(selectedConge.dateFin), "dd MMMM yyyy", { locale: fr })}</span>
                    </div>
                  </div>

                  {/* Comments */}
                  {selectedConge.commentaire ? (
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1.5">Commentaire de saisie</div>
                      <p className="text-xs text-slate-650 dark:text-slate-350 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-white/[0.01] p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed">
                        "{selectedConge.commentaire}"
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1.5">Commentaire de saisie</div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3.5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.02]">
                        Aucun commentaire fourni pour ce congé.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer (Switches dynamically based on isEditing) */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/20 border-t border-slate-100 dark:border-white/[0.03] flex justify-between items-center gap-3">
                {isEditing ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Annuler
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSave(selectedConge.id)}
                      disabled={isSaving}
                      className="bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl transition-all duration-300 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Enregistrement...
                        </>
                      ) : (
                        "Enregistrer"
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {isConfirmingDelete ? (
                      <span className="text-[10px] uppercase font-bold text-red-500 animate-pulse tracking-widest pl-2">Suppression en cours...</span>
                    ) : (
                      <>
                        <button 
                          type="button"
                          onClick={() => setIsConfirmingDelete(true)}
                          className="bg-red-50 dark:bg-red-950/15 border border-red-200/50 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/25 hover:border-red-300 dark:hover:border-red-900/50 p-2.5 rounded-xl transition-all duration-300 cursor-pointer shadow-xs flex items-center gap-2"
                          title="Supprimer cette absence"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-bold hidden sm:inline">Supprimer</span>
                        </button>
                        
                        <div className="flex gap-2 ml-auto">
                          <button 
                            type="button"
                            onClick={() => startEditing(selectedConge)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-650 dark:text-indigo-400 border border-slate-250/20 dark:border-white/[0.04] text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-2"
                          >
                            <PenSquare className="w-4 h-4 shrink-0" />
                            <span>Modifier</span>
                          </button>
                          <button 
                            type="button"
                            onClick={closeModal}
                            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-extrabold px-6 py-2.5 rounded-xl transition-all duration-300 cursor-pointer shadow-xs"
                          >
                            Fermer
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
