import fs from "fs";
import path from "path";
import type { Formateur, Discipline, Conge } from "./src/types.ts";

// Load dotenv just in case db.ts is loaded standalone
import dotenv from "dotenv";
dotenv.config();

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const isKvConfigured = !!(KV_URL && KV_TOKEN);

const LOCAL_DB_PATH = path.join(process.cwd(), "db.json");

// --- Seed Data ---
const DEFAULT_FORMATEURS: Formateur[] = [
  { id: "1", nom: "Alice Dupont", disciplines: ["d1", "d2"] },
  { id: "2", nom: "Marc Lemaire", disciplines: ["d1"] },
  { id: "3", nom: "Sophie Martin", disciplines: ["d3"] },
];

const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: "d1", nom: "Développement Web", colorHex: "#3b82f6" }, // blue-500
  { id: "d2", nom: "Data Science", colorHex: "#10b981" }, // emerald-500
  { id: "d3", nom: "DevOps", colorHex: "#f59e0b" }, // amber-500
];

const DEFAULT_CONGES: Conge[] = [
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

// --- KV REST API Client ---
async function kvFetch(command: any[]) {
  if (!KV_URL || !KV_TOKEN) throw new Error("KV not configured");
  const response = await fetch(KV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(`Vercel KV Error: ${data.error}`);
  }
  return data.result;
}

// --- Local File Database Client ---
function readLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    return {
      formateurs: DEFAULT_FORMATEURS,
      disciplines: DEFAULT_DISCIPLINES,
      conges: DEFAULT_CONGES,
    };
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[DB] Error reading local file database. Resetting...", err);
    return {
      formateurs: DEFAULT_FORMATEURS,
      disciplines: DEFAULT_DISCIPLINES,
      conges: DEFAULT_CONGES,
    };
  }
}

function writeLocalDb(data: { formateurs: Formateur[]; disciplines: Discipline[]; conges: Conge[] }) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Error writing to local file database.", err);
  }
}

// --- Seed Database if Needed ---
export async function initDb() {
  console.log(`[DB] Using ${isKvConfigured ? "Vercel KV (Redis)" : "local db.json file"}`);
  if (isKvConfigured) {
    try {
      const exists = await kvFetch(["EXISTS", "academy_formateurs"]);
      if (exists === 0) {
        console.log("[DB] Seeding Vercel KV with initial data...");
        await kvFetch(["SET", "academy_formateurs", JSON.stringify(DEFAULT_FORMATEURS)]);
        await kvFetch(["SET", "academy_disciplines", JSON.stringify(DEFAULT_DISCIPLINES)]);
        await kvFetch(["SET", "academy_conges", JSON.stringify(DEFAULT_CONGES)]);
      }
    } catch (err) {
      console.error("[DB] Error seeding Vercel KV, check your credentials:", err);
    }
  } else {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      console.log("[DB] Seeding local db.json with initial data...");
      writeLocalDb({
        formateurs: DEFAULT_FORMATEURS,
        disciplines: DEFAULT_DISCIPLINES,
        conges: DEFAULT_CONGES,
      });
    }
  }
}

// --- Getter and Setter Functions ---
export async function getFormateurs(): Promise<Formateur[]> {
  if (isKvConfigured) {
    const res = await kvFetch(["GET", "academy_formateurs"]);
    return res ? JSON.parse(res) : DEFAULT_FORMATEURS;
  } else {
    const db = readLocalDb();
    return db.formateurs || DEFAULT_FORMATEURS;
  }
}

export async function saveFormateurs(formateurs: Formateur[]): Promise<void> {
  if (isKvConfigured) {
    await kvFetch(["SET", "academy_formateurs", JSON.stringify(formateurs)]);
  } else {
    const db = readLocalDb();
    db.formateurs = formateurs;
    writeLocalDb(db);
  }
}

export async function getDisciplines(): Promise<Discipline[]> {
  if (isKvConfigured) {
    const res = await kvFetch(["GET", "academy_disciplines"]);
    return res ? JSON.parse(res) : DEFAULT_DISCIPLINES;
  } else {
    const db = readLocalDb();
    return db.disciplines || DEFAULT_DISCIPLINES;
  }
}

export async function saveDisciplines(disciplines: Discipline[]): Promise<void> {
  if (isKvConfigured) {
    await kvFetch(["SET", "academy_disciplines", JSON.stringify(disciplines)]);
  } else {
    const db = readLocalDb();
    db.disciplines = disciplines;
    writeLocalDb(db);
  }
}

export async function getConges(): Promise<Conge[]> {
  if (isKvConfigured) {
    const res = await kvFetch(["GET", "academy_conges"]);
    return res ? JSON.parse(res) : DEFAULT_CONGES;
  } else {
    const db = readLocalDb();
    return db.conges || DEFAULT_CONGES;
  }
}

export async function saveConges(conges: Conge[]): Promise<void> {
  if (isKvConfigured) {
    await kvFetch(["SET", "academy_conges", JSON.stringify(conges)]);
  } else {
    const db = readLocalDb();
    db.conges = conges;
    writeLocalDb(db);
  }
}
