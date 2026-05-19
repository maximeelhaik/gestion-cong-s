import { Formateur, Discipline, DateRange } from "../types";
import { useState } from "react";
import { Plus, Trash2, Calendar, User, Search, Tag } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface LeaveFormProps {
  formateurs: Formateur[];
  disciplines: Discipline[];
  onRefreshData: () => void;
}

export default function LeaveForm({ formateurs, disciplines, onRefreshData }: LeaveFormProps) {
  const [selectedFormateurId, setSelectedFormateurId] = useState<string>("");
  const [isAddingFormateur, setIsAddingFormateur] = useState(false);
  const [newFormateurName, setNewFormateurName] = useState("");

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
  const [isAddingDiscipline, setIsAddingDiscipline] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState("");

  const [periods, setPeriods] = useState<DateRange[]>([{ start: "", end: "" }]);
  const [commentaire, setCommentaire] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  const resetForm = () => {
    setSelectedFormateurId("");
    setSelectedDisciplineId("");
    setPeriods([{ start: "", end: "" }]);
    setCommentaire("");
  };

  const handleCreateFormateur = async () => {
    if (!newFormateurName.trim()) return;
    const res = await fetch("/api/formateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newFormateurName, disciplines: [] }),
    });
    if (res.ok) {
      const data = await res.json();
      onRefreshData();
      setIsAddingFormateur(false);
      setNewFormateurName("");
      setSelectedFormateurId(data.id);
    }
  };

  const handleCreateDiscipline = async () => {
    if (!newDisciplineName.trim()) return;
    const res = await fetch("/api/disciplines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newDisciplineName }),
    });
    if (res.ok) {
      const data = await res.json();
      onRefreshData();
      setIsAddingDiscipline(false);
      setNewDisciplineName("");
      setSelectedDisciplineId(data.id);
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
      setSubmitMessage({ type: "error", text: "Veuillez vérifier les dates saisies (la date de fin doit être après ou égale au début)." });
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
           setSubmitMessage({ type: "error", text: "Congés ajoutés, MAIS un conflit a été détecté avec un autre formateur de la même discipline !" });
        } else {
           setSubmitMessage({ type: "success", text: "Congés enregistrés avec succès dans le système (et le Google Sheet lié)." });
           resetForm();
        }
        onRefreshData();
      } else {
        setSubmitMessage({ type: "error", text: data.error || "Une erreur est survenue." });
      }
    } catch(err) {
      setSubmitMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full bg-white flex flex-col overflow-hidden"
      >
        <div className="bg-slate-50 border-b border-gray-100 px-8 py-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Saisie des Congés</h2>
          <p className="text-sm text-slate-500 mt-1">Déclarer de nouvelles périodes d'indisponibilité.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1 overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Formateur & Discipline */}
            <div className="space-y-8">
               {/* Formateur */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Formateur
                  </label>
                  {isAddingFormateur ? (
                    <div className="flex gap-2 items-center">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Nom du nouveau formateur"
                        className="flex-1 rounded-lg border-slate-300 py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 border outline-none"
                        value={newFormateurName}
                        onChange={e => setNewFormateurName(e.target.value)}
                      />
                      <button type="button" onClick={handleCreateFormateur} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Valider</button>
                      <button type="button" onClick={() => setIsAddingFormateur(false)} className="text-slate-500 px-2 py-2 hover:bg-slate-100 rounded-lg">Annuler</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <select
                          value={selectedFormateurId}
                          onChange={(e) => setSelectedFormateurId(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="" disabled>Sélectionner un formateur...</option>
                          {formateurs.map((f) => (
                            <option key={f.id} value={f.id}>{f.nom}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                          <Search className="h-4 w-4" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingFormateur(true)}
                        className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-2.5 text-sm transition font-medium border border-slate-200"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Nouveau
                      </button>
                    </div>
                  )}
                </div>

                {/* Discipline */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    Discipline affectée
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {disciplines.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDisciplineId(d.id)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
                          selectedDisciplineId === d.id 
                            ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                        )}
                      >
                        {d.nom}
                      </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setIsAddingDiscipline(true)}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Nouvelle
                      </button>
                  </div>
                </div>
            </div>

            {/* Right Column: Dates & Commentaire */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Périodes (Année 2026+)
                  </label>
                  <button
                    type="button"
                    onClick={addPeriod}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une période
                  </button>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {periods.map((period, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                          <input 
                            type="date"
                            min="2026-01-01"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={period.start}
                            onChange={e => updatePeriod(index, "start", e.target.value)}
                            required
                          />
                          <input 
                            type="date"
                            min={period.start || "2026-01-01"}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={period.end}
                            onChange={e => updatePeriod(index, "end", e.target.value)}
                            required
                          />
                        </div>
                        {periods.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removePeriod(index)}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">Commentaire (optionnel)</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border-slate-200 py-3 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 border outline-none placeholder:text-slate-400 resize-none"
                    value={commentaire}
                    onChange={e => setCommentaire(e.target.value)}
                  />
                </div>
            </div>
          </div>

          {/* Submission */}
          <div className="border-t pt-8">
            {submitMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-4 rounded-xl text-sm font-medium mb-6",
                  submitMessage.type === 'success' ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
                )}
              >
                {submitMessage.text}
              </motion.div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto bg-slate-900 text-white rounded-xl py-3 px-10 font-semibold tracking-wide hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer les congés"}
            </button>
          </div>
        </form>
      </motion.div>
  );
}
