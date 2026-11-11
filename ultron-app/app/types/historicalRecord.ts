export interface OCRLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HistoricalRecord {
  id: string;
  name: string;
  description: string;
  extracted_text?: string | null;
  translated_text?: string | null;
  lines?: OCRLine[];
  image_width?: number | null;
  image_height?: number | null;
  created_at: string;
  updated_at: string;
}
