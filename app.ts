import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "@upstash/redis";
import {
  initDb,
  getFormateurs,
  saveFormateurs,
  getDisciplines,
  saveDisciplines,
  getConges,
  saveConges,
} from "./db.js";


const app = express();
app.use(express.json());

// Helper function to recalculate all conflicts globally in $O(N^2)$ time.
// Resets all conflicts and updates them dynamically based on overlaps.
function recalculateConflicts(conges: any[]): boolean {
  conges.forEach(c => c.aConflit = false);
  let anyConflict = false;

  for (let i = 0; i < conges.length; i++) {
    for (let j = i + 1; j < conges.length; j++) {
      const c1 = conges[i];
      const c2 = conges[j];

      if (
        c1.disciplineId === c2.disciplineId &&
        c1.formateurId !== c2.formateurId
      ) {
        // Intersects if: new.start <= existing.end AND new.end >= existing.start
        const intersects = c1.dateDebut <= c2.dateFin && c1.dateFin >= c2.dateDebut;
        if (intersects) {
          c1.aConflit = true;
          c2.aConflit = true;
          anyConflict = true;
        }
      }
    }
  }
  return anyConflict;
}


app.get("/api/diagnose", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Access Forbidden in production" });
    }
    const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    
    function cleanEnvValue(val: string | undefined): string | undefined {
      if (!val) return undefined;
      let s = val.trim();
      if (s.startsWith('"') && s.endsWith('"')) {
        s = s.slice(1, -1);
      }
      if (s.startsWith("'") && s.endsWith("'")) {
        s = s.slice(1, -1);
      }
      return s.trim();
    }

    const cleanUrl = cleanEnvValue(KV_URL);
    const cleanToken = cleanEnvValue(KV_TOKEN);

    const hasUrl = !!cleanUrl;
    const hasToken = !!cleanToken;

    let urlInfo = cleanUrl ? `${cleanUrl.substring(0, 18)}...` : "missing";
    let tokenInfo = cleanToken ? `present (length: ${cleanToken.length})` : "missing";

    let testResult = "Not attempted";
    let testError = null;

    if (hasUrl && hasToken) {
      try {
        const start = Date.now();
        const testRedis = new Redis({
          url: cleanUrl || "",
          token: cleanToken || "",
        });
        const pong = await testRedis.ping();
        const duration = Date.now() - start;
        testResult = `Success! Ping returned: "${pong}" (took ${duration}ms)`;
      } catch (err: any) {
        testResult = "SDK Connection Failed";
        testError = {
          message: err.message,
          stack: err.stack,
        };
      }
    }

    res.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasKV_REST_API_URL: !!process.env.KV_REST_API_URL,
        hasUPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
        hasKV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
        hasUPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        resolvedUrlPrefix: urlInfo,
        resolvedTokenStatus: tokenInfo,
      },
      test: {
        result: testResult,
        error: testError,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reset", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Access Forbidden in production" });
    }
    const DEFAULT_FORMATEURS = [
      { id: "1", nom: "Alice Dupont", disciplines: ["d1", "d2"] },
      { id: "2", nom: "Marc Lemaire", disciplines: ["d1"] },
      { id: "3", nom: "Sophie Martin", disciplines: ["d3"] },
    ];
    const DEFAULT_DISCIPLINES = [
      { id: "d1", nom: "Développement Web", colorHex: "#3b82f6" },
      { id: "d2", nom: "Data Science", colorHex: "#10b981" },
      { id: "d3", nom: "DevOps", colorHex: "#f59e0b" },
    ];
    const DEFAULT_CONGES = [
      {
        id: "c1",
        formateurId: "1",
        disciplineId: "d1",
        dateDebut: "2026-05-10",
        dateFin: "2026-05-15",
        commentaire: "Vacances printemps",
        aConflit: false,
      },
    ];
    await Promise.all([
      saveFormateurs(DEFAULT_FORMATEURS),
      saveDisciplines(DEFAULT_DISCIPLINES),
      saveConges(DEFAULT_CONGES)
    ]);
    res.json({ success: true, message: "Database reset to default seed data successfully!" });
  } catch (err: any) {
    console.error("[API] Error resetting database:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- API Routes ---

// Get all baseline data for hydration
app.get("/api/init", async (req, res) => {
  try {
    const [formateurs, disciplines, conges] = await Promise.all([
      getFormateurs(),
      getDisciplines(),
      getConges(),
    ]);
    res.json({ formateurs, disciplines, conges });
  } catch (err: any) {
    console.error("[API] Error fetching initial data:", err);
    res.status(500).json({ error: err.message });
  }
});

// Formateurs
app.get("/api/formateurs", async (req, res) => {
  try {
    const formateurs = await getFormateurs();
    res.json(formateurs);
  } catch (err: any) {
    console.error("[API] Error fetching formateurs:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/formateurs", async (req, res) => {
  try {
    const { nom, disciplines: newDisciplines } = req.body || {};
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom du formateur est requis" });
    }
    const formateurs = await getFormateurs();
    const newFormateur = {
      id: uuidv4(),
      nom: nom.trim(),
      disciplines: newDisciplines || [],
    };
    formateurs.push(newFormateur);
    await saveFormateurs(formateurs);
    res.status(201).json(newFormateur);
  } catch (err: any) {
    console.error("[API] Error saving formateur:", err);
    res.status(500).json({ error: err.message });
  }
});

// Disciplines
app.get("/api/disciplines", async (req, res) => {
  try {
    const disciplines = await getDisciplines();
    res.json(disciplines);
  } catch (err: any) {
    console.error("[API] Error fetching disciplines:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/disciplines", async (req, res) => {
  try {
    const { nom, colorHex } = req.body || {};
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom de la discipline est requis" });
    }
    const disciplines = await getDisciplines();
    const newDiscipline = {
      id: uuidv4(),
      nom: nom.trim(),
      colorHex: colorHex || "#6366f1", // default indigo
    };
    disciplines.push(newDiscipline);
    await saveDisciplines(disciplines);
    res.status(201).json(newDiscipline);
  } catch (err: any) {
    console.error("[API] Error saving discipline:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a discipline with cascade (DELETE)
app.delete("/api/disciplines/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    let disciplines = await getDisciplines();
    const disciplineIndex = disciplines.findIndex(d => d.id === id);
    if (disciplineIndex === -1) {
      return res.status(404).json({ error: "Discipline introuvable" });
    }
    
    // Remove the discipline
    disciplines.splice(disciplineIndex, 1);
    await saveDisciplines(disciplines);
    
    // Cascade (A): Remove all leaves associated with this discipline
    let conges = await getConges();
    const originalCongesLength = conges.length;
    conges = conges.filter(c => c.disciplineId !== id);
    const deletedCongesCount = originalCongesLength - conges.length;
    
    // Recalculate remaining conflicts if any leaves were cascade-deleted
    if (deletedCongesCount > 0) {
      recalculateConflicts(conges);
    }
    await saveConges(conges);
    
    // Cascade (B): Remove this discipline from all formateurs who master it
    let formateurs = await getFormateurs();
    let updatedFormateursCount = 0;
    formateurs = formateurs.map(f => {
      if (f.disciplines && f.disciplines.includes(id)) {
        updatedFormateursCount++;
        return {
          ...f,
          disciplines: f.disciplines.filter(dId => dId !== id)
        };
      }
      return f;
    });
    await saveFormateurs(formateurs);
    
    res.json({ 
      success: true, 
      message: `Discipline supprimée avec succès. ${deletedCongesCount} congé(s) supprimé(s) en cascade et mise à jour de ${updatedFormateursCount} formateur(s).` 
    });
  } catch (err: any) {
    console.error("[API] Error deleting discipline:", err);
    res.status(500).json({ error: err.message });
  }
});

// Conges
app.get("/api/conges", async (req, res) => {
  try {
    const conges = await getConges();
    res.json(conges);
  } catch (err: any) {
    console.error("[API] Error fetching conges:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/conges", async (req, res) => {
  try {
    const { formateurId, disciplineId, periods, commentaire } = req.body || {};
    
    if (!formateurId || !disciplineId || !periods || !Array.isArray(periods)) {
      return res.status(400).json({ error: "Payload invalide" });
    }

    // Validate formateur existence
    const formateurs = await getFormateurs();
    const formateurExists = formateurs.some(f => f.id === formateurId);
    if (!formateurExists) {
      return res.status(400).json({ error: "Formateur introuvable dans la base de données" });
    }

    // Validate discipline existence
    const disciplines = await getDisciplines();
    const disciplineExists = disciplines.some(d => d.id === disciplineId);
    if (!disciplineExists) {
      return res.status(400).json({ error: "Discipline introuvable dans la base de données" });
    }

    // Validate periods and ISO date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const p of periods) {
      if (!p.start || !p.end || !dateRegex.test(p.start) || !dateRegex.test(p.end)) {
        return res.status(400).json({ error: "Les dates doivent respecter le format ISO standard YYYY-MM-DD" });
      }
      if (p.start > p.end) {
        return res.status(400).json({ error: "La date de début doit être antérieure ou égale à la date de fin" });
      }
    }

    const conges = await getConges();

    const newConges = periods.map(p => ({
      id: uuidv4(),
      formateurId,
      disciplineId,
      dateDebut: p.start,
      dateFin: p.end,
      commentaire: commentaire || "",
      aConflit: false,
    }));

    conges.push(...newConges);
    
    // Global conflicts recalculation
    const anyConflictDetected = recalculateConflicts(conges);
    await saveConges(conges);

    res.status(201).json({ success: true, newConges, anyConflictDetected });
  } catch (err: any) {
    console.error("[API] Error adding conge:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update an existing leave (PUT)
app.put("/api/conges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { formateurId, disciplineId, dateDebut, dateFin, commentaire } = req.body || {};

    if (!formateurId || !disciplineId || !dateDebut || !dateFin) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    // Validate ISO date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateDebut) || !dateRegex.test(dateFin)) {
      return res.status(400).json({ error: "Les dates doivent respecter le format ISO standard YYYY-MM-DD" });
    }

    if (dateDebut > dateFin) {
      return res.status(400).json({ error: "La date de début doit être antérieure ou égale à la date de fin" });
    }

    // Validate formateur existence
    const formateurs = await getFormateurs();
    const formateurExists = formateurs.some(f => f.id === formateurId);
    if (!formateurExists) {
      return res.status(400).json({ error: "Formateur introuvable dans la base de données" });
    }

    // Validate discipline existence
    const disciplines = await getDisciplines();
    const disciplineExists = disciplines.some(d => d.id === disciplineId);
    if (!disciplineExists) {
      return res.status(400).json({ error: "Discipline introuvable dans la base de données" });
    }

    const conges = await getConges();
    const index = conges.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Congé introuvable" });
    }

    // Update fields
    conges[index] = {
      ...conges[index],
      formateurId,
      disciplineId,
      dateDebut,
      dateFin,
      commentaire: commentaire || "",
    };

    // Recalculate global conflicts
    const anyConflictDetected = recalculateConflicts(conges);
    await saveConges(conges);

    res.json({ success: true, conge: conges[index], anyConflictDetected });
  } catch (err: any) {
    console.error("[API] Error updating conge:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a leave (DELETE)
app.delete("/api/conges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let conges = await getConges();
    const originalLength = conges.length;
    conges = conges.filter(c => c.id !== id);

    if (conges.length === originalLength) {
      return res.status(404).json({ error: "Congé introuvable" });
    }

    // Recalculate conflicts for remaining leaves
    recalculateConflicts(conges);
    await saveConges(conges);

    res.json({ success: true, message: "Congé supprimé avec succès" });
  } catch (err: any) {
    console.error("[API] Error deleting conge:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a trainer with cascade (DELETE)
app.delete("/api/formateurs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    let formateurs = await getFormateurs();
    const formateurIndex = formateurs.findIndex(f => f.id === id);
    if (formateurIndex === -1) {
      return res.status(404).json({ error: "Formateur introuvable" });
    }
    
    // Remove the trainer
    formateurs.splice(formateurIndex, 1);
    await saveFormateurs(formateurs);
    
    // Cascade (A): Remove all leaves associated with this trainer
    let conges = await getConges();
    const originalCongesLength = conges.length;
    conges = conges.filter(c => c.formateurId !== id);
    const deletedCongesCount = originalCongesLength - conges.length;
    
    // Recalculate remaining conflicts if any leaves were cascade-deleted
    if (deletedCongesCount > 0) {
      recalculateConflicts(conges);
    }
    await saveConges(conges);
    
    res.json({ 
      success: true, 
      message: `Formateur supprimé avec succès. ${deletedCongesCount} congé(s) associé(s) supprimé(s) en cascade.` 
    });
  } catch (err: any) {
    console.error("[API] Error deleting formateur:", err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
