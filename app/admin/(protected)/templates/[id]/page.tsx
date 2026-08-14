import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { getTemplate, getTemplateCategories } from "@/lib/db/queries/templates";
import { listCategories } from "@/lib/db/queries/categories";
import { listTemplateVariables } from "@/lib/db/queries/templateVariables";
import { listAvailableSystemFrames, listTemplateFrames } from "@/lib/db/queries/templateFrames";
import TemplateEditor from "@/components/admin/t2/TemplateEditor";

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  const [categories, templateCategories, variables, attachedFrames, availableFrames] = await Promise.all([
    listCategories(),
    getTemplateCategories(id),
    listTemplateVariables(id),
    listTemplateFrames(id),
    listAvailableSystemFrames(),
  ]);

  return (
    <TemplateEditor
      template={template}
      allCategories={categories.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
      selectedCategoryIds={templateCategories.map((tc) => tc.categoryId)}
      primaryCategoryId={templateCategories.find((tc) => tc.isPrimary)?.categoryId ?? null}
      initialVariables={variables}
      initialAttachedFrames={attachedFrames}
      availableFrames={availableFrames.map((f) => ({ id: f.id, name: f.name, slotCount: f.slotCount }))}
    />
  );
}
