export interface HistoricalRecord {
  id: number;
  name: string;
  description: string;
  extracted_text?: string | null;
  translated_text?: string | null;
  created_at: string;
  updated_at: string;
}
