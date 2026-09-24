import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { DeclarationKind, DeclarationStatus, ObjectStatus } from "@/lib/types";

export function ObjectStatusBadge({ status }: { status: ObjectStatus }) {
  if (status === "restitue") return <Badge tone="ok">Rendu</Badge>;
  if (status === "a_donner") return <Badge tone="warn">À donner</Badge>;
  return <Badge tone="blue">En stock</Badge>;
}

export function KindBadge({ kind }: { kind: DeclarationKind }) {
  return kind === "perdu" ? (
    <Badge tone="blue">
      <Icon name="search" size={14} />
      Perdu
    </Badge>
  ) : (
    <Badge tone="purple">
      <Icon name="volunteer_activism" size={14} />
      Trouvé
    </Badge>
  );
}

export function DeclarationStatusBadge({ status }: { status: DeclarationStatus }) {
  if (status === "cloturee") return <Badge>Clôturée</Badge>;
  if (status === "correspondance") return <Badge tone="warn">Correspondance</Badge>;
  return <Badge tone="ink">Ouverte</Badge>;
}
