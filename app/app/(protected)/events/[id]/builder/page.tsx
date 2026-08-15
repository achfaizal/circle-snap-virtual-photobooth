import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getEventForAccount, listEventVariableValues } from "@/lib/db/queries/events";
import { listTemplateVariables } from "@/lib/db/queries/templateVariables";
import { getTemplate } from "@/lib/db/queries/templates";
import VisualBuilder from "@/components/app/VisualBuilder";
import type { SessionConfig } from "@/lib/services/defaultSessionConfig";

/**
 * `/app/events/[id]/builder` — Langkah 7 Tahap 3 (D-12). Form dibangun
 * dari `template_variables` MILIK TEMPLATE acara ini — tidak ada field
 * hardcode (dok 06 §2.3). Beda dari components/admin/VisualBuilder.tsx
 * lama (6 layar tetap, field hardcode per komponen) — TIDAK disentuh,
 * dipensiunkan Langkah 11.
 */
export default async function EventBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { id } = await params;
  const event = await getEventForAccount(id, session.accountId);
  if (!event) redirect("/app");
  if (!event.templateId) redirect(`/app/events/${id}/template`);

  const template = await getTemplate(event.templateId);
  if (!template) redirect(`/app/events/${id}/template`);

  const [definitions, existingValues] = await Promise.all([
    listTemplateVariables(event.templateId),
    listEventVariableValues(event.id),
  ]);
  const valueMap = Object.fromEntries(existingValues.map((v) => [v.variableKey, v.valueText ?? ""]));

  return (
    <VisualBuilder
      eventId={event.id}
      templateName={template.name}
      brandLabel={template.brandLabel}
      variables={definitions.map((d) => ({
        key: d.key,
        label: d.label,
        helpText: d.helpText,
        inputType: d.inputType,
        isRequired: d.isRequired,
        usedIn: d.usedIn,
      }))}
      initialValues={valueMap}
      initialIdentity={{
        displayNames: event.displayNames ?? "",
        dateDisplay: event.dateDisplay ?? "",
        hashtag: event.hashtag ?? "",
        greeting: event.greeting ?? "",
        guestNameRequired: event.guestNameRequired,
      }}
      initialSessionConfig={event.sessionConfig as SessionConfig}
    />
  );
}
