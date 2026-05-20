import type { Formateur, Discipline, Conge } from "./src/types";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load dotenv for local environment variables
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

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

const KV_URL = cleanEnvValue(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
const KV_TOKEN = cleanEnvValue(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);

if (!KV_URL || !KV_TOKEN) {
  console.error("[DB] Error: Upstash / Vercel KV environment variables (KV_REST_API_URL, KV_REST_API_TOKEN) are missing!");
}

const redis = new Redis({
  url: KV_URL || "",
  token: KV_TOKEN || "",
});

// --- Seed Data ---
const DEFAULT_FORMATEURS: Formateur[] = [
  { id: "1", nom: "Alice Dupont", disciplines: ["d1", "d2"] },
  { id: "2", nom: "Marc Lemaire", disciplines: ["d1"] },
  { id: "3", nom: "Sophie Martin", disciplines: ["d3"] },
];

const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: "d1", nom: "Développement Web", colorHex: "#3b82f6" },
  { id: "d2", nom: "Data Science", colorHex: "#10b981" },
  { id: "d3", nom: "DevOps", colorHex: "#f59e0b" },
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

let isDbInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureDbInitialized() {
  if (isDbInitialized) return;
  if (!initPromise) {
    initPromise = initDb().then(() => {
      isDbInitialized = true;
    }).catch(err => {
      initPromise = null; // Let future requests retry if it failed
      throw err;
    });
  }
  await initPromise;
}

// --- Seed Database if Needed ---
export async function initDb() {
  console.log("[DB] Initializing database connection to Upstash Redis...");
  try {
    const exists = await redis.exists("academy_formateurs");
    if (exists === 0) {
      console.log("[DB] Database is empty. Seeding Upstash Redis with default initial data...");
      await redis.set("academy_formateurs", DEFAULT_FORMATEURS);
      await redis.set("academy_disciplines", DEFAULT_DISCIPLINES);
      await redis.set("academy_conges", DEFAULT_CONGES);
      console.log("[DB] Seeding completed successfully.");
    } else {
      console.log("[DB] Connection successful. Existing data found in Upstash.");
    }
  } catch (err: any) {
    console.error("[DB] Initialization error during Upstash seeding:", err.message);
    throw err;
  }
}

// --- Getter and Setter Functions ---
export async function getFormateurs(): Promise<Formateur[]> {
  await ensureDbInitialized();
  const res = await redis.get<Formateur[]>("academy_formateurs");
  return res || DEFAULT_FORMATEURS;
}

export async function saveFormateurs(formateurs: Formateur[]): Promise<void> {
  await ensureDbInitialized();
  await redis.set("academy_formateurs", formateurs);
}

export async function getDisciplines(): Promise<Discipline[]> {
  await ensureDbInitialized();
  const res = await redis.get<Discipline[]>("academy_disciplines");
  return res || DEFAULT_DISCIPLINES;
}

export async function saveDisciplines(disciplines: Discipline[]): Promise<void> {
  await ensureDbInitialized();
  await redis.set("academy_disciplines", disciplines);
}

export async function getConges(): Promise<Conge[]> {
  await ensureDbInitialized();
  const res = await redis.get<Conge[]>("academy_conges");
  return res || DEFAULT_CONGES;
}

export async function saveConges(conges: Conge[]): Promise<void> {
  await ensureDbInitialized();
  await redis.set("academy_conges", conges);
}
