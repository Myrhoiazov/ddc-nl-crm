export interface ProcedureDTO {
  id: number;
  name: string | null;
  description: string | null;
  image: string | null;
  preparations: string | null;
  injectionZones: string[];
  rehabilitations: string[];
  contraindications: string[];
  results: string[];
  price: [string, string][];
  createdAt: string;
  updatedAt: string;
}