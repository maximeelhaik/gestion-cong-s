export interface Formateur {
  id: string;
  nom: string;
  disciplines: string[]; // Array of discipline IDs
}

export interface Discipline {
  id: string;
  nom: string;
  colorHex?: string;
}

export interface Conge {
  id: string;
  formateurId: string;
  disciplineId: string;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string; // YYYY-MM-DD
  commentaire: string;
  aConflit: boolean;
}

export interface DateRange {
  start: string;
  end: string;
}
