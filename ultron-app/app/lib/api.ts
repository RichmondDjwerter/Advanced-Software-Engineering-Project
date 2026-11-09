/**
 * API URLs for the application. These constants are used to define the base URLs for the backend API and the Ultron frontend application.
 */
export const API_URL = "http://localhost:8000";
export const ULTRON_URL = "http://localhost:3000";

/**
 * Saves changed fields of a historical record (name, extracted_text, translated_text).
 * Throws if the backend rejects the update.
 */
export async function updateHistoricalRecord(
  id: string,
  fields: {
    name?: string;
    extracted_text?: string;
    translated_text?: string;
  },
) {
  const response = await fetch(
    `/api/historicalRecords?id=${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update historical record.");
  }
}

/**
 * Translates the given text into English and stores the result as the
 * translated text of the record. Throws if the translation fails.
 */
export async function translateHistoricalRecord(id: string, text: string) {
  const response = await fetch(
    `${API_URL}/historical_records/${encodeURIComponent(id)}/translate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to translate historical record.");
  }
}
