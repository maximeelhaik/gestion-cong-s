import express from "express";
import { v4 as uuidv4 } from "uuid";
import {
  initDb,
  getFormateurs,
  saveFormateurs,
  getDisciplines,
  saveDisciplines,
  getConges,
  saveConges,
} from "./db.ts";

const app = express();
app.use(express.json());

// Initialize database
initDb().catch((err) => console.error("[DB Init Error]", err));

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
    const { nom, disciplines: newDisciplines } = req.body;
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
    const { nom, colorHex } = req.body;
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
    const { formateurId, disciplineId, periods, commentaire } = req.body;
    
    if (!formateurId || !disciplineId || !periods || !Array.isArray(periods)) {
      return res.status(400).json({ error: "Payload invalide" });
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

    // --- Conflict Detection Logic ---
    let anyConflictDetected = false;

    for (const nc of newConges) {
      // Find all existing conges in the SAME discipline, excluding leaves from the same trainer
      const sameDisciplineConges = conges.filter(
        c => c.disciplineId === nc.disciplineId && c.formateurId !== nc.formateurId
      );

      // Check dates intersection
      const overlapping = sameDisciplineConges.filter(c => {
        // Intersects if: new.start <= existing.end AND new.end >= existing.start
        return nc.dateDebut <= c.dateFin && nc.dateFin >= c.dateDebut;
      });

      if (overlapping.length > 0) {
        nc.aConflit = true;
        anyConflictDetected = true;
        
        // Update the existing leaves to also show as conflicted!
        overlapping.forEach(oConge => {
          const target = conges.find(c => c.id === oConge.id);
          if (target) {
            target.aConflit = true;
          }
        });
      }
    }

    // Save to our DB
    conges.push(...newConges);
    await saveConges(conges);

    res.status(201).json({ success: true, newConges, anyConflictDetected });
  } catch (err: any) {
    console.error("[API] Error adding conge:", err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
