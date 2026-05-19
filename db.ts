import type { Formateur, Discipline, Conge } from "./src/types.ts";
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

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error("[DB] Error: Upstash / Vercel KV environment variables (KV_REST_API_URL, KV_REST_API_TOKEN) are missing!");
}

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

// --- Upstash REST API Client ---
async function kvFetch(command: any[]) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("Base de données Upstash non configurée. Vérifiez les variables d'environnement.");
  }
  
  // Ensure the URL starts with https:// (Upstash REST API requires HTTPS)
  let url = KV_URL.trim();
  if (url.startsWith("redis://") || url.startsWith("rediss://")) {
    throw new Error(`Format d'URL invalide pour REST API Upstash (${url}). Utilisez l'URL HTTPS REST.`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN.trim()}`,
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
    throw new Error(`Upstash API Error: ${data.error}`);
  }
  return data.result;
}

// --- Seed Database if Needed ---
export async function initDb() {
  console.log("[DB] Initializing database connection to Upstash Redis...");
  try {
    const exists = await kvFetch(["EXISTS", "academy_formateurs"]);
    if (exists === 0) {
      console.log("[DB] Database is empty. Seeding Upstash Redis with default initial data...");
      await kvFetch(["SET", "academy_formateurs", JSON.stringify(DEFAULT_FORMATEURS)]);
      await kvFetch(["SET", "academy_disciplines", JSON.stringify(DEFAULT_DISCIPLINES)]);
      await kvFetch(["SET", "academy_conges", JSON.stringify(DEFAULT_CONGES)]);
      console.log("[DB] Seeding completed successfully.");
    } else {
      console.log("[DB] Connection successful. Existing data found in Upstash.");
    }
  } catch (err: any) {
    console.error("[DB] Initialization error during Upstash seeding:", err.message);
  }
}

// --- Getter and Setter Functions ---
export async function getFormateurs(): Promise<Formateur[]> {
  const res = await kvFetch(["GET", "academy_formateurs"]);
  return res ? JSON.parse(res) : DEFAULT_FORMATEURS;
}

export async function saveFormateurs(formateurs: Formateur[]): Promise<void> {
  await kvFetch(["SET", "academy_formateurs", JSON.stringify(formateurs)]);
}

export async function getDisciplines(): Promise<Discipline[]> {
  const res = await kvFetch(["GET", "academy_disciplines"]);
  return res ? JSON.parse(res) : DEFAULT_DISCIPLINES;
}

export async function saveDisciplines(disciplines: Discipline[]): Promise<void> {
  await kvFetch(["SET", "academy_disciplines", JSON.stringify(disciplines)]);
}

export async function getConges(): Promise<Conge[]> {
  const res = await kvFetch(["GET", "academy_conges"]);
  return res ? JSON.parse(res) : DEFAULT_CONGES;
}

export async function saveConges(conges: Conge[]): Promise<void> {
  await kvFetch(["SET", "academy_conges", JSON.stringify(conges)]);
}
