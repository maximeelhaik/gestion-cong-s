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
  // SEO
  { id: "adeline", nom: "Adeline", disciplines: ["seo"] },
  { id: "julie", nom: "Julie", disciplines: ["seo", "freelance"] },
  { id: "loic", nom: "Loic", disciplines: ["seo"] },
  { id: "sebastien", nom: "Sébastien", disciplines: ["seo"] },
  { id: "pauline", nom: "Pauline", disciplines: ["seo"] },
  { id: "chloe", nom: "Chloé", disciplines: ["seo"] },
  // WordPress
  { id: "line", nom: "Line", disciplines: ["wordpress"] },
  { id: "alessio", nom: "Alessio", disciplines: ["wordpress"] },
  { id: "baptiste", nom: "Baptiste", disciplines: ["wordpress"] },
  { id: "aline", nom: "Aline", disciplines: ["wordpress"] },
  { id: "marie", nom: "Marie", disciplines: ["wordpress"] },
  { id: "marius", nom: "Marius", disciplines: ["wordpress"] },
  // Graphisme
  { id: "oceane", nom: "Océane", disciplines: ["graphisme"] },
  { id: "nicolas", nom: "Nicolas", disciplines: ["graphisme"] },
  { id: "estelle", nom: "Estelle", disciplines: ["graphisme"] },
  { id: "morvan", nom: "Morvan", disciplines: ["graphisme"] },
  { id: "noemie", nom: "Noémie", disciplines: ["graphisme"] },
  { id: "pauline-g", nom: "Pauline G.", disciplines: ["graphisme"] },
  { id: "edouard-v", nom: "Edouard V.", disciplines: ["graphisme"] },
  { id: "estelle-g", nom: "Estelle G.", disciplines: ["graphisme"] },
  { id: "raphaelle", nom: "Raphaëlle", disciplines: ["graphisme"] },
  { id: "amelia", nom: "Amélia", disciplines: ["graphisme"] },
  { id: "candice", nom: "Candice", disciplines: ["graphisme"] },
  // Montage Vidéo
  { id: "rudy", nom: "Rudy", disciplines: ["montage-video"] },
  { id: "patrice", nom: "Patrice", disciplines: ["montage-video"] },
  { id: "emmanuelle", nom: "Emmanuelle", disciplines: ["montage-video"] },
  // Canva
  { id: "cassandra", nom: "Cassandra", disciplines: ["canva"] },
  { id: "laura", nom: "Laura", disciplines: ["canva"] },
  // Copywriting
  { id: "marion", nom: "Marion", disciplines: ["copywriting"] },
  { id: "carole", nom: "Carole", disciplines: ["copywriting"] },
  { id: "paul", nom: "Paul", disciplines: ["copywriting"] },
  // Webmarketing
  { id: "anne", nom: "Anne", disciplines: ["webmarketing", "community-management"] },
  { id: "benjamin", nom: "Benjamin", disciplines: ["webmarketing"] },
  { id: "marie-caroline", nom: "Marie-Caroline", disciplines: ["webmarketing"] },
  // Community Management
  { id: "lisa", nom: "Lisa", disciplines: ["community-management"] },
  { id: "coleen", nom: "Coleen", disciplines: ["community-management"] },
  { id: "meryl", nom: "Meryl", disciplines: ["community-management"] },
  { id: "priscilla", nom: "Priscilla", disciplines: ["community-management"] },
  { id: "laura-j", nom: "Laura J.", disciplines: ["community-management"] },
  { id: "laura-p", nom: "Laura P.", disciplines: ["community-management"] },
  { id: "lola", nom: "Lola", disciplines: ["community-management"] },
  // Freelance
  { id: "pierre-henry", nom: "Pierre-Henry", disciplines: ["freelance"] },
  { id: "nadine", nom: "Nadine", disciplines: ["freelance"] },
  { id: "manal", nom: "Manal", disciplines: ["freelance"] },
  { id: "alix", nom: "Alix", disciplines: ["freelance"] },
  { id: "stephanie", nom: "Stéphanie", disciplines: ["freelance"] },
  { id: "ia-gen", nom: "IA GEN", disciplines: ["freelance"] },
  { id: "maxime", nom: "Maxime", disciplines: ["freelance"] },
  { id: "vincent", nom: "Vincent", disciplines: ["freelance"] }
];

const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: "seo", nom: "SEO", colorHex: "#3b82f6" },
  { id: "wordpress", nom: "WordPress", colorHex: "#0284c7" },
  { id: "graphisme", nom: "Graphisme", colorHex: "#ec4899" },
  { id: "montage-video", nom: "Montage Vidéo", colorHex: "#ef4444" },
  { id: "canva", nom: "Canva", colorHex: "#06b6d4" },
  { id: "copywriting", nom: "Copywriting", colorHex: "#f59e0b" },
  { id: "webmarketing", nom: "Webmarketing", colorHex: "#10b981" },
  { id: "community-management", nom: "Community Management", colorHex: "#8b5cf6" },
  { id: "freelance", nom: "Freelance", colorHex: "#6b7280" }
];

const DEFAULT_CONGES: Conge[] = [
  {
    id: "c1",
    formateurId: "julie",
    disciplineId: "seo",
    dateDebut: "2026-05-25",
    dateFin: "2026-05-29",
    commentaire: "Congé de Julie (SEO/Freelance)",
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
