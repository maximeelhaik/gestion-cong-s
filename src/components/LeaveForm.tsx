import { Formateur, Discipline, DateRange } from "../types";
import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, User, Search, Tag, X, Sparkles, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn, getSafeThemeColor } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface LeaveFormProps {
  formateurs: Formateur[];
  disciplines: Discipline[];
  onRefreshData: () => void;
  isDark?: boolean;
}

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
];

export default function LeaveForm({ formateurs, disciplines, onRefreshData, isDark = false }: LeaveFormProps) {
  const [selectedFormateurId, setSelectedFormateurId] = useState<string>("");
  const [isAddingFormateur, setIsAddingFormateur] = useState(false);
  const [newFormateurName, setNewFormateurName] = useState("");
  const [newFormateurDisciplines, setNewFormateurDisciplines] = useState<string[]>([]);
  
  const [isConfirmingDeleteFormateur, setIsConfirmingDeleteFormateur] = useState(false);
  const [isDeletingFormateur, setIsDeletingFormateur] = useState(false);

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
  const [isAddingDiscipline, setIsAddingDiscipline] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState("");
  const [newDisciplineColor, setNewDisciplineColor] = useState(PRESET_COLORS[0]);
  const [isConfirmingDeleteDiscipline, setIsConfirmingDeleteDiscipline] = useState(false);
  const [isDeletingDiscipline, setIsDeletingDiscipline] = useState(false);

  const [periods, setPeriods] = useState<DateRange[]>([{ start: "", end: "" }]);
  const [commentaire, setCommentaire] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: "success" | "error" | "warning", text: string} | null>(null);
  const [successNotification, setSuccessNotification] = useState<{message: string; type: "success" | "error"} | null>(null);

  // Automatically select the formateur's default discipline when a formateur is selected
  useEffect(() => {
    if (selectedFormateurId) {
      const formateur = formateurs.find(f => f.id === selectedFormateurId);
      if (formateur && formateur.disciplines && formateur.disciplines.length > 0) {
        setSelectedDisciplineId(formateur.disciplines[0]);
      }
    }
  }, [selectedFormateurId, formateurs]);

  const resetForm = () => {
    setSelectedFormateurId("");
    setSelectedDisciplineId("");
    setPeriods([{ start: "", end: "" }]);
    setCommentaire("");
  };

  const handleCreateFormateur = async () => {
    if (!newFormateurName.trim()) return;
    try {
      const res = await fetch("/api/formateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newFormateurName.trim(), disciplines: newFormateurDisciplines }),
      });
      if (res.ok) {
        const data = await res.json();
        onRefreshData();
        setIsAddingFormateur(false);
        setNewFormateurName("");
        setNewFormateurDisciplines([]);
        setSelectedFormateurId(data.id);
        
        setSuccessNotification({
          message: `Le formateur "${data.nom}" a été créé avec succès !`,
          type: "success"
        });
        setTimeout(() => setSuccessNotification(null), 6000);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("[LeaveForm] Error creating formateur:", data.error || res.statusText);
        setSuccessNotification({
          message: data.error || "Une erreur est survenue lors de la création du formateur.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("[LeaveForm] Network error creating formateur:", err);
      setSuccessNotification({
        message: "Erreur de connexion au serveur d'API.",
        type: "error"
      });
    }
  };

  const handleDeleteFormateur = async () => {
    if (!selectedFormateurId || isDeletingFormateur) return;
    setIsDeletingFormateur(true);
    try {
      const selectedName = formateurs.find(f => f.id === selectedFormateurId)?.nom || "le formateur";
      const res = await fetch(`/api/formateurs/${selectedFormateurId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        onRefreshData();
        setSelectedFormateurId("");
        setIsConfirmingDeleteFormateur(false);
        setSuccessNotification({
          message: data.message || `Le formateur "${selectedName}" et ses congés associés ont été supprimés avec succès !`,
          type: "success"
        });
        setTimeout(() => setSuccessNotification(null), 6000);
      } else {
        console.error("[LeaveForm] Error deleting formateur:", data.error || res.statusText);
        setSuccessNotification({
          message: data.error || "Une erreur est survenue lors de la suppression.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("[LeaveForm] Network error deleting formateur:", err);
      setSuccessNotification({
        message: "Erreur de connexion au serveur d'API.",
        type: "error"
      });
    } finally {
      setIsDeletingFormateur(false);
    }
  };

  const handleCreateDiscipline = async () => {
    if (!newDisciplineName.trim()) return;
    try {
      const res = await fetch("/api/disciplines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newDisciplineName.trim(), colorHex: newDisciplineColor }),
      });
      if (res.ok) {
        const data = await res.json();
        onRefreshData();
        setIsAddingDiscipline(false);
        setNewDisciplineName("");
        setNewDisciplineColor(PRESET_COLORS[0]);
        setSelectedDisciplineId(data.id);
        
        setSuccessNotification({
          message: `La discipline "${data.nom}" a été créée avec succès !`,
          type: "success"
        });
        setTimeout(() => setSuccessNotification(null), 6000);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("[LeaveForm] Error creating discipline:", data.error || res.statusText);
        setSuccessNotification({
          message: data.error || "Une erreur est survenue lors de la création de la discipline.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("[LeaveForm] Network error creating discipline:", err);
      setSuccessNotification({
        message: "Erreur de connexion au serveur d'API.",
        type: "error"
      });
    }
  };

  const handleDeleteDiscipline = async () => {
    if (!selectedDisciplineId || isDeletingDiscipline) return;
    setIsDeletingDiscipline(true);
    try {
      const selectedName = disciplines.find(d => d.id === selectedDisciplineId)?.nom || "la discipline";
      const res = await fetch(`/api/disciplines/${selectedDisciplineId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        onRefreshData();
        setSelectedDisciplineId("");
        setIsConfirmingDeleteDiscipline(false);
        setSuccessNotification({
          message: data.message || `La discipline "${selectedName}" et ses congés associés ont été supprimés avec succès !`,
          type: "success"
        });
        setTimeout(() => setSuccessNotification(null), 6000);
      } else {
        console.error("[LeaveForm] Error deleting discipline:", data.error || res.statusText);
        setSuccessNotification({
          message: data.error || "Une erreur est survenue lors de la suppression.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("[LeaveForm] Network error deleting discipline:", err);
      setSuccessNotification({
        message: "Erreur de connexion au serveur d'API.",
        type: "error"
      });
    } finally {
      setIsDeletingDiscipline(false);
    }
  };

  const addPeriod = () => setPeriods([...periods, { start: "", end: "" }]);
  const removePeriod = (index: number) => setPeriods(periods.filter((_, i) => i !== index));
  const updatePeriod = (index: number, field: "start" | "end", value: string) => {
    const newPeriods = [...periods];
    newPeriods[index][field] = value;
    setPeriods(newPeriods);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);

    // Basic Validation
    if (!selectedFormateurId || !selectedDisciplineId) {
      setSubmitMessage({ type: "error", text: "Veuillez sélectionner un formateur et une discipline." });
      return;
    }
    const hasInvalidPeriod = periods.some(p => !p.start || !p.end || p.start > p.end);
    if (hasInvalidPeriod) {
      setSubmitMessage({ type: "error", text: "Veuillez vérifier les dates de vos périodes (la date de fin doit être après ou égale au début)." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/conges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formateurId: selectedFormateurId,
          disciplineId: selectedDisciplineId,
          periods,
          commentaire
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.anyConflictDetected) {
           setSubmitMessage({ 
             type: "warning", 
             text: "Congés ajoutés, MAIS un conflit de planification a été détecté avec un autre formateur affecté à la même discipline !" 
           });
        } else {
           setSubmitMessage({ 
             type: "success", 
             text: "Congés enregistrés avec succès dans le système (et synchronisés sur le Google Sheet lié)." 
           });
           resetForm();
        }
        onRefreshData();
      } else {
        console.error("[LeaveForm] Error creating conges:", data.error || res.statusText);
        setSubmitMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      }
    } catch(err) {
      console.error("[LeaveForm] Network error creating conges:", err);
      setSubmitMessage({ type: "error", text: "Erreur de connexion au serveur d'API." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Light color test to guarantee perfect black text contrast on very light buttons
  const isLightColor = (hex: string) => {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map(c => c+c).join("");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Relative luminance formula
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 170; // True if color is yellow/amber/light cyan etc.
  };

  return (
      <div className="w-full h-full bg-slate-50 dark:bg-[#090d16] p-8 overflow-y-auto no-scrollbar transition-colors duration-500">
        
        {/* Title Block */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">DÉCLARATION D'INDISPONIBILITÉ</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Saisir les absences programmées des formateurs et vérifier instantanément les disponibilités.</p>
        </div>

        {/* Action success notifications */}
        <AnimatePresence>
          {successNotification && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mb-6"
            >
              <div className={cn(
                "p-4 rounded-2xl text-sm font-bold flex items-center justify-between shadow-sm border transition-colors duration-300",
                successNotification.type === 'success' 
                  ? "bg-green-50/80 dark:bg-green-950/20 text-green-800 dark:text-green-300 border-green-200/50 dark:border-green-900/30" 
                  : "bg-red-50/80 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-200/50 dark:border-red-900/30"
              )}>
                <div className="flex items-center gap-2.5">
                  {successNotification.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-550 dark:text-green-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
                  )}
                  <span>{successNotification.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessNotification(null)}
                  className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* LEFT COLUMN: Formateur & Discipline Card */}
            <div className="bg-white dark:bg-slate-900/40 rounded-3xl p-6 border border-slate-200/50 dark:border-white/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.015)] space-y-8 transition-colors duration-500">
               
               <div className="border-b border-slate-100 dark:border-white/[0.03] pb-4 flex items-center gap-2">
                 <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                 <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-350">1. Informations Formateur</h3>
               </div>

               {/* Formateur Block */}
                <div className="space-y-3.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    Formateur
                  </label>
                  
                  {isAddingFormateur ? (
                    <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-950/65 rounded-2xl border border-slate-200/60 dark:border-white/[0.04] transition-all duration-300">
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Nouveau Formateur</div>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Ex: Alice Dupont"
                        className="w-full rounded-xl border border-slate-250 dark:border-white/[0.06] bg-white dark:bg-slate-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border outline-none text-slate-800 dark:text-slate-100 font-bold transition-all duration-300"
                        value={newFormateurName}
                        onChange={e => setNewFormateurName(e.target.value)}
                      />
                      <div className="space-y-2.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-550">Disciplines maîtrisées :</span>
                        <div className="flex flex-wrap gap-1.5">
                          {disciplines.map(d => {
                            const isChecked = newFormateurDisciplines.includes(d.id);
                            const color = d.colorHex || "#6366f1";
                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => {
                                  if (isChecked) {
                                    setNewFormateurDisciplines(newFormateurDisciplines.filter(id => id !== d.id));
                                  } else {
                                    setNewFormateurDisciplines([...newFormateurDisciplines, d.id]);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                                style={{
                                  borderColor: isChecked ? color : `${color}25`,
                                  backgroundColor: isChecked ? `${color}15` : 'transparent',
                                  color: isChecked ? color : 'inherit',
                                }}
                              >
                                {isChecked && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
                                {d.nom}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-white/[0.03]">
                        <button type="button" onClick={() => setIsAddingFormateur(false)} className="text-slate-500 dark:text-slate-450 px-3.5 py-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-900 rounded-lg text-xs font-bold transition">Annuler</button>
                        <button type="button" onClick={handleCreateFormateur} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs">Valider</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2.5 items-center">
                        <div className="relative flex-1">
                          <select
                            id="formateur-select"
                            value={selectedFormateurId}
                            onChange={(e) => {
                              setSelectedFormateurId(e.target.value);
                              setIsConfirmingDeleteFormateur(false); // reset delete confirm state on new selection
                            }}
                            className="w-full appearance-none rounded-xl border border-slate-250 dark:border-white/[0.06] bg-white dark:bg-slate-900 py-3 pl-4 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-200 transition-colors duration-300 cursor-pointer"
                          >
                            <option value="" disabled>Sélectionner un formateur...</option>
                            {formateurs.map((f) => (
                              <option key={f.id} value={f.id}>{f.nom}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                            <Search className="h-4 w-4" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingFormateur(true)}
                          className="flex items-center justify-center bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-3 text-xs transition font-black border border-slate-205 dark:border-white/[0.04] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Nouveau
                        </button>
                        
                        {selectedFormateurId && (
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDeleteFormateur(!isConfirmingDeleteFormateur)}
                            className="flex items-center justify-center bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl p-3 border border-red-200/50 dark:border-red-900/30 transition cursor-pointer"
                            title="Supprimer ce formateur"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Cascade confirmation warning (A & B) */}
                      <AnimatePresence>
                        {isConfirmingDeleteFormateur && selectedFormateurId && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="p-4 bg-red-50/80 dark:bg-red-950/15 border border-red-250 dark:border-red-900/40 rounded-2xl space-y-3.5 overflow-hidden"
                          >
                            <div className="flex gap-2.5 items-start">
                              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <div className="text-xs font-black text-red-800 dark:text-red-300 uppercase tracking-wider">
                                  Attention: Suppression en Cascade
                                </div>
                                <p className="text-xs text-red-700 dark:text-red-450 leading-relaxed font-medium">
                                  Supprimer le formateur <strong>{formateurs.find(f => f.id === selectedFormateurId)?.nom}</strong> retirera définitivement ce formateur et effacera <strong>toutes ses absences planifiées</strong> de la base de données.
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2.5 border-t border-red-200/50 dark:border-red-950/40">
                              <button
                                type="button"
                                onClick={() => setIsConfirmingDeleteFormateur(false)}
                                disabled={isDeletingFormateur}
                                className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 px-3.5 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteFormateur}
                                disabled={isDeletingFormateur}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                              >
                                {isDeletingFormateur ? "Suppression..." : "Confirmer la suppression"}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Discipline Block */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-455 dark:text-slate-500 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      Discipline concernée
                    </label>
                    {selectedDisciplineId && !isAddingDiscipline && (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteDiscipline(!isConfirmingDeleteDiscipline)}
                        className="text-red-650 hover:text-red-750 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg border border-transparent hover:border-red-200/40 dark:hover:border-red-900/30 transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                        title="Supprimer cette discipline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    )}
                  </div>
                  
                  {isAddingDiscipline ? (
                    <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-950/65 rounded-2xl border border-slate-200/60 dark:border-white/[0.04] transition-all duration-300">
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Nouvelle Discipline</div>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Ex: Architecture logicielle"
                        className="w-full rounded-xl border border-slate-250 dark:border-white/[0.06] bg-white dark:bg-slate-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border outline-none text-slate-800 dark:text-slate-100 font-bold transition-all duration-300"
                        value={newDisciplineName}
                        onChange={e => setNewDisciplineName(e.target.value)}
                      />
                      <div className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-550">Couleur d'affichage :</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {PRESET_COLORS.map(color => (
                            <button
                              type="button"
                              key={color}
                              onClick={() => setNewDisciplineColor(color)}
                              className="w-6 h-6 rounded-full border-2 transition-all duration-150 relative shrink-0 cursor-pointer"
                              style={{
                                backgroundColor: color,
                                borderColor: newDisciplineColor === color ? (isDark ? '#ffffff' : '#000000') : 'transparent',
                                boxShadow: newDisciplineColor === color ? '0 0 0 2px rgba(255,255,255,0.8), 0 4px 8px rgba(0,0,0,0.2)' : 'none'
                              }}
                              title={color}
                            />
                          ))}
                          <div className="relative flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                            <input
                              type="color"
                              value={newDisciplineColor}
                              onChange={e => setNewDisciplineColor(e.target.value)}
                              className="w-6 h-6 rounded-full border-0 p-0 bg-transparent cursor-pointer shrink-0"
                            />
                            <span className="text-[9px] text-slate-400 font-mono select-none uppercase">{newDisciplineColor}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-white/[0.03]">
                        <button type="button" onClick={() => setIsAddingDiscipline(false)} className="text-slate-500 dark:text-slate-450 px-3.5 py-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-900 rounded-lg text-xs font-bold transition">Annuler</button>
                        <button type="button" onClick={handleCreateDiscipline} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs">Valider</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Cascade confirmation warning for discipline */}
                      <AnimatePresence>
                        {isConfirmingDeleteDiscipline && selectedDisciplineId && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="p-4 bg-red-50/80 dark:bg-red-950/15 border border-red-250 dark:border-red-900/40 rounded-2xl space-y-3.5 overflow-hidden my-3"
                          >
                            <div className="flex gap-2.5 items-start">
                              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <div className="text-xs font-black text-red-800 dark:text-red-300 uppercase tracking-wider">
                                  Attention: Suppression en Cascade
                                </div>
                                <p className="text-xs text-red-700 dark:text-red-450 leading-relaxed font-medium">
                                  Supprimer la discipline <strong>{disciplines.find(d => d.id === selectedDisciplineId)?.nom}</strong> retirera définitivement cette discipline, la désassociera de <strong>tous les formateurs</strong>, et effacera <strong>toutes les indisponibilités associées</strong>.
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2.5 border-t border-red-200/50 dark:border-red-950/40">
                              <button
                                type="button"
                                onClick={() => setIsConfirmingDeleteDiscipline(false)}
                                disabled={isDeletingDiscipline}
                                className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 px-3.5 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteDiscipline}
                                disabled={isDeletingDiscipline}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                              >
                                {isDeletingDiscipline ? "Suppression..." : "Confirmer la suppression"}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-wrap gap-2.5">
                        {disciplines.map(d => {
                          const color = d.colorHex || "#6366f1";
                          const isSelected = selectedDisciplineId === d.id;
                          const selectedFormateur = formateurs.find(f => f.id === selectedFormateurId);
                          const isTaughtByFormateur = selectedFormateur ? selectedFormateur.disciplines.includes(d.id) : false;
                          const safe = getSafeThemeColor(color, isDark);

                          // Contrast Guard: Yellow / Light colors get black text when selected solid, others white
                          const selectedTextColor = isLightColor(color) ? '#090d16' : '#ffffff';

                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setSelectedDisciplineId(d.id)}
                              className={cn(
                                "px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all duration-350 border flex items-center gap-1.5 relative overflow-hidden",
                                isSelected 
                                  ? "shadow-sm scale-[1.01]" 
                                  : "hover:scale-[1.01] cursor-pointer"
                              )}
                              style={{
                                backgroundColor: isSelected ? color : (isTaughtByFormateur ? safe.bg : 'transparent'),
                                borderColor: isSelected ? color : (isTaughtByFormateur ? safe.border : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')),
                                color: isSelected ? selectedTextColor : (isTaughtByFormateur ? safe.text : (isDark ? '#94a3b8' : '#64748b')),
                                boxShadow: isSelected ? `0 4px 14px ${color}35` : 'none',
                                borderWidth: isTaughtByFormateur ? '2px' : '1px',
                                opacity: (selectedFormateur && !isTaughtByFormateur && !isSelected) ? 0.45 : 1,
                              }}
                            >
                              {isTaughtByFormateur && (
                                <Sparkles className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "" : "text-amber-500 animate-pulse")} />
                              )}
                              <span>{d.nom}</span>
                              {isTaughtByFormateur && !isSelected && (
                                <span 
                                  className="text-[8px] uppercase tracking-widest px-1 py-0.5 rounded-md font-black shrink-0"
                                  style={{
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                    borderColor: safe.border
                                  }}
                                >
                                  Enseignée
                                </span>
                              )}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setIsAddingDiscipline(true)}
                          className="px-3.5 py-2 rounded-2xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-205 dark:border-white/[0.04] transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Nouvelle
                        </button>
                      </div>
                      
                      {selectedFormateurId && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1 transition-all duration-200">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                          Les disciplines enseignées par <strong className="text-slate-650 dark:text-slate-350">{formateurs.find(f => f.id === selectedFormateurId)?.nom}</strong> sont mises en valeur.
                        </p>
                      )}
                    </div>
                  )}
                </div>
            </div>

            {/* RIGHT COLUMN: Dates & Commentaire Card */}
            <div className="bg-white dark:bg-slate-900/40 rounded-3xl p-6 border border-slate-200/50 dark:border-white/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.015)] space-y-6 transition-colors duration-500">
                
                <div className="border-b border-slate-100 dark:border-white/[0.03] pb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-355">2. Périodes & Remarques</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addPeriod}
                    className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Nouvelle période
                  </button>
                </div>

                {/* Periods List */}
                <div className="space-y-3.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-550 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    Indiquer les dates
                  </label>
                  
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {periods.map((period, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, scale: 0.96, height: 0 }}
                          animate={{ opacity: 1, scale: 1, height: 'auto' }}
                          exit={{ opacity: 0, scale: 0.96, height: 0 }}
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                          className="flex items-center gap-2.5 overflow-hidden"
                        >
                          <div className="flex-1 grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-white/[0.04] rounded-2xl transition-colors duration-300">
                            <div>
                              <div className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 tracking-wider">Date de début</div>
                              <input 
                                type="date"
                                min="2026-01-01"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 cursor-pointer"
                                value={period.start}
                                onChange={e => updatePeriod(index, "start", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <div className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 tracking-wider">Date de fin</div>
                              <input 
                                type="date"
                                min={period.start || "2026-01-01"}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 cursor-pointer"
                                value={period.end}
                                onChange={e => updatePeriod(index, "end", e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          {periods.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removePeriod(index)}
                              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Comment Block */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-550 flex items-center gap-2">
                    Commentaire de Saisie
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Préciser la raison ou des notes complémentaires (ex: Formation externe)..."
                    className="w-full rounded-2xl border border-slate-250 dark:border-white/[0.06] bg-white dark:bg-slate-900 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100 resize-none transition-all duration-300"
                    value={commentaire}
                    onChange={e => setCommentaire(e.target.value)}
                  />
                </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="border-t border-slate-200 dark:border-white/[0.03] pt-6 flex flex-col gap-4">
            
            {/* Feedback Notifications */}
            <AnimatePresence>
              {submitMessage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.97 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className={cn(
                    "p-4 rounded-2xl text-sm font-semibold border flex items-center gap-3 shadow-xs transition-colors duration-300",
                    submitMessage.type === 'success' 
                      ? "bg-green-50/80 dark:bg-green-950/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/30" 
                      : (submitMessage.type === 'warning'
                         ? "bg-amber-50/90 dark:bg-amber-950/20 text-amber-850 dark:text-amber-350 border-amber-200/50 dark:border-amber-900/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                         : "bg-red-50/80 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/30")
                  )}
                >
                  {submitMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-550 dark:text-green-400 shrink-0" />}
                  {submitMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />}
                  {submitMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                  <span>{submitMessage.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-3.5">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-205 dark:border-white/[0.04] rounded-2xl py-3 px-8 font-extrabold tracking-wide transition-all disabled:opacity-50 cursor-pointer text-xs uppercase"
              >
                Réinitialiser
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-slate-950 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-950 rounded-2xl py-3 px-10 font-black tracking-wider transition-all disabled:opacity-50 shadow-md shadow-slate-950/10 dark:shadow-white/5 cursor-pointer text-xs uppercase"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer les indisponibilités"}
              </button>
            </div>
          </div>
        </form>
      </div>
  );
}
