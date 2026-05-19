import fs from "fs";
import path from "path";
import type { Formateur, Discipline, Conge } from "./src/types.ts";

// Load dotenv just in case db.ts is loaded standalone
import dotenv from "dotenv";
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Verify if the KV REST URL is a valid HTTP/HTTPS URL
const isValidHttpUrl = !!(KV_URL && (KV_URL.startsWith("http://") || KV_URL.startsWith("https://")));

if (KV_URL && !isValidHttpUrl) {
  console.warn(`[DB] Warning: KV_REST_API_URL (${KV_URL}) does not start with http:// or https://. It cannot be used with fetch REST queries. Falling back to local file db.`);
}

const isKvConfigured = !!(KV_URL && KV_TOKEN && isValidHttpUrl);


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
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP Error ${response.status}: ${text || response.statusText}`);
  }
  
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
    try {
      const res = await kvFetch(["GET", "academy_formateurs"]);
      return res ? JSON.parse(res) : DEFAULT_FORMATEURS;
    } catch (err: any) {
      console.error("[DB Fallback] getFormateurs KV call failed. Falling back to local file db. Error:", err.message);
      const db = readLocalDb();
      return db.formateurs || DEFAULT_FORMATEURS;
    }
  } else {
    const db = readLocalDb();
    return db.formateurs || DEFAULT_FORMATEURS;
  }
}

export async function saveFormateurs(formateurs: Formateur[]): Promise<void> {
  if (isKvConfigured) {
    try {
      await kvFetch(["SET", "academy_formateurs", JSON.stringify(formateurs)]);
    } catch (err: any) {
      console.error("[DB Fallback] saveFormateurs KV call failed. Saving to local file db. Error:", err.message);
      const db = readLocalDb();
      db.formateurs = formateurs;
      writeLocalDb(db);
    }
  } else {
    const db = readLocalDb();
    db.formateurs = formateurs;
    writeLocalDb(db);
  }
}

export async function getDisciplines(): Promise<Discipline[]> {
  if (isKvConfigured) {
    try {
      const res = await kvFetch(["GET", "academy_disciplines"]);
      return res ? JSON.parse(res) : DEFAULT_DISCIPLINES;
    } catch (err: any) {
      console.error("[DB Fallback] getDisciplines KV call failed. Falling back to local file db. Error:", err.message);
      const db = readLocalDb();
      return db.disciplines || DEFAULT_DISCIPLINES;
    }
  } else {
    const db = readLocalDb();
    return db.disciplines || DEFAULT_DISCIPLINES;
  }
}

export async function saveDisciplines(disciplines: Discipline[]): Promise<void> {
  if (isKvConfigured) {
    try {
      await kvFetch(["SET", "academy_disciplines", JSON.stringify(disciplines)]);
    } catch (err: any) {
      console.error("[DB Fallback] saveDisciplines KV call failed. Saving to local file db. Error:", err.message);
      const db = readLocalDb();
      db.disciplines = disciplines;
      writeLocalDb(db);
    }
  } else {
    const db = readLocalDb();
    db.disciplines = disciplines;
    writeLocalDb(db);
  }
}

export async function getConges(): Promise<Conge[]> {
  if (isKvConfigured) {
    try {
      const res = await kvFetch(["GET", "academy_conges"]);
      return res ? JSON.parse(res) : DEFAULT_CONGES;
    } catch (err: any) {
      console.error("[DB Fallback] getConges KV call failed. Falling back to local file db. Error:", err.message);
      const db = readLocalDb();
      return db.conges || DEFAULT_CONGES;
    }
  } else {
    const db = readLocalDb();
    return db.conges || DEFAULT_CONGES;
  }
}

export async function saveConges(conges: Conge[]): Promise<void> {
  if (isKvConfigured) {
    try {
      await kvFetch(["SET", "academy_conges", JSON.stringify(conges)]);
    } catch (err: any) {
      console.error("[DB Fallback] saveConges KV call failed. Saving to local file db. Error:", err.message);
      const db = readLocalDb();
      db.conges = conges;
      writeLocalDb(db);
    }
  } else {
    const db = readLocalDb();
    db.conges = conges;
    writeLocalDb(db);
  }
}
