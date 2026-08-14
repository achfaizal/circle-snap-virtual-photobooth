/**
 * Variabel template — Langkah 6 rencana Tahap 2, tab 4. Tabel
 * `template_variables` (dok 03 §3.4). Definisikan field yang boleh diisi
 * klien di Visual Builder (Tahap 3) — builder membaca tabel ini, TIDAK
 * ADA form yang di-hardcode (dok 06 §2.3).
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { templateVariables } from "../schema";

export type InputType = "text" | "textarea" | "date" | "time" | "datetime" | "image" | "select" | "toggle";
export type UsedIn = "welcome" | "frame" | "video_card" | "share";

export interface TemplateVariableInput {
  key: string;
  label: string;
  helpText?: string | null;
  inputType: InputType;
  options?: unknown;
  sampleValue?: string | null;
  defaultValue?: string | null;
  isRequired: boolean;
  maxLength?: number | null;
  usedIn: UsedIn[];
  sortOrder: number;
}

export async function listTemplateVariables(templateId: string) {
  return db
    .select()
    .from(templateVariables)
    .where(eq(templateVariables.templateId, templateId))
    .orderBy(asc(templateVariables.sortOrder));
}

export async function createTemplateVariable(templateId: string, input: TemplateVariableInput) {
  const [row] = await db
    .insert(templateVariables)
    .values({ templateId, ...input })
    .returning();
  return row;
}

export async function updateTemplateVariable(id: string, patch: Partial<TemplateVariableInput>) {
  const [row] = await db.update(templateVariables).set(patch).where(eq(templateVariables.id, id)).returning();
  return row ?? null;
}

export async function deleteTemplateVariable(id: string) {
  await db.delete(templateVariables).where(eq(templateVariables.id, id));
}
