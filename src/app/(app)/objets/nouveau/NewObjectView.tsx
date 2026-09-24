"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ObjectForm } from "@/components/ObjectForm";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { can } from "@/lib/permissions";
import { createObject } from "@/lib/store";

export function NewObjectView() {
  const { declarations } = useData();
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const fromId = useSearchParams().get("from");
  const from = declarations.find((d) => d.id === fromId && d.kind === "trouve");

  if (!can(user, "write")) {
    return (
      <Panel>
        <EmptyState title="Accès en lecture seule" text="Votre rôle ne permet pas d'enregistrer un objet." action={<Link href="/objets" className="font-semibold text-blue hover:underline">Retour aux objets</Link>} />
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        title="Enregistrer un objet"
        description={from ? `À partir de la déclaration ${from.ref}, faite par ${from.prenom} ${from.nom}.` : "Un objet vient d'être déposé à la vie scolaire."}
      />
      <Panel className="p-8">
        <ObjectForm
          initial={from ? { name: from.objectName, category: from.category, description: from.description, foundAt: from.location, fromDeclarationId: from.id } : undefined}
          submitLabel="Enregistrer l'objet"
          onCancel={() => router.push(from ? "/declarations" : "/objets")}
          onSubmit={async (input) => {
            const result = await createObject(input);
            if (!result.ok) return result.error;
            toast("Objet enregistré");
            router.push(`/objets/${result.id}`);
            return null;
          }}
        />
      </Panel>
    </>
  );
}
